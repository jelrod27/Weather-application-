/**
 * Sunday cadence — Rearview + Roadmap pipeline.
 * See planning/prds/PRD-newsletter-redesign.md §4.3 for the spec.
 *
 * Hard rule: if Iowa Mesonet returns nothing for the past week, we fail
 * the run rather than fabricate Rearview content.
 */

import { getSpotlight } from '../blog-spotlight';
import {
  embedImagesInDraft,
  pickImagesForContent,
  type ImagePlacement,
} from './content-match';
import { imageGateFor, type DraftImageGate } from './image-selection';
import { fetchPastWeekQuakes } from './data/earthquakes';
import { fetchForecastOutlook } from './data/forecast';
import { fetchPastWeekWarnings, MesonetEmptyError } from './data/mesonet';
import { fetchSpaceWeatherSummary } from './data/space-weather';
import { fetchPastWeekReports } from './data/spc-reports';
import { pickCloser, type CloserChoice } from './closers';
import { IMAGES, getActiveTopics, selectImages, type ImageAuditEntry, type ImageEntry } from './images';
import type { TopicSlug } from './topics';
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
  loadHistory,
} from './state';
import { buildVoiceCorrectionInstruction, sweepVoice, VOICE_SYSTEM_PROMPT } from './voice';
import { sanitizeForPrompt } from './util/sanitize';

const SIMILARITY_THRESHOLD = 0.85;
const MAX_RETRIES = 2;

export interface SundayResult {
  spotlight: string | null;
  draft: string;
  similarity: SimilarityVerdict;
  keyPhrases: string[];
  openerHash: string;
  images: ImageEntry[];
  imageAudit: ImageAuditEntry[];
  heroImage: string;
  retries: number;
  wordCount: number;
  closer: CloserChoice;
}

export async function runSunday(): Promise<SundayResult> {
  const history = loadHistory();
  const recentOpenerHashes = getOpenerHashes(history, 'sunday_rearview');
  const denyPhrases = getKeyPhraseDenyList(history, 'sunday_rearview');
  const recentImageIds = new Set(getRecentImages(history));
  const priorPosts = getRecentByCadence(history, 'sunday_rearview');

  console.log('[sunday] fetching past-week data');
  // Iowa Mesonet is the load-bearing source for Rearview. Fetch first
  // and fail loudly if empty — do not paper over with fabricated content.
  const warnings = await fetchPastWeekWarnings();
  console.log(`[sunday] mesonet: ${warnings.totalWarnings} warnings, ${warnings.notable.length} notable`);

  const [spcSummary, spaceSummary, quakeSummary, forecast] = await Promise.all([
    fetchPastWeekReports().catch((err) => {
      console.warn(`[sunday] SPC reports failed: ${(err as Error).message}`);
      return { total: 0, byCategory: { tornado: 0, hail: 0, wind: 0 }, byState: {}, reports: [], daysCovered: 7 };
    }),
    fetchSpaceWeatherSummary().catch((err) => {
      console.warn(`[sunday] SWPC failed: ${(err as Error).message}`);
      return { recentKp: [], maxKpPastWeek: 0, recentXrayClass: null, notableFlares: [] };
    }),
    fetchPastWeekQuakes().catch((err) => {
      console.warn(`[sunday] USGS failed: ${(err as Error).message}`);
      return { significantCount: 0, m45PlusCount: 0, largest: null, significant: [] };
    }),
    fetchForecastOutlook().catch((err) => {
      console.warn(`[sunday] forecast outlook failed: ${(err as Error).message}`);
      return { conusQuadrants: [], international: [], fetchedAt: new Date().toISOString() };
    }),
  ]);
  console.log(`[sunday] SPC: ${spcSummary.total} reports, max Kp: ${spaceSummary.maxKpPastWeek}, quakes: ${quakeSummary.significantCount} significant`);

  // Active topics remain useful for audit/debugging, but Sunday image slots
  // are selected deterministically by story lane below. This prevents a broad
  // candidate pool from letting weak side topics outrank the lead story.
  const activeTopics = getActiveTopics({
    severeReportCount: spcSummary.total,
    maxKpPastWeek: spaceSummary.maxKpPastWeek,
    notableFlareCount: spaceSummary.notableFlares.length,
    significantQuakeCount: quakeSummary.significantCount,
  });
  console.log(
    `[sunday] active image topics: ${[...activeTopics].join(',')}`,
  );

  const spotlight = getSpotlight();
  const closer = pickCloser();
  console.log(`[sunday] closer: ${closer.id}`);

  // Generate the draft WITHOUT images embedded. Image selection happens
  // after the prose is final so we can match images to actual emphasis,
  // not pre-guessed topics.
  let draft = await generate({
    warnings,
    spcSummary,
    spaceSummary,
    quakeSummary,
    forecast,
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
    const tooShort = wordCount(draft) < 500;
    const missingHeaders = !/##\s*Rearview/i.test(draft) || !/##\s*Roadmap/i.test(draft);
    if (!collides && voiceViolations.length === 0 && !tooShort && !missingHeaders) break;

    const corrections: string[] = [];
    if (collides) corrections.push(`Your opening collides with a prior Sunday post. Rewrite with a distinct framing and concrete specifics from this week's data.`);
    if (voiceViolations.length > 0) corrections.push(buildVoiceCorrectionInstruction(voiceViolations));
    if (tooShort) corrections.push(`Draft was ${wordCount(draft)} words. Both Rearview (~250-350 words) and Roadmap (~350-500 words) need to be present and substantive.`);
    if (missingHeaders) corrections.push(`Use the exact section headers "## Rearview" and "## Roadmap" — not paraphrased versions.`);

    retries += 1;
    console.log(`[sunday] retry ${retries} — ${corrections.length} correction(s)`);
    draft = await generate({
      warnings,
      spcSummary,
      spaceSummary,
      quakeSummary,
      forecast,
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
    console.warn(`[sunday] judge failed: ${(err as Error).message}`);
  }

  if (similarity.max > SIMILARITY_THRESHOLD && retries < MAX_RETRIES) {
    retries += 1;
    console.log(`[sunday] retry ${retries} — similarity ${similarity.max.toFixed(2)} > ${SIMILARITY_THRESHOLD}`);
    const correction = `Your last draft scored ${similarity.max.toFixed(2)} similarity against a prior Sunday post (${similarity.worstMatch?.slug}). Avoid these phrasings: ${similarity.triggerPhrases.join('; ')}.`;
    draft = await generate({
      warnings,
      spcSummary,
      spaceSummary,
      quakeSummary,
      forecast,
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

  const imagePlan = await buildSundayImagePlan({
    draft,
    recentImageIds,
    spcSummary,
    spaceSummary,
    quakeSummary,
  });
  const finalDraft = embedImagesInDraft(draft, imagePlan.placements);
  const images = imagePlan.placements.map((p) => p.image);
  console.log(
    `[sunday] image lane=${imagePlan.primaryLane} picked: ${images.map((i) => i.id).join(', ')}`,
  );

  const keyPhrases = await extractKeyPhrases(finalDraft).catch(() => [] as string[]);

  return {
    spotlight,
    draft: finalDraft,
    similarity,
    keyPhrases,
    openerHash,
    images,
    imageAudit: imagePlan.audit,
    heroImage: imagePlan.heroImage,
    retries,
    wordCount: wordCount(finalDraft),
    closer,
  };
}

type SundayStoryLane = 'severe' | 'earthquake' | 'forecast' | 'space';

interface SundayImagePlan {
  primaryLane: SundayStoryLane;
  heroImage: string;
  placements: ImagePlacement[];
  audit: ImageAuditEntry[];
}

export interface SundayImagePlanOpts {
  draft: string;
  recentImageIds: Set<string>;
  spcSummary: Awaited<ReturnType<typeof fetchPastWeekReports>>;
  spaceSummary: Awaited<ReturnType<typeof fetchSpaceWeatherSummary>>;
  quakeSummary: Awaited<ReturnType<typeof fetchPastWeekQuakes>>;
  /** Test seam: stub the content-aware judge so the plan is exercisable offline. */
  judge?: typeof pickImagesForContent;
}

/**
 * Hybrid image selection: lane scoring (from the week's data) locks which
 * STORIES lead, so a weak side topic can never outrank the lead. Within those
 * lead lanes, the content-aware judge — the same one that powers Wednesday —
 * reads the FINAL prose and picks the image that best matches the emphasis,
 * returning a real insertion anchor. `filterPlacementsByNarrativeFit` then drops
 * any mismatch and backfills the closest narrative-fit-safe image, and a
 * deterministic lane fallback fills any slot the judge couldn't, so we always
 * place imagery and never embed something validate-post.ts would reject.
 */
export async function buildSundayImagePlan(opts: SundayImagePlanOpts): Promise<SundayImagePlan> {
  const primaryLane = choosePrimaryLane(opts);
  const heroImage = heroImageForLane(primaryLane);
  const secondaryLane = chooseSecondaryLane(opts, primaryLane);
  const judge = opts.judge ?? pickImagesForContent;
  const gate = imageGateFor(opts.draft);

  // Lead lanes only — the candidate pool is scoped to the dominant stories so the
  // judge can match the prose without a side topic sneaking in.
  const leadLanes: SundayStoryLane[] = [];
  if (primaryLane !== 'forecast') leadLanes.push(primaryLane);
  leadLanes.push('forecast');
  if (secondaryLane && !leadLanes.includes(secondaryLane)) leadLanes.push(secondaryLane);

  const targetCount = leadLanes.length;
  const pool = buildLaneCandidatePool(leadLanes, opts.recentImageIds);

  const placements: ImagePlacement[] = [];
  const usedIds = new Set<string>();
  if (pool.length > 0) {
    try {
      const raw = await judge({ draft: opts.draft, pool, count: targetCount });
      // Keep only judge picks that match the prose, preserving their real
      // (verbatim-snippet) anchors. We deliberately do not backfill from the pool
      // here: that path stamps a synthetic '##' anchor that clumps images at the
      // first heading and would let the count fill before the lane fallback below
      // can place each image next to the relevant paragraph.
      for (const p of gate.filterPlacements(raw)) {
        if (placements.length >= targetCount) break;
        if (usedIds.has(p.image.id)) continue;
        usedIds.add(p.image.id);
        placements.push(p);
      }
    } catch (err) {
      console.warn(`[sunday] content-match judge failed: ${(err as Error).message} — using lane fallback`);
    }
  }

  // Fill each lead lane the judge did NOT already cover, with a content-located
  // anchor — so a secondary story isn't starved while the lead lane gets a
  // duplicate.
  const filledLanes = new Set(placements.map((p) => laneForImage(p.image, leadLanes, primaryLane)));
  for (const lane of leadLanes) {
    if (placements.length >= targetCount) break;
    if (filledLanes.has(lane)) continue;
    const image = pickLaneImage(lane, opts.draft, opts.recentImageIds, usedIds, gate);
    if (!image) continue;
    usedIds.add(image.id);
    filledLanes.add(lane);
    placements.push({ image, insertAfter: anchorForLane(opts.draft, lane) });
  }

  // Last resort (every lead lane starved): keep the product guarantee that a post
  // always carries imagery by filling from the pool with the closest
  // narrative-fit-safe image, still anchored to its lane's section.
  if (placements.length < targetCount) {
    for (const image of gate.filter(pool)) {
      if (placements.length >= targetCount) break;
      if (usedIds.has(image.id)) continue;
      usedIds.add(image.id);
      placements.push({
        image,
        insertAfter: anchorForLane(opts.draft, laneForImage(image, leadLanes, primaryLane)),
      });
    }
  }

  const audit: ImageAuditEntry[] = placements.map((p) => ({
    id: p.image.id,
    caption: p.image.caption,
    topic_tags: p.image.topic_tags,
    anchor: p.insertAfter,
    lane: laneForImage(p.image, leadLanes, primaryLane),
  }));

  return { primaryLane, heroImage, placements, audit };
}

/**
 * Builds the judge's candidate pool from the lead lanes only: each lane's
 * curated `preferredIds` first, then its broader topic pool, excluding the
 * 8-week reuse window. If reuse exclusions starve the pool, the window is
 * relaxed so the judge always has something to rank.
 */
export function buildLaneCandidatePool(
  lanes: SundayStoryLane[],
  recentImageIds: Set<string>,
): ImageEntry[] {
  const pool: ImageEntry[] = [];
  const seen = new Set<string>();
  const push = (img: ImageEntry | undefined): void => {
    if (img && !seen.has(img.id)) {
      seen.add(img.id);
      pool.push(img);
    }
  };

  const collect = (exclude: Set<string>): void => {
    for (const lane of lanes) {
      const config = IMAGE_LANES[lane];
      for (const id of config.preferredIds) {
        const img = IMAGES.find((i) => i.id === id);
        if (img && !exclude.has(img.id)) push(img);
      }
      const topicImgs = selectImages({
        topic: config.topic,
        count: 6,
        excludeIds: new Set([...exclude, ...seen]),
        allowPartial: true,
        rng: () => 0,
      });
      for (const img of topicImgs) push(img);
    }
  };

  collect(recentImageIds);
  // Relax the reuse window only if a starved pool can't give the judge a real choice.
  if (pool.length <= lanes.length) collect(new Set());

  return pool;
}

/** Attributes a chosen image to the lead lane whose topic it best matches (for the audit). */
function laneForImage(
  image: ImageEntry,
  leadLanes: SundayStoryLane[],
  primaryLane: SundayStoryLane,
): SundayStoryLane {
  for (const lane of leadLanes) {
    if (image.topic_tags.includes(IMAGE_LANES[lane].topic)) return lane;
  }
  return primaryLane;
}

function choosePrimaryLane(opts: SundayImagePlanOpts): SundayStoryLane {
  const tornadoReports = opts.spcSummary.byCategory.tornado;
  const severeScore = tornadoReports * 20 + Math.min(opts.spcSummary.total, 1000) / 10;
  const largestMag = opts.quakeSummary.largest?.mag ?? 0;
  const quakeScore = opts.quakeSummary.significantCount * 35 + (largestMag >= 6 ? 35 : 0) + (largestMag >= 7 ? 35 : 0);
  const spaceScore = opts.spaceSummary.maxKpPastWeek >= 4
    ? opts.spaceSummary.maxKpPastWeek * 20
    : opts.spaceSummary.notableFlares.length * 30;

  if (severeScore >= quakeScore && severeScore >= spaceScore && severeScore > 0) return 'severe';
  if (quakeScore >= spaceScore && quakeScore > 0) return 'earthquake';
  if (spaceScore > 0) return 'space';
  return 'forecast';
}

function chooseSecondaryLane(opts: SundayImagePlanOpts, primaryLane: SundayStoryLane): SundayStoryLane | null {
  if (
    primaryLane !== 'earthquake' &&
    opts.quakeSummary.significantCount > 0 &&
    draftMentionsLane(opts.draft, 'earthquake')
  ) {
    return 'earthquake';
  }
  if (
    primaryLane !== 'severe' &&
    opts.spcSummary.byCategory.tornado > 0 &&
    draftMentionsLane(opts.draft, 'severe')
  ) {
    return 'severe';
  }
  if (
    primaryLane !== 'space' &&
    (opts.spaceSummary.maxKpPastWeek >= 4 || opts.spaceSummary.notableFlares.length > 0) &&
    draftMentionsLane(opts.draft, 'space')
  ) {
    return 'space';
  }
  return null;
}

export function pickLaneImage(
  lane: SundayStoryLane,
  draft: string,
  recentImageIds: Set<string>,
  usedIds: Set<string>,
  draftGate?: DraftImageGate,
): ImageEntry | null {
  const gate = draftGate ?? imageGateFor(draft);
  const config = IMAGE_LANES[lane];
  const preferred = config.preferredIds
    .map((id) => IMAGES.find((img) => img.id === id))
    .filter((img): img is ImageEntry => Boolean(img));

  // Full eligible pool for the lane's topic (primary tag first, then neighbor
  // tags), already minus `exclude`. count is unbounded so we can walk past any
  // candidate that fails the narrative-fit gate instead of stopping at the first.
  const topicPool = (exclude: Set<string>): ImageEntry[] =>
    selectImages({
      topic: config.topic,
      count: IMAGES.length,
      excludeIds: exclude,
      allowPartial: true,
      rng: () => 0,
    });

  // Every candidate crosses the gate, so a lane starved by the 8-week reuse
  // window can only fall back to imagery the validator also accepts — it can
  // never reach for off-topic neighbor art (drought, tropical, or solar under a
  // severe/seismic lead) and kill the Sunday cron at publish time.

  // Tier 1: respect the reuse window, prefer curated ids.
  const blocked = new Set([...recentImageIds, ...usedIds]);
  const tier1 = gate.firstFitting([...preferred, ...topicPool(blocked)], blocked);
  if (tier1) return tier1;

  // Tier 2: relax the reuse window, still skipping images already used in this post.
  const tier2 = gate.firstFitting([...preferred, ...topicPool(usedIds)], usedIds);
  if (tier2) return tier2;

  // No fitting image for this lane — leave the slot empty rather than embed a
  // mismatch the validator will reject.
  return null;
}

const IMAGE_LANES: Record<SundayStoryLane, { topic: TopicSlug; preferredIds: string[] }> = {
  severe: {
    topic: 'severe_storms',
    preferredIds: ['mesocyclone-diagram', 'goes16-visible-conus', 'chaparral-supercell', 'wall-cloud-lightning'],
  },
  earthquake: {
    topic: 'earthquakes',
    preferredIds: ['fault-types-usgs', 'earthquake-wave-paths', 'pacific-ring-of-fire'],
  },
  forecast: {
    topic: 'atmosphere_layers',
    preferredIds: ['goes16-water-vapor', 'opc-atlantic-surface', 'cpc-precip-outlook'],
  },
  space: {
    topic: 'space_weather',
    preferredIds: ['swpc-space-weather-overview', 'swpc-ovation-aurora', 'sdo-current-hmi-magnetogram'],
  },
};

function heroImageForLane(lane: SundayStoryLane): string {
  const type = lane === 'space' ? 'space' : lane === 'forecast' ? 'dispatch' : 'severe';
  return `/api/og/blog?title=This%20Week%20in%20Weather&type=${type}`;
}

function anchorForLane(draft: string, lane: SundayStoryLane): string {
  const heading = lane === 'forecast' ? '## Roadmap' : '## Rearview';
  const section = sectionText(draft, heading);
  const keywords = {
    severe: [/tornado/i, /supercell/i, /SPC/i, /severe/i, /hail/i, /wind report/i],
    earthquake: [/earthquake/i, /seismic/i, /aftershock/i, /subduction/i, /\bM\d(?:\.\d)?\b/i],
    forecast: [/ridge/i, /trough/i, /precip/i, /front/i, /forecast/i, /Roadmap/i],
    space: [/Kp/i, /flare/i, /aurora/i, /geomagnetic/i, /solar/i],
  }[lane];
  const paragraph = section
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => p && keywords.some((rx) => rx.test(p)));
  return paragraph ? firstWords(paragraph, 6) : heading;
}

function sectionText(draft: string, heading: string): string {
  const idx = draft.indexOf(heading);
  if (idx === -1) return draft;
  const nextHeadingIdx = draft.indexOf('\n## ', idx + heading.length);
  return draft.slice(idx, nextHeadingIdx === -1 ? undefined : nextHeadingIdx);
}

function firstWords(text: string, count: number): string {
  return text
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, count)
    .join(' ');
}

function draftMentionsLane(draft: string, lane: SundayStoryLane): boolean {
  const text = draft.toLowerCase();
  if (lane === 'earthquake') return /\bearthquake|seismic|aftershock|subduction|\bm\d(?:\.\d)?\b/i.test(text);
  if (lane === 'severe') return /tornado|supercell|severe|hail|wind report|spc/i.test(text);
  if (lane === 'space') return /geomagnetic|aurora|solar flare|\bkp\b|x-class|m-class/i.test(text);
  return /forecast|ridge|trough|front|precip/i.test(text);
}

interface GenerateOpts {
  closer: CloserChoice;
  warnings: Awaited<ReturnType<typeof fetchPastWeekWarnings>>;
  spcSummary: Awaited<ReturnType<typeof fetchPastWeekReports>>;
  spaceSummary: Awaited<ReturnType<typeof fetchSpaceWeatherSummary>>;
  quakeSummary: Awaited<ReturnType<typeof fetchPastWeekQuakes>>;
  forecast: Awaited<ReturnType<typeof fetchForecastOutlook>>;
  spotlight: string | null;
  denyPhrases: string[];
  correction: string | null;
}

async function generate(opts: GenerateOpts): Promise<string> {
  const {
    warnings,
    spcSummary,
    spaceSummary,
    quakeSummary,
    forecast,
    spotlight,
    denyPhrases,
    correction,
    closer,
  } = opts;

  const systemBlocks = [
    { type: 'text' as const, text: VOICE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } },
    {
      type: 'text' as const,
      text: `SUNDAY CADENCE — REARVIEW + ROADMAP\n\nWrite two clearly-labeled sections: ## Rearview (250-350 words on the past 7 days) and ## Roadmap (350-500 words on the week ahead).\n\nRearview cites real events from the supplied data. Roadmap describes the pattern shaping the next 7 days, with regional cuts.`,
    },
  ];

  const dataBlock = formatDataBlock({ warnings, spcSummary, spaceSummary, quakeSummary, forecast });

  const sections: string[] = [];
  sections.push(dataBlock);

  if (spotlight) {
    sections.push(`EDITORIAL SPOTLIGHT: ${spotlight}`);
  }

  if (denyPhrases.length > 0) {
    sections.push(`DO NOT use these specific phrases or near-paraphrases (recent posts have already used them):\n${denyPhrases.slice(0, 30).map((p) => `- ${p}`).join('\n')}`);
  }

  // Images are NOT embedded by the model. A separate content-aware judge
  // (see content-match.ts) picks images and splices them in after this
  // draft is final, so we don't pre-commit to topics the prose may end
  // up de-emphasizing.

  sections.push(`STRUCTURE:
- Open with a concrete specific hook from the past week's data — a named storm, a record, a count.
- ## Rearview: 3-5 specific events. Cite states, magnitudes, dates. No generalities. Do NOT include any images or image markdown.
- ## Roadmap: pattern overview, then 2-3 regional cuts (CONUS quadrants + a notable international callout). Tie to mechanism (jet stream position, ridge, trough, MJO phase, etc.) where you can. Do NOT include any images or image markdown.
- ${closer.instruction}

TIME PRECISION:
- The data block uses UTC timestamps. When you describe an event in prose, convert to the affected region's local time-of-day before choosing words like "morning", "afternoon", "evening", or "overnight". A 19:57Z warning in Pennsylvania is afternoon EDT, not evening. A 02:00Z warning in Mississippi is late evening CDT, not morning.
- Do not group temporally-distinct or geographically-distinct convective rounds into a single "later that evening" narrative unless they actually occurred together.`);

  if (correction) {
    sections.push(`CORRECTIONS FROM PRIOR ATTEMPT:\n${correction}`);
  }

  sections.push(`Return only the markdown body — no frontmatter, no fences, no commentary. Do not include a # H1 title.`);

  return callAnthropic({
    model: DEFAULT_MODEL,
    systemBlocks,
    messages: [{ role: 'user', content: sections.join('\n\n') }],
    maxTokens: 3500,
    temperature: 0.7,
  });
}

function formatDataBlock(opts: {
  warnings: Awaited<ReturnType<typeof fetchPastWeekWarnings>>;
  spcSummary: Awaited<ReturnType<typeof fetchPastWeekReports>>;
  spaceSummary: Awaited<ReturnType<typeof fetchSpaceWeatherSummary>>;
  quakeSummary: Awaited<ReturnType<typeof fetchPastWeekQuakes>>;
  forecast: Awaited<ReturnType<typeof fetchForecastOutlook>>;
}): string {
  const { warnings, spcSummary, spaceSummary, quakeSummary, forecast } = opts;
  const lines: string[] = ['PAST 7 DAYS — REAL DATA (cite specifics, do not generalize):'];

  lines.push(`\n## NWS warnings (Iowa State Mesonet)`);
  lines.push(`Total: ${warnings.totalWarnings}`);
  lines.push(`By type: ${Object.entries(warnings.byType).slice(0, 10).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  if (warnings.notable.length > 0) {
    lines.push('Notable events:');
    for (const w of warnings.notable.slice(0, 6)) {
      // Sanitize each field even though Mesonet/NWS are trusted upstreams.
      // Phase 2 C-Link5-Med: an unexpected control char or backtick in any
      // of these fields would corrupt the model's downstream JSON parsing.
      const phenomena = sanitizeForPrompt(w.phenomena);
      const significance = sanitizeForPrompt(w.significance);
      const areaDesc = sanitizeForPrompt(w.area_desc);
      const wfo = sanitizeForPrompt(w.wfo);
      lines.push(`- ${phenomena}.${significance} ${areaDesc} (${wfo}) ${w.issued}`);
    }
  }

  lines.push(`\n## SPC storm reports`);
  lines.push(`Tornado: ${spcSummary.byCategory.tornado}, Hail: ${spcSummary.byCategory.hail}, Wind: ${spcSummary.byCategory.wind}`);
  const topStates = Object.entries(spcSummary.byState).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topStates.length > 0) {
    lines.push(`Top states: ${topStates.map(([s, n]) => `${s}=${n}`).join(', ')}`);
  }

  lines.push(`\n## Space weather (NOAA SWPC)`);
  lines.push(`Max Kp past week: ${spaceSummary.maxKpPastWeek}`);
  lines.push(`Recent X-ray peak class: ${spaceSummary.recentXrayClass ?? 'quiet'}`);
  if (spaceSummary.notableFlares.length > 0) {
    lines.push('Notable flares:');
    for (const f of spaceSummary.notableFlares) {
      lines.push(`- ${f.class} at ${f.time}`);
    }
  }

  lines.push(`\n## Significant earthquakes (USGS)`);
  lines.push(`Significant count: ${quakeSummary.significantCount}, M4.5+: ${quakeSummary.m45PlusCount}`);
  if (quakeSummary.largest) {
    lines.push(`Largest: M${quakeSummary.largest.mag.toFixed(1)} ${quakeSummary.largest.place} ${quakeSummary.largest.time}`);
  }
  for (const q of quakeSummary.significant.slice(0, 4)) {
    lines.push(`- M${q.mag.toFixed(1)} ${q.place}${q.tsunami ? ' (tsunami flag)' : ''}`);
  }

  lines.push(`\nNEXT 7 DAYS — FORECAST OUTLOOK (Open-Meteo / ERA5):`);
  for (const r of forecast.conusQuadrants) {
    if (r.daily.length === 0) continue;
    const week = r.daily.slice(0, 7);
    const avgMax = week.reduce((s, d) => s + d.tMaxF, 0) / week.length;
    const totalPrecip = week.reduce((s, d) => s + d.precipIn, 0);
    const peakPrecipDay = week.reduce((p, d) => (d.precipProb > p.precipProb ? d : p), week[0]);
    lines.push(`- ${r.region}: avg high ${avgMax.toFixed(0)}°F, week precip ${totalPrecip.toFixed(2)}", peak precip prob ${peakPrecipDay.precipProb}% on ${peakPrecipDay.date}`);
  }
  for (const r of forecast.international.slice(0, 1)) {
    if (r.daily.length === 0) continue;
    const week = r.daily.slice(0, 7);
    const avgMax = week.reduce((s, d) => s + d.tMaxF, 0) / week.length;
    lines.push(`- International: ${r.region}: avg high ${avgMax.toFixed(0)}°F over the week`);
  }

  return lines.join('\n');
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export { MesonetEmptyError };
