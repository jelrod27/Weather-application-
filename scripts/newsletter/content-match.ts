/**
 * Content-aware image selection.
 *
 * Replaces the older "pick by topic-tag-matching active data signals"
 * approach, which over-included space-weather imagery whenever a flare
 * was logged even if the resulting prose mentioned the flare in a single
 * throwaway sentence.
 *
 * Flow:
 *   1. Generator produces the draft body without image markdown.
 *   2. We send the draft + a candidate pool of ~10 images to a small LLM
 *      judge that ranks them by how well each matches the actual prose
 *      emphasis and returns insertion anchors (verbatim text snippets).
 *   3. embedImagesInDraft splices the picked images into the draft after
 *      the matching anchor paragraphs.
 *
 * Falls back gracefully: if the judge call fails or returns an unparseable
 * payload, the caller can fall back to the legacy data-signal picks so the
 * Sunday/Wednesday cron does not fail the whole post on a transient API
 * issue.
 */

import { callAnthropic, DEFAULT_MODEL } from './repetition';
import type { ImageEntry } from './images';
import { imageGateFor, type ImagePlacement } from './image-selection';
import { stripImageMarkdown } from './markdown-images';
import { parseModelJson } from './model-json';

export type { ImagePlacement };

export interface ContentMatchOptions {
  draft: string;
  pool: ImageEntry[];
  count: number;
  model?: string;
}

/**
 * Asks an LLM judge to pick the N most content-relevant images from `pool`
 * for the given draft and to return verbatim insertion anchors. Prefers
 * `kind: 'live'` and `kind: 'reference'` over `kind: 'archival'` unless
 * the prose explicitly invokes the historical event the archival image
 * depicts.
 *
 * Returns [] when the judge call fails or returns no usable picks; callers
 * should treat that as "fall back to legacy selection."
 */
export async function pickImagesForContent(opts: ContentMatchOptions): Promise<ImagePlacement[]> {
  const { draft, pool, count } = opts;
  if (pool.length === 0) return [];

  const catalog = pool.map((img, i) => {
    const kind = img.kind ?? 'reference';
    const yearTag = img.archival_year ? ` (${img.archival_year})` : '';
    return `${i + 1}. id=${img.id} kind=${kind}${yearTag} topics=${img.topic_tags.join(',')} caption="${img.caption}"`;
  }).join('\n');

  const prompt = `Pick the ${count} images from the catalog below that best match the prose emphasis of this draft. The right image makes the surrounding paragraph stronger; the wrong image distracts a reader who just spent two paragraphs on a tornado outbreak.

Selection rules:
- Strongly prefer images whose subject the prose actually dwells on (multiple sentences, a named region, a specific event), not topics the prose only name-checks.
- Prefer kind=live and kind=reference over kind=archival. Pick archival only if the prose invokes the historical event it depicts, OR if no live/reference image fits.
- Do not pick two images on the same narrow subject (e.g., two solar images for a draft that mentions space weather once).
- Do not pick modeling hardware (supercomputer, Cray) unless the prose discusses forecast models or numerical weather prediction.
- Do not pick drought, pollen, marine, or tropical imagery unless the prose actually develops that subject.
- For each pick, return a 3-8 word verbatim snippet from the draft after which the image should appear. The snippet must occur exactly once in the draft so we can find the insertion point unambiguously. Pick a snippet at a paragraph boundary.

Return JSON only, no prose, no fences:
{"picks":[{"id":"<image-id>","insert_after":"<verbatim snippet>"}, ...]}

DRAFT:
${draft}

IMAGE CATALOG:
${catalog}`;

  let raw: string;
  try {
    raw = await callAnthropic({
      model: opts.model ?? DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1024,
      temperature: 0,
    });
  } catch (err) {
    console.warn(`[content-match] judge call failed: ${(err as Error).message}`);
    return [];
  }

  const parsed = parseJudgeResponse(raw);
  if (!parsed) {
    console.warn('[content-match] judge response was unparseable');
    return [];
  }

  const placements: ImagePlacement[] = [];
  for (const pick of parsed.picks.slice(0, count)) {
    const image = pool.find((i) => i.id === pick.id);
    if (!image) {
      console.warn(`[content-match] judge picked unknown id=${pick.id}, skipping`);
      continue;
    }
    if (placements.some((p) => p.image.id === image.id)) continue;
    placements.push({ image, insertAfter: pick.insert_after });
  }
  return placements;
}

/**
 * Drops judge picks the gate rejects, then backfills from the remaining pool
 * so the cron does not fail on a single mismatched image.
 */
export function filterPlacementsByNarrativeFit(
  draft: string,
  placements: ImagePlacement[],
  pool: ImageEntry[],
  count: number,
): ImagePlacement[] {
  const gate = imageGateFor(draft);
  const accepted = gate.filterPlacements(placements);
  const usedIds = new Set(accepted.map((p) => p.image.id));

  for (const placement of placements) {
    if (usedIds.has(placement.image.id)) continue;
    console.warn(`[content-match] dropping ${placement.image.id}: narrative mismatch`);
  }

  for (const image of gate.filter(pool)) {
    if (accepted.length >= count) break;
    if (usedIds.has(image.id)) continue;
    usedIds.add(image.id);
    accepted.push({ image, insertAfter: '##' });
  }

  return accepted.slice(0, count);
}

/**
 * Splices image markdown blocks into `draft` after each placement's
 * `insertAfter` anchor. Anchors are matched case-insensitively and
 * tolerate whitespace differences. If an anchor is not found, the image
 * is appended at the end of the matching cadence section (## Rearview /
 * ## Roadmap) as a best-effort fallback rather than dropped silently.
 */
export function embedImagesInDraft(draft: string, placements: ImagePlacement[]): string {
  // The generator prompt forbids image markdown (images are spliced in here
  // with real URLs), but the model occasionally emits bare ![alt] tags with
  // no URL, or ![alt](image1)-style relative placeholders. Strip them before
  // inserting the real images.
  let out = stripBareImageMarkdown(draft);
  for (const placement of placements) {
    const block = renderImageMarkdown(placement.image);
    const anchorIdx = locateAnchor(out, placement.insertAfter);
    if (anchorIdx === -1) {
      console.warn(`[content-match] anchor not found for ${placement.image.id}: "${placement.insertAfter}"`);
      out = appendToNearestSection(out, block);
      continue;
    }
    // Insert after the paragraph break following the anchor so the image
    // separates two paragraphs rather than splitting mid-sentence.
    const breakIdx = out.indexOf('\n\n', anchorIdx);
    const insertAt = breakIdx === -1 ? out.length : breakIdx;
    out = out.slice(0, insertAt) + '\n\n' + block + out.slice(insertAt);
  }
  return out;
}

function renderImageMarkdown(img: ImageEntry): string {
  return `![${img.caption}](${img.url})\n*${img.credit}*`;
}

/**
 * Removes ALL image markdown the model emitted, so the published post carries
 * only catalog imagery spliced in by `embedImagesInDraft`.
 *
 * Delegates to the shared reader in markdown-images.ts — the same one the
 * publish-time validator uses, so a destination containing balanced parens
 * (Wikimedia `Special:FilePath` titles) is not truncated here while being read
 * correctly there.
 */
export const stripBareImageMarkdown = stripImageMarkdown;

function locateAnchor(draft: string, anchor: string): number {
  if (!anchor) return -1;
  // Case-insensitive substring match. The judge is asked for verbatim
  // snippets, but normalize whitespace just in case.
  const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
  const haystack = normalize(draft);
  const needle = normalize(anchor);
  const idx = haystack.indexOf(needle);
  if (idx === -1) return -1;
  // Map back to original-string index by counting characters; safe enough
  // because normalization only collapses whitespace runs.
  let originalIdx = 0;
  let normalizedIdx = 0;
  while (normalizedIdx < idx && originalIdx < draft.length) {
    if (/\s/.test(draft[originalIdx])) {
      // skip the whole run, count as one char in normalized form
      while (originalIdx < draft.length && /\s/.test(draft[originalIdx])) originalIdx++;
      normalizedIdx++;
    } else {
      originalIdx++;
      normalizedIdx++;
    }
  }
  return originalIdx + needle.length;
}

function appendToNearestSection(draft: string, block: string): string {
  // Try Roadmap first (likelier home for forecast/data imagery), then Rearview.
  for (const heading of ['## Roadmap', '## Rearview']) {
    const idx = draft.indexOf(heading);
    if (idx === -1) continue;
    // Find the next heading or end of draft.
    const nextHeadingIdx = draft.indexOf('\n## ', idx + heading.length);
    const sectionEnd = nextHeadingIdx === -1 ? draft.length : nextHeadingIdx;
    return draft.slice(0, sectionEnd) + '\n\n' + block + '\n' + draft.slice(sectionEnd);
  }
  // No section heading found — last-resort append at end of draft.
  return draft.trimEnd() + '\n\n' + block + '\n';
}

interface RawJudgeResponse {
  picks: Array<{ id: string; insert_after: string }>;
}

function parseJudgeResponse(raw: string): RawJudgeResponse | null {
  const obj = parseModelJson(raw);
  if (!obj || typeof obj !== 'object') return null;
  const picks = (obj as { picks?: unknown }).picks;
  if (!Array.isArray(picks)) return null;
  const valid: RawJudgeResponse['picks'] = [];
  for (const p of picks) {
    if (!p || typeof p !== 'object') continue;
    const id = (p as { id?: unknown }).id;
    const insertAfter = (p as { insert_after?: unknown }).insert_after;
    if (typeof id === 'string' && typeof insertAfter === 'string') {
      valid.push({ id, insert_after: insertAfter });
    }
  }
  return { picks: valid };
}
