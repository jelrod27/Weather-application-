/**
 * Writes a generated Guide to `content/education/<kind>/<slug>.md`.
 *
 * Frontmatter mirrors the exemplar's field order, plus the run metadata the
 * newsletter's posts carry for the same reason: a generated page should say so
 * on its face.
 *
 * `reviewed` is deliberately absent. That field means "prose last checked
 * against its sources by a person", the page prints it as "Checked against
 * sources <date>", and it feeds `dateModified` in the Guide's JSON-LD. A
 * generator writing it would be asserting a human review that has not happened;
 * the reviewer adds it on the PR. `getGuideContent` treats it as optional and
 * both call sites already guard on it.
 */

import fs from 'node:fs';
import path from 'node:path';

import { isAllowedSourceUrl } from '@/lib/education/content';

import type { DiagramPlacement } from './gates';
import { guideFilePath, type EligibleEntry } from './queue';
import { getSourceById } from './sources';

export interface PublishGuideInput {
  entry: EligibleEntry;
  summary: string;
  body: string;
  sourceIds: string[];
  diagrams: DiagramPlacement[];
  modelUsed: string;
  retries: number;
  wordCount: number;
  /** Run date, for the `generated` field. Injectable so tests are stable. */
  now?: Date;
}

export interface PublishGuideResult {
  filePath: string;
  markdown: string;
}

/**
 * YAML plain scalars cover most of what a Guide carries, and the exemplar is
 * written that way, so the file stays readable in review. Quote only what a
 * plain scalar cannot hold.
 *
 * The two content rules are written as the spec states them rather than as the
 * common case, because the common case is not the one that bites. A colon ends
 * a plain scalar when *any* whitespace follows it **or when it ends the
 * value** — `insertAfter: the question is this:` is a parse error, not a
 * string, and the finalize prompt asks for a phrase from the end of a
 * paragraph, which is exactly where a colon sits. A `#` starts a comment after
 * any whitespace, tabs included, and silently truncates rather than throwing.
 */
function yamlScalar(value: string): string {
  const unsafe =
    value !== value.trim() ||
    value === '' ||
    /:(\s|$)/.test(value) ||
    /(^|\s)#/.test(value) ||
    value.includes('\n') ||
    /^[-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(value) ||
    // YAML reads a bare 2026-08-29 as a timestamp and gray-matter hands back a
    // Date, so a date written plain stops being the string it was.
    /^\d{4}-\d{2}-\d{2}/.test(value) ||
    /^[\d.+-]+$/.test(value);
  return unsafe ? JSON.stringify(value) : value;
}

export class UnknownSourceError extends Error {}

/** Renders the Guide file. Exported so tests assert the text, not the write. */
export function buildGuideMarkdown(input: PublishGuideInput): string {
  const seen = new Set<string>();
  const sources = input.sourceIds.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const source = getSourceById(id);
    if (!source) {
      throw new UnknownSourceError(`Guide cites source id "${id}", which is not in the catalog.`);
    }
    // The loader drops citations on unlisted hosts with only a console warning,
    // which would leave the Guide published with a missing Sources entry.
    if (!isAllowedSourceUrl(source.url)) {
      throw new UnknownSourceError(
        `Source "${id}" (${source.url}) is not on the education citation allow-list.`,
      );
    }
    return [source];
  });

  const generated = (input.now ?? new Date()).toISOString().slice(0, 10);

  const lines = [
    '---',
    `entryKind: ${input.entry.kind}`,
    `entrySlug: ${input.entry.slug}`,
    `title: ${yamlScalar(input.entry.title)}`,
    `summary: ${yamlScalar(input.summary.trim())}`,
    `generated: ${yamlScalar(generated)}`,
    `model_used: ${yamlScalar(input.modelUsed)}`,
    `generation_retries: ${input.retries}`,
    `word_count: ${input.wordCount}`,
    'sources:',
    ...sources.flatMap((source) => [
      `  - label: ${yamlScalar(source.label)}`,
      `    url: ${yamlScalar(source.url)}`,
    ]),
  ];

  if (input.diagrams.length > 0) {
    lines.push('diagrams:');
    for (const diagram of input.diagrams) {
      lines.push(`  - id: ${yamlScalar(diagram.id)}`);
      lines.push(`    insertAfter: ${yamlScalar(diagram.insertAfter)}`);
    }
  }

  lines.push('---', '', input.body.trim(), '');
  return lines.join('\n');
}

export function publishGuide(
  input: PublishGuideInput,
  opts: { dryRun?: boolean } = {},
): PublishGuideResult {
  const markdown = buildGuideMarkdown(input);
  const filePath = guideFilePath(input.entry);

  if (opts.dryRun) {
    console.log(`[education] DRY-RUN — would write ${filePath} (${markdown.length} bytes)`);
    return { filePath, markdown };
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, markdown, 'utf8');
  console.log(`[education] wrote ${filePath} (${markdown.length} bytes)`);
  return { filePath, markdown };
}
