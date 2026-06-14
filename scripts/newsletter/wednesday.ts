/**
 * Wednesday cadence — topic deep-dive pipeline.
 * See planning/prds/PRD-newsletter-redesign.md §4.2 for the spec.
 */

import { getSpotlight } from '../blog-spotlight';
import { pickCloser, type CloserChoice } from './closers';
import { embedImagesInDraft, pickImagesForContent, type ImagePlacement } from './content-match';
import { selectImages, type ImageAuditEntry, type ImageEntry } from './images';
import { findAngleForTopic, fetchHeadlines, type NewsAngle } from './news';
import {
  callAnthropic,
  checkOpenerCollision,
  DEFAULT_MODEL,
  extractKeyPhrases,
  judgeSimilarity,
  type SimilarityVerdict,
} from './repetition';
import {
  computeOpenerHash,
  getKeyPhraseDenyList,
  getOpenerHashes,
  getRecentByCadence,
  getRecentImages,
  getTopicWeeksSinceLastUsed,
  loadHistory,
} from './state';
import { selectTopic, type Topic } from './topics';
import { buildVoiceCorrectionInstruction, sweepVoice, VOICE_SYSTEM_PROMPT } from './voice';

const SIMILARITY_THRESHOLD = 0.85;
const MAX_RETRIES = 2;
const TARGET_WORDS_MIN = 600;
const TARGET_WORDS_MAX = 900;

export interface WednesdayResult {
  topic: Topic;
  newsAngle: NewsAngle | null;
  spotlight: string | null;
  draft: string;
  similarity: SimilarityVerdict;
  keyPhrases: string[];
  openerHash: string;
  images: ImageEntry[];
  imageAudit: ImageAuditEntry[];
  retries: number;
  wordCount: number;
  closer: CloserChoice;
}

export async function runWednesday(): Promise<WednesdayResult> {
  const history = loadHistory();
  const topicWeeks = getTopicWeeksSinceLastUsed(history);
  const topicResult = selectTopic(topicWeeks);
  const topic = topicResult.topic;
  console.log(`[wednesday] ${topicResult.rationale}`);

  let newsAngle: NewsAngle | null = null;
  try {
    const headlines = await fetchHeadlines();
    newsAngle = await findAngleForTopic(topic, headlines);
    if (newsAngle) console.log(`[wednesday] news angle: ${newsAngle.angle.slice(0, 120)}`);
    else console.log('[wednesday] no fitting news angle — leaning evergreen');
  } catch (err) {
    console.warn(`[wednesday] news lookup failed: ${(err as Error).message} — leaning evergreen`);
  }

  const spotlight = getSpotlight();
  const closer = pickCloser();
  console.log(`[wednesday] closer: ${closer.id}`);
  const denyPhrases = getKeyPhraseDenyList(history, 'wednesday_topic');
  const recentOpenerHashes = getOpenerHashes(history, 'wednesday_topic');
  const recentImageIds = new Set(getRecentImages(history));
  const priorPosts = getRecentByCadence(history, 'wednesday_topic');

  // Build a candidate pool larger than the final 3 picks; the
  // content-aware judge selects the best fits after the draft is final.
  // Pull from the topic plus its neighbors so the judge has range.
  const candidatePool: ImageEntry[] = [];
  const poolIds = new Set<string>(recentImageIds);
  const topicPicks = selectImages({
    topic: topic.slug,
    count: 6,
    excludeIds: poolIds,
    allowPartial: true,
  });
  for (const p of topicPicks) {
    poolIds.add(p.id);
    candidatePool.push(p);
  }
  if (candidatePool.length < 6) {
    const broad = selectImages({
      topic: 'tech_and_models',
      count: 4,
      excludeIds: poolIds,
      allowPartial: true,
    });
    for (const p of broad) {
      poolIds.add(p.id);
      candidatePool.push(p);
    }
  }
  console.log(`[wednesday] candidate pool: ${candidatePool.length} images`);

  let draft = await generate({
    topic,
    newsAngle,
    spotlight,
    denyPhrases,
    correction: null,
    closer,
  });

  let retries = 0;
  let openerHash = computeOpenerHash(draft);
  let voiceViolations = sweepVoice(draft);

  while (retries < MAX_RETRIES) {
    const collides = checkOpenerCollision(openerHash, recentOpenerHashes);
    const tooShort = wordCount(draft) < 400;
    if (!collides && voiceViolations.length === 0 && !tooShort) break;

    const corrections: string[] = [];
    if (collides) corrections.push(`Your opening paragraph collides with a prior post (hash ${openerHash}). Rewrite the opener with a distinct framing and concrete specifics.`);
    if (voiceViolations.length > 0) corrections.push(buildVoiceCorrectionInstruction(voiceViolations));
    if (tooShort) corrections.push(`Draft was ${wordCount(draft)} words — expand to ${TARGET_WORDS_MIN}-${TARGET_WORDS_MAX} with more specific detail.`);

    retries += 1;
    console.log(`[wednesday] retry ${retries} — ${corrections.length} correction(s)`);
    draft = await generate({
      topic,
      newsAngle,
      spotlight,
      denyPhrases,
      correction: corrections.join('\n\n'),
      closer,
    });
    openerHash = computeOpenerHash(draft);
    voiceViolations = sweepVoice(draft);
  }

  let similarity: SimilarityVerdict = { max: 0, worstMatch: null, triggerPhrases: [] };
  try {
    similarity = await judgeSimilarity(draft, priorPosts);
  } catch (err) {
    console.warn(`[wednesday] judge failed: ${(err as Error).message}; persisting without judge score`);
  }

  if (similarity.max > SIMILARITY_THRESHOLD && retries < MAX_RETRIES) {
    retries += 1;
    console.log(`[wednesday] retry ${retries} — judge similarity ${similarity.max.toFixed(2)} > ${SIMILARITY_THRESHOLD}`);
    const correction = `Your last draft scored ${similarity.max.toFixed(2)} similarity against a prior post (${similarity.worstMatch?.slug}). The judge flagged: "${similarity.worstMatch?.reason}". Avoid these specific phrasings: ${similarity.triggerPhrases.join('; ')}. Rewrite with a distinct angle and voice.`;
    draft = await generate({
      topic,
      newsAngle,
      spotlight,
      denyPhrases: [...denyPhrases, ...similarity.triggerPhrases],
      correction,
      closer,
    });
    openerHash = computeOpenerHash(draft);
    try {
      similarity = await judgeSimilarity(draft, priorPosts);
    } catch {
      // keep prior similarity
    }
  }

  // Content-aware image picks: judge ranks the candidate pool against
  // the actual prose, then we splice the picks in. Falls back to the
  // first three pool entries if the judge call fails or returns nothing.
  const placements = await pickImagesForContent({ draft, pool: candidatePool, count: 3 });
  let images: ImageEntry[];
  let finalPlacements: ImagePlacement[];
  let finalDraft: string;
  if (placements.length > 0) {
    finalPlacements = placements;
    finalDraft = embedImagesInDraft(draft, finalPlacements);
    images = finalPlacements.map((p) => p.image);
    console.log(`[wednesday] content-match picked: ${images.map((i) => i.id).join(', ')}`);
  } else {
    console.warn('[wednesday] content-match returned no picks — falling back to first-from-pool');
    images = candidatePool.slice(0, 3);
    // Wednesday posts have variable section headings — embed function
    // appends to nearest section if anchors don't match; supply the
    // generic fallback anchors regardless.
    finalPlacements = images.map((image, i) => ({
      image,
      insertAfter: i === 0 ? '## ' : i === 1 ? '##' : '##',
    }));
    finalDraft = embedImagesInDraft(draft, finalPlacements);
  }

  const keyPhrases = await extractKeyPhrases(finalDraft).catch(() => [] as string[]);
  const imageAudit = buildWednesdayImageAudit(finalPlacements, topic.slug);

  return {
    topic,
    newsAngle,
    spotlight,
    draft: finalDraft,
    similarity,
    keyPhrases,
    openerHash,
    images,
    imageAudit,
    retries,
    wordCount: wordCount(finalDraft),
    closer,
  };
}

function buildWednesdayImageAudit(placements: ImagePlacement[], lane: string): ImageAuditEntry[] {
  return placements.map(({ image, insertAfter }) => ({
    id: image.id,
    caption: image.caption,
    topic_tags: image.topic_tags,
    anchor: insertAfter,
    lane,
  }));
}

interface GenerateOpts {
  topic: Topic;
  newsAngle: NewsAngle | null;
  spotlight: string | null;
  denyPhrases: string[];
  correction: string | null;
  closer: CloserChoice;
}

async function generate(opts: GenerateOpts): Promise<string> {
  const { topic, newsAngle, spotlight, denyPhrases, correction, closer } = opts;

  const systemBlocks = [
    { type: 'text' as const, text: VOICE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: `TOPIC FOR THIS POST\n\nTitle: ${topic.title}\nScope: ${topic.description}\nKeywords: ${topic.keywords.join(', ')}` },
  ];

  const sections: string[] = [];
  sections.push(`Write a 600-900 word deep-dive post on this topic. The reader should leave knowing something they did not know that morning.`);

  if (newsAngle) {
    sections.push(`CURRENT ANGLE: ${newsAngle.angle}`);
    if (newsAngle.sources.length > 0) {
      sections.push(`Headlines that informed the angle (do not link directly, just inform):\n${newsAngle.sources.map((s) => `- ${s}`).join('\n')}`);
    }
  } else {
    sections.push(`No fresh news hook identified — write evergreen-educational, with a one-sentence acknowledgment that nothing major moved on this front this week if it's natural to do so.`);
  }

  if (spotlight) {
    sections.push(`EDITORIAL SPOTLIGHT: ${spotlight}`);
  }

  if (denyPhrases.length > 0) {
    sections.push(`DO NOT use these specific phrases or near-paraphrases (recent posts have already used them):\n${denyPhrases.slice(0, 30).map((p) => `- ${p}`).join('\n')}`);
  }

  // Images are NOT embedded by the model. A separate content-aware
  // judge (see content-match.ts) splices them in after this draft is
  // final, so we don't pre-commit to subtopics the prose ends up
  // de-emphasizing.

  sections.push(`STRUCTURE:
- Open with a concrete specific hook — a number, a place, a date, a measurement.
- 2 or 3 ## section headers within the body. Use them to give the piece shape. Do NOT include any images or image markdown.
- ${closer.instruction}
- Word count target: 600-900.`);

  if (correction) {
    sections.push(`CORRECTIONS FROM PRIOR ATTEMPT:\n${correction}`);
  }

  sections.push(`Return only the markdown body of the post — no frontmatter, no fences, no commentary. Do not include a # H1 title; the publish step adds that from frontmatter.`);

  return callAnthropic({
    model: DEFAULT_MODEL,
    systemBlocks,
    messages: [{ role: 'user', content: sections.join('\n\n') }],
    maxTokens: 3000,
    temperature: 0.7,
  });
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
