/**
 * One Guide, end to end: ground, draft, gate, retry, finalize.
 *
 * The loop is `wednesday.ts`'s — draft, sweep, feed the failures back as a
 * correction — with two deliberate differences. The newsletter persists a post
 * that still trips the voice sweep, because a dated post is disposable and the
 * score is worth having; a Guide is evergreen and indexed, so a draft that
 * still fails its gates raises instead of shipping. And a retry here edits the
 * previous draft rather than starting over. The fact check rests on verbatim
 * quotes, and a fresh draft at writing temperature re-rolls every sentence, so
 * claims that had already verified come back reworded and unverified alongside
 * new ones — the Depressions run of 2026-09-01 went from seven unsupported
 * claims to six different ones that way.
 */

import { draftBody, finalizeGuide } from './draft';
import { buildFactCorrection, factCheck, type FactCheckResult } from './fact-check';
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
import { EDUCATION_MODEL } from './model';
import type { EligibleEntry } from './queue';
import { candidateSourcesFor } from './sources';
import { getGuideBrief } from './topics';

/**
 * Retries shared between the prose gates and the fact check. Each one edits the
 * previous draft, so this caps how many corrections one Guide can absorb before
 * the run gives up, not how many fresh attempts it gets.
 */
export const MAX_RETRIES = 4;
const MAX_FINALIZE_RETRIES = 2;
/**
 * Candidates offered to the model; more than it will cite, fewer than the
 * catalog. Twelve because eight left the page a brief depended on just outside
 * the cut more than once, and with grounding narrowed to <main> the extra four
 * cost roughly the prompt budget the page chrome used to.
 */
export const SOURCE_CANDIDATES = 12;

export class GuideGateError extends Error {
  constructor(stage: string, errors: string[], retries: number) {
    super(`Guide failed its ${stage} gate after ${retries} retries:\n- ${errors.join('\n- ')}`);
  }
}

export class MissingBriefError extends Error {}

/**
 * Raised when the prose still asserts a number or an agency claim the fetched
 * sources do not state. Everything else the fact check finds is reported and
 * shipped; this class of claim is not, because the whole point of the pipeline
 * is that a Guide can be trusted without someone reading all 900 words.
 */
export class UnsupportedClaimError extends Error {
  constructor(claims: string[]) {
    super(
      `The sources do not support ${claims.length} numeric or attributed claim(s):\n- ${claims.join('\n- ')}`,
    );
  }
}

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
  factCheck: FactCheckResult;
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

  const model = options.model ?? EDUCATION_MODEL;
  const candidates = candidateSourcesFor(brief, SOURCE_CANDIDATES);
  console.log(`[education] ${entry.kind}:${entry.slug} — ${candidates.length} candidate sources`);

  const sources = await groundOn(candidates, MIN_SOURCES);
  console.log(`[education] grounded on ${sources.map((s) => s.entry.id).join(', ')}`);

  let retries = 0;
  let correction: string | null = null;
  let previousBody: string | null = null;
  let body = '';
  let bodyErrors: string[] = [];
  let facts: FactCheckResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    body = (await draftBody({ entry, brief, sources, correction, previousBody, model })).trim();
    bodyErrors = checkBody(body);
    facts = null;

    if (bodyErrors.length > 0) {
      if (attempt === MAX_RETRIES) break;
      retries += 1;
      console.log(`[education] retry ${retries} — ${bodyErrors.length} body issue(s)`);
      correction = buildCorrection(bodyErrors);
      previousBody = body;
      continue;
    }

    // Form is clean; now ask whether the prose says only what the sources say.
    facts = await factCheck({ body, sources, model });
    console.log(
      `[education] fact check: ${facts.claims.length - facts.unsupported.length}/${facts.claims.length} claims quoted from source` +
        (facts.quoteFailures.length > 0 ? `, ${facts.quoteFailures.length} fabricated quote(s)` : ''),
    );
    if (facts.highRisk.length === 0 || attempt === MAX_RETRIES) break;

    retries += 1;
    console.log(`[education] retry ${retries} — ${facts.highRisk.length} unsupported number/attribution`);
    correction = buildFactCorrection(facts.highRisk);
    previousBody = body;
  }

  if (bodyErrors.length > 0) throw new GuideGateError('prose', bodyErrors, MAX_RETRIES);
  if (facts === null) {
    throw new Error('A draft that passed its prose gates was never fact-checked; this is a bug in the retry loop.');
  }
  if (facts.highRisk.length > 0) {
    throw new UnsupportedClaimError(facts.highRisk.map((claim) => claim.text));
  }

  const diagramContext = diagramContextFor(entry.kind, entry.slug);
  const offeredDiagrams = offeredDiagramsFor(diagramContext);
  const offeredSourceIds = sources.map((source) => source.entry.id);

  let finalizeCorrection: string | null = null;
  let finalized = { summary: '', sourceIds: [] as string[], diagrams: [] as DiagramPlacement[] };
  let finalizeErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_FINALIZE_RETRIES; attempt++) {
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
    if (attempt === MAX_FINALIZE_RETRIES) break;
    retries += 1;
    console.log(`[education] retry ${retries} — ${finalizeErrors.length} metadata issue(s)`);
    finalizeCorrection = buildCorrection(finalizeErrors);
  }
  if (finalizeErrors.length > 0) throw new GuideGateError('metadata', finalizeErrors, MAX_FINALIZE_RETRIES);

  return {
    entry,
    summary: finalized.summary,
    body,
    sourceIds: finalized.sourceIds,
    diagrams: finalized.diagrams,
    retries,
    wordCount: wordCount(body),
    factCheck: facts,
    modelUsed: model,
  };
}
