/**
 * One Guide, end to end: ground, draft, gate, retry, finalize.
 *
 * The loop is `wednesday.ts`'s — draft, sweep, feed the failures back as a
 * correction, up to two retries — with one deliberate difference. The
 * newsletter persists a post that still trips the voice sweep, because a dated
 * post is disposable and the score is worth having. A Guide is evergreen and
 * indexed, so a draft that still fails its gates raises instead of shipping.
 */

import { DEFAULT_MODEL } from '../newsletter/repetition';
import { draftBody, finalizeGuide } from './draft';
import { diagramContextFor, offeredDiagramsFor } from './entry-diagrams';
import {
  buildCorrection,
  checkBody,
  checkFinalize,
  wordCount,
  MIN_SOURCES,
  type DiagramPlacement,
} from './gates';
import { groundOn } from './grounding';
import type { EligibleEntry } from './queue';
import { sourcesForTags } from './sources';
import { getGuideBrief } from './topics';

const MAX_RETRIES = 2;
/** Candidates offered to the model; more than it will cite, fewer than the catalog. */
const SOURCE_CANDIDATES = 8;

export class GuideGateError extends Error {
  constructor(stage: string, errors: string[]) {
    super(`Guide failed its ${stage} gate after ${MAX_RETRIES} retries:\n- ${errors.join('\n- ')}`);
  }
}

export class MissingBriefError extends Error {}

export interface GenerateGuideOptions {
  model?: string;
}

export interface GenerateGuideResult {
  entry: EligibleEntry;
  summary: string;
  body: string;
  sourceIds: string[];
  diagrams: DiagramPlacement[];
  retries: number;
  wordCount: number;
  modelUsed: string;
}

export async function generateGuide(
  entry: EligibleEntry,
  options: GenerateGuideOptions = {},
): Promise<GenerateGuideResult> {
  const brief = getGuideBrief(entry.kind, entry.slug);
  if (!brief) {
    throw new MissingBriefError(
      `No drafting brief for "${entry.kind}:${entry.slug}" in scripts/education/topics.ts. ` +
        `Add its source tags and focus line before generating.`,
    );
  }

  const model = options.model ?? DEFAULT_MODEL;
  const candidates = sourcesForTags(brief.tags, SOURCE_CANDIDATES);
  console.log(`[education] ${entry.kind}:${entry.slug} — ${candidates.length} candidate sources`);

  const sources = await groundOn(candidates, MIN_SOURCES);
  console.log(`[education] grounded on ${sources.map((s) => s.entry.id).join(', ')}`);

  let retries = 0;
  let correction: string | null = null;
  let body = '';
  let bodyErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    body = (await draftBody({ entry, brief, sources, correction, model })).trim();
    bodyErrors = checkBody(body);
    if (bodyErrors.length === 0) break;
    if (attempt === MAX_RETRIES) break;
    retries += 1;
    console.log(`[education] retry ${retries} — ${bodyErrors.length} body issue(s)`);
    correction = buildCorrection(bodyErrors);
  }
  if (bodyErrors.length > 0) throw new GuideGateError('prose', bodyErrors);

  const diagramContext = diagramContextFor(entry.kind, entry.slug);
  const offeredDiagrams = offeredDiagramsFor(diagramContext);
  const offeredSourceIds = sources.map((source) => source.entry.id);

  let finalizeCorrection: string | null = null;
  let finalized = { summary: '', sourceIds: [] as string[], diagrams: [] as DiagramPlacement[] };
  let finalizeErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    finalized = await finalizeGuide({
      entry,
      body,
      sources,
      offeredDiagrams,
      correction: finalizeCorrection,
      model,
    });
    finalizeErrors = checkFinalize({
      body,
      summary: finalized.summary,
      sourceIds: finalized.sourceIds,
      offeredSourceIds,
      diagrams: finalized.diagrams,
      offeredDiagramIds: offeredDiagrams.map((d) => d.id),
      diagramContext,
    });
    if (finalizeErrors.length === 0) break;
    if (attempt === MAX_RETRIES) break;
    retries += 1;
    console.log(`[education] retry ${retries} — ${finalizeErrors.length} metadata issue(s)`);
    finalizeCorrection = buildCorrection(finalizeErrors);
  }
  if (finalizeErrors.length > 0) throw new GuideGateError('metadata', finalizeErrors);

  return {
    entry,
    summary: finalized.summary,
    body,
    sourceIds: finalized.sourceIds,
    diagrams: finalized.diagrams,
    retries,
    wordCount: wordCount(body),
    modelUsed: model,
  };
}
