/**
 * The two model calls behind a Guide.
 *
 * Prose first, placement second — the same split `wednesday.ts` makes for the
 * newsletter's images, and for the same reason. Asking for prose and diagram
 * anchors in one response pre-commits the draft to illustrating a point it may
 * end up de-emphasising, and an anchor has to quote the final text verbatim to
 * resolve at all.
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseModelJsonObject } from '../newsletter/model-json';
import type { AnthropicCacheBlock } from '../newsletter/repetition';
import { entryFacts, kindLabel } from './brief';
import { MAX_WORDS, MIN_SOURCES, MIN_WORDS, type DiagramPlacement } from './gates';
import type { GroundedSource } from './grounding';
import { callEducationModel } from './model';
import type { EligibleEntry } from './queue';
import type { GuideBrief } from './topics';
import { GUIDE_SYSTEM_PROMPT } from './voice';

/**
 * The Guide the rest are measured against. Shown to the model as the standard
 * rather than described in prose — depth, paragraph rhythm and spelling are all
 * easier to copy than to specify, and this is the artefact ADR-0001's depth bar
 * was set from.
 */
const EXEMPLAR_PATH = path.join(process.cwd(), 'content', 'education', 'clouds', 'cumulonimbus.md');

export class MissingExemplarError extends Error {}

/** The exemplar's prose body, frontmatter stripped. */
export function readExemplar(): string {
  if (!fs.existsSync(EXEMPLAR_PATH)) {
    throw new MissingExemplarError(
      `The exemplar Guide is missing at ${EXEMPLAR_PATH}. Generation is calibrated against it; ` +
        `restore it or point EXEMPLAR_PATH at another finished Guide before running.`,
    );
  }
  const raw = fs.readFileSync(EXEMPLAR_PATH, 'utf8');
  const end = raw.startsWith('---') ? raw.indexOf('\n---', 3) : -1;
  return (end === -1 ? raw : raw.slice(end + 4)).trim();
}

function groundingBlock(sources: GroundedSource[]): string {
  return sources
    .map((source) => `### ${source.entry.id} — ${source.entry.label}\n${source.text}`)
    .join('\n\n');
}

export interface DraftBodyOptions {
  entry: EligibleEntry;
  brief: GuideBrief;
  sources: GroundedSource[];
  correction: string | null;
  /**
   * The draft the correction refers to. When set, the model is asked to revise
   * it in place rather than write again, so sentences the fact check has
   * already verified survive the retry verbatim.
   */
  previousBody?: string | null;
  model?: string;
}

/**
 * System blocks are ordered static-first so prompt caching covers the voice
 * spec, the exemplar and the fetched source text across the retries in one run.
 */
function systemBlocks(options: DraftBodyOptions): AnthropicCacheBlock[] {
  return [
    { type: 'text', text: GUIDE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text: `THE STANDARD\n\nThis is a finished Guide. Match its depth, its paragraph rhythm, its spelling conventions and its willingness to explain a mechanism in plain words. Do not reuse its sentences, its structure or its subject.\n\n${readExemplar()}`,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: `SOURCE MATERIAL\n\nEverything factual in your draft must be supported by the text below, which is public-domain NOAA and National Weather Service material. If a claim is not in here, leave it out.\n\n${groundingBlock(options.sources)}`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

export async function draftBody(options: DraftBodyOptions): Promise<string> {
  const { entry, brief, correction, previousBody } = options;
  const facts = entryFacts(entry);

  const sections = [
    `Write the Guide for ${entry.title}, an Entry in the 16-Bit Weather ${kindLabel(entry)}.`,
    `FOCUS FOR THIS GUIDE\n${brief.focus}`,
  ];

  if (facts.length > 0) {
    sections.push(
      `THE ENTRY'S STRUCTURED DATA\n\nThese fields render in a panel beside your prose. They are context, not material to recite.\n${facts.map((fact) => `- ${fact}`).join('\n')}`,
    );
  }

  sections.push(`SHAPE
- Open with the single most interesting true thing about ${entry.title}, stated plainly. No throat-clearing, no "## Introduction".
- Then, in ${'##'} sections: what it actually is, how it forms, how someone recognises it, and what it means for the person looking at it. Adapt the order if the subject wants a different one.
- Hazards and safety go last, where they apply, and come from the source material rather than from general caution.
- End on the last substantive paragraph. No summary section, no "Bottom Line", no closing exhortation.
- ${MIN_WORDS}-${MAX_WORDS} words. Aim near 900.`);

  if (correction && previousBody) {
    sections.push(`YOUR PREVIOUS DRAFT\n\n${previousBody}`);
    sections.push(correction);
    sections.push(
      'Revise the previous draft; do not start over. Change only what the correction requires and keep every other sentence exactly as it was — a sentence already checked against the sources stays checked only if it stays verbatim. Return the complete revised Guide.',
    );
  } else if (correction) {
    sections.push(correction);
  }

  sections.push(
    'Return only the markdown body. No frontmatter, no fences, no H1, no commentary before or after.',
  );

  return callEducationModel({
    model: options.model,
    systemBlocks: systemBlocks(options),
    messages: [{ role: 'user', content: sections.join('\n\n') }],
    // Only reaches models that accept sampling; an edit wants far less variety
    // than a first draft.
    temperature: previousBody ? 0.2 : 0.7,
  });
}

export interface FinalizeOptions {
  entry: EligibleEntry;
  body: string;
  sources: GroundedSource[];
  offeredDiagrams: { id: string; caption: string }[];
  correction: string | null;
  model?: string;
}

export interface FinalizeResult {
  summary: string;
  sourceIds: string[];
  diagrams: DiagramPlacement[];
}

/**
 * Second pass over the finished draft: the search description, which of the
 * offered sources the prose actually rests on, and where the diagrams go.
 */
export async function finalizeGuide(options: FinalizeOptions): Promise<FinalizeResult> {
  const { entry, body, sources, offeredDiagrams, correction } = options;

  const diagramBlock =
    offeredDiagrams.length > 0
      ? offeredDiagrams.map((d) => `- ${d.id}: ${d.caption}`).join('\n')
      : '(none available for this Entry — return an empty array)';

  const prompt = [
    `Below is a finished Guide on ${entry.title}. Produce its metadata.`,
    `SOURCES OFFERED (cite by id only):\n${sources.map((s) => `- ${s.entry.id}: ${s.entry.label}`).join('\n')}`,
    `DIAGRAMS AVAILABLE (place by id only):\n${diagramBlock}`,
    `Return JSON only, with this exact shape:
{
  "summary": "...",
  "sourceIds": ["..."],
  "diagrams": [{"id": "...", "insertAfter": "..."}]
}

summary: one sentence, 80-200 characters, written to be read in a search result. Say what the reader will understand after reading, not that the page is about a topic.
sourceIds: at least ${MIN_SOURCES} ids from the list above — the ones the prose actually rests on.
diagrams: zero or more placements. "insertAfter" must be a phrase of 3-8 words copied verbatim from the end of the paragraph the diagram should follow. Place a diagram only where it explains something the prose has just set up.`,
    correction ?? '',
    `GUIDE:\n${body}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const raw = await callEducationModel({
    model: options.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  const parsed = parseModelJsonObject(raw);
  const diagrams = Array.isArray(parsed.diagrams) ? parsed.diagrams : [];

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    sourceIds: Array.isArray(parsed.sourceIds)
      ? parsed.sourceIds.filter((id): id is string => typeof id === 'string')
      : [],
    diagrams: diagrams.flatMap((item): DiagramPlacement[] => {
      if (!item || typeof item !== 'object') return [];
      const { id, insertAfter } = item as Record<string, unknown>;
      if (typeof id !== 'string' || typeof insertAfter !== 'string') return [];
      return [{ id, insertAfter }];
    }),
  };
}
