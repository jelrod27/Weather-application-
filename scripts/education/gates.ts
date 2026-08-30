/**
 * What a drafted Guide has to satisfy before it is written to disk.
 *
 * Two jobs in one place. The editorial half — length, shape, register — is the
 * depth bar planning/adr/0001 sets, checked rather than hoped for. The
 * containment half is the reason ADR-0002 chose markdown over MDX: a draft is
 * untrusted text, so it may not carry links, images, embedded HTML or anything
 * else that reaches outside the page. Citations arrive as catalog ids and
 * diagrams as registry ids; the body is prose and headings and nothing else.
 *
 * Failures come back as sentences because they are fed straight to the model as
 * the correction block on a retry, exactly as `buildVoiceCorrectionInstruction`
 * does for the newsletter.
 */

import { buildGuideSegments } from '@/lib/education/guide-layout';
import { getDiagram } from '@/lib/education/diagrams';
import type { DiagramContext } from '@/lib/education/diagram-types';
import { sweepVoice } from '../newsletter/voice';

/** ADR-0001 puts a Guide at roughly 900 words; this is the band around it. */
export const MIN_WORDS = 780;
export const MAX_WORDS = 1_150;
export const MIN_SECTIONS = 3;
export const MAX_SECTIONS = 7;
export const MIN_SOURCES = 3;
export const MIN_SUMMARY_CHARS = 80;
export const MAX_SUMMARY_CHARS = 200;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Checks the prose body. Returns one sentence per failure, empty when it
 * passes.
 */
export function checkBody(body: string): string[] {
  const errors: string[] = [];
  const words = wordCount(body);

  if (words < MIN_WORDS) {
    errors.push(`The draft is ${words} words. Expand it to ${MIN_WORDS}-${MAX_WORDS} with more mechanism and specifics, not more adjectives.`);
  } else if (words > MAX_WORDS) {
    errors.push(`The draft is ${words} words. Cut it to ${MIN_WORDS}-${MAX_WORDS}.`);
  }

  if (/^---\s*$/m.test(body.split('\n').slice(0, 2).join('\n'))) {
    errors.push('The draft opens with YAML frontmatter. Return the prose body only; frontmatter is written by the publish step.');
  }

  if (/^#\s/m.test(body)) {
    errors.push('The draft contains an H1 heading. The page renders the title from frontmatter, so the body starts at ## .');
  }

  const sections = body.match(/^##\s+\S/gm) ?? [];
  if (sections.length < MIN_SECTIONS) {
    errors.push(`The draft has ${sections.length} "##" sections. Give it ${MIN_SECTIONS}-${MAX_SECTIONS}, each carrying one idea.`);
  } else if (sections.length > MAX_SECTIONS) {
    errors.push(`The draft has ${sections.length} "##" sections. Consolidate to ${MIN_SECTIONS}-${MAX_SECTIONS}.`);
  }

  if (/!\[/.test(body)) {
    errors.push('The draft embeds an image. Guides carry diagrams from the registry instead; remove the image markdown.');
  }

  // Any link at all, in either markdown spelling. A relative destination
  // (`[x](cirrus)`, `[x](#how-it-forms)`) is still a live anchor once
  // rehype-sanitize is done with it, and so is the reference form
  // (`[x][cirrus]` with a `[cirrus]: /education/...` definition further down).
  // Both READMEs promise a Guide body carries no links.
  if (/\]\(/.test(body) || /\]\[/.test(body) || /^\s*\[[^\]]+\]:\s*\S/m.test(body)) {
    errors.push('The draft contains a markdown link. Citations belong in frontmatter sources, so write the body without links of any kind — relative and reference-style included.');
  }

  if (/\bhttps?:\/\//i.test(body) || /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i.test(body)) {
    errors.push('The draft contains a URL. Name the source in prose if it matters ("the National Weather Service"), and leave the link to frontmatter.');
  }

  if (/<[a-z][a-z0-9]*(\s|\/?>)/i.test(body)) {
    errors.push('The draft contains raw HTML. Write plain markdown.');
  }

  if (/```/.test(body)) {
    errors.push('The draft contains a code fence. A Guide is prose.');
  }

  const violations = sweepVoice(body);
  if (violations.length > 0) {
    const grouped = new Map<string, Set<string>>();
    for (const violation of violations) {
      const set = grouped.get(violation.label) ?? new Set<string>();
      set.add(violation.match);
      grouped.set(violation.label, set);
    }
    for (const [label, matches] of grouped) {
      errors.push(`Voice violation (${label}): ${[...matches].join(', ')}. Rewrite without it.`);
    }
  }

  return errors;
}

export interface DiagramPlacement {
  id: string;
  insertAfter: string;
}

export interface FinalizeCheckInput {
  body: string;
  summary: string;
  sourceIds: string[];
  /** Ids the run offered; anything outside this set was invented. */
  offeredSourceIds: readonly string[];
  diagrams: DiagramPlacement[];
  /** Ids offered for this Entry, already filtered by `isRenderable`. */
  offeredDiagramIds: readonly string[];
  diagramContext: DiagramContext;
}

/** Checks the summary, citations and diagram placements. */
export function checkFinalize(input: FinalizeCheckInput): string[] {
  const errors: string[] = [];
  const summary = input.summary.trim();

  if (summary.length < MIN_SUMMARY_CHARS || summary.length > MAX_SUMMARY_CHARS) {
    errors.push(`The summary is ${summary.length} characters. Write ${MIN_SUMMARY_CHARS}-${MAX_SUMMARY_CHARS} — it is the search description.`);
  }
  if (/[\n\r]/.test(summary)) {
    errors.push('The summary spans multiple lines. Make it one sentence.');
  }

  const offered = new Set(input.offeredSourceIds);
  const invented = input.sourceIds.filter((id) => !offered.has(id));
  if (invented.length > 0) {
    errors.push(`These source ids were not offered for this Guide: ${invented.join(', ')}. Cite only ids from the list given.`);
  }
  const cited = input.sourceIds.filter((id) => offered.has(id));
  if (new Set(cited).size < MIN_SOURCES) {
    errors.push(`Only ${new Set(cited).size} valid sources were cited. Cite at least ${MIN_SOURCES} of the ids offered.`);
  }

  // Two placements of one id defeat the anchor check below, which can only ask
  // whether an id was placed: the good anchor satisfies it and the broken one
  // rides along into frontmatter. Two *working* anchors are no better — the
  // page draws the same figure twice.
  const duplicateIds = input.diagrams
    .map((diagram) => diagram.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicateIds)) {
    errors.push(`Diagram "${id}" is placed more than once. Each diagram appears at most once in a Guide.`);
  }

  const offeredDiagrams = new Set(input.offeredDiagramIds);
  for (const diagram of input.diagrams) {
    if (!offeredDiagrams.has(diagram.id)) {
      errors.push(`Diagram "${diagram.id}" was not offered for this Guide. Use only the diagram ids listed.`);
      continue;
    }
    const definition = getDiagram(diagram.id);
    if (definition?.isRenderable && !definition.isRenderable(input.diagramContext)) {
      errors.push(`Diagram "${diagram.id}" cannot draw anything for this Entry.`);
    }
  }

  // An anchor that matches nothing is dropped silently at render time, so the
  // Guide would publish with a diagram the frontmatter claims and the page
  // never shows. Resolve it here against the same function the page uses.
  const placed = buildGuideSegments(input.body, input.diagrams)
    .map((segment) => segment.diagramId)
    .filter((id): id is string => id !== null);
  for (const diagram of input.diagrams) {
    if (!placed.includes(diagram.id)) {
      errors.push(`The anchor for diagram "${diagram.id}" ("${diagram.insertAfter}") does not appear in the draft. Quote a phrase verbatim from a paragraph.`);
    }
  }

  return errors;
}

/** The correction block injected into the next attempt. */
export function buildCorrection(errors: string[]): string {
  return ['Your previous attempt failed these checks. Fix every one:', ...errors.map((e) => `- ${e}`)].join('\n');
}
