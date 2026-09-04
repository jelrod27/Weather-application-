/**
 * Validates a Guide markdown file before the workflow opens a PR.
 *
 * The generator already gates its own output, so this is the second, blunter
 * question: does the file on disk survive the loader the site actually uses?
 * `getGuideContent` drops a citation on an unlisted host and `buildGuideSegments`
 * drops a diagram whose anchor moved, both quietly and both with a green build.
 * This is where that becomes an error — the role `validate-post.ts` plays for
 * generated blog posts.
 *
 * Run: tsx scripts/education/validate-guide.ts content/education/clouds/cirrus.md
 */

import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { getGuideContent } from '@/lib/education/content';
import { buildGuideSegments } from '@/lib/education/guide-layout';
import type { EducationEntryKind } from '@/lib/education/entries';

import { diagramContextFor, unrenderableDiagramIds } from './entry-diagrams';
import { checkBody, MAX_SUMMARY_CHARS, MIN_SOURCES, MIN_SUMMARY_CHARS } from './gates';
import { getEligibleEntries } from './queue';

const DIRECTORY_KIND: Record<string, EducationEntryKind> = {
  clouds: 'cloud',
  'weather-systems': 'weather-system',
  phenomena: 'phenomenon',
};

export interface GuideValidationResult {
  ok: boolean;
  errors: string[];
}

export function reviewChronologyErrors(generated: string, reviewed: string): string[] {
  if (!generated || !reviewed || reviewed >= generated) return [];
  return [`reviewed date ${reviewed} is before generated date ${generated}.`];
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export function validateGuideFile(filePath: string): GuideValidationResult {
  const errors: string[] = [];
  const absolute = path.resolve(filePath);
  const slug = path.basename(absolute).replace(/\.md$/, '');
  const directory = path.basename(path.dirname(absolute));
  const kind = DIRECTORY_KIND[directory];

  if (!kind) {
    return {
      ok: false,
      errors: [`"${directory}" is not a Guide directory; expected one of ${Object.keys(DIRECTORY_KIND).join(', ')}.`],
    };
  }

  // The loader below addresses a Guide by kind and slug, not by path, so it
  // reads the canonical file. Without this check a path anywhere on disk would
  // be reported on using the canonical Guide's body, citations and anchors —
  // a pass for a file that was never opened.
  const canonical = path.join(process.cwd(), 'content', 'education', directory, `${slug}.md`);
  if (absolute !== canonical) {
    return {
      ok: false,
      errors: [`${filePath} is not the canonical Guide path. Expected ${path.relative(process.cwd(), canonical)}.`],
    };
  }

  const raw = matter(fs.readFileSync(absolute, 'utf8'));
  const guide = getGuideContent(kind, slug);
  if (!guide) {
    return {
      ok: false,
      errors: [
        `The loader refused ${filePath}. It needs a safe slug and both title and summary in frontmatter.`,
      ],
    };
  }

  if (raw.data.entryKind !== kind) {
    errors.push(`entryKind is "${String(raw.data.entryKind)}" but the file sits in ${directory}/ (kind ${kind}).`);
  }
  if (raw.data.entrySlug !== slug) {
    errors.push(`entrySlug is "${String(raw.data.entrySlug)}" but the filename is ${slug}.md.`);
  }

  const entry = getEligibleEntries().find((e) => e.kind === kind && e.slug === slug);
  if (!entry) {
    errors.push(
      `${kind}:${slug} is not one of the published Guide URLs, so this page would not be reachable. See planning/adr/0001.`,
    );
  } else if (!entry.renders) {
    errors.push(`${kind} Entries do not render long-form Guides yet, so this Guide would never be loaded.`);
  }

  // Anything the loader dropped is gone from the page but still in the file.
  const declaredSources = countArray(raw.data.sources);
  if (declaredSources !== guide.sources.length) {
    errors.push(
      `${declaredSources - guide.sources.length} of ${declaredSources} citations were rejected by the loader (host not on the education allow-list).`,
    );
  }
  if (guide.sources.length < MIN_SOURCES) {
    errors.push(`Only ${guide.sources.length} citations survive; a Guide needs at least ${MIN_SOURCES}.`);
  }

  errors.push(...reviewChronologyErrors(guide.generated, guide.reviewed));

  const declaredDiagrams = countArray(raw.data.diagrams);
  if (declaredDiagrams !== guide.diagrams.length) {
    errors.push(
      `${declaredDiagrams - guide.diagrams.length} of ${declaredDiagrams} diagrams reference ids that are not in the registry.`,
    );
  }

  // Registry membership is not the same as being able to draw: storm-cross-section
  // is registered for every cloud and renders only for one of vertical
  // development. Without this, a hand-edited Guide could declare it for cirrus,
  // pass every other check, and ship a frontmatter diagram the page never shows.
  const unrenderable = unrenderableDiagramIds(
    guide.diagrams.map((diagram) => diagram.id),
    diagramContextFor(kind, slug),
  );
  for (const id of new Set(unrenderable)) {
    errors.push(`Diagram "${id}" cannot draw anything for ${kind}:${slug}, so it would render nothing.`);
  }

  const duplicateIds = guide.diagrams
    .map((diagram) => diagram.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicateIds)) {
    errors.push(`Diagram "${id}" is declared more than once.`);
  }

  // Asked per placement, not per id: with a repeated id, an id-keyed check is
  // satisfied by whichever anchor happens to match.
  for (const diagram of guide.diagrams) {
    const placed = buildGuideSegments(guide.body, [diagram]).some(
      (segment) => segment.diagramId === diagram.id,
    );
    if (!placed) {
      errors.push(`Diagram "${diagram.id}" has an anchor that no longer matches the prose, so it would not render.`);
    }
  }

  if (guide.summary.length < MIN_SUMMARY_CHARS || guide.summary.length > MAX_SUMMARY_CHARS) {
    errors.push(`The summary is ${guide.summary.length} characters; it must be ${MIN_SUMMARY_CHARS}-${MAX_SUMMARY_CHARS}.`);
  }

  errors.push(...checkBody(guide.body));

  return { ok: errors.length === 0, errors };
}

async function main(): Promise<void> {
  const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
  if (!fileArg) throw new Error('Usage: tsx scripts/education/validate-guide.ts <guide.md>');

  const result = validateGuideFile(fileArg);
  if (!result.ok) {
    for (const error of result.errors) console.error(`[validate-guide] ${error}`);
    process.exit(1);
  }
  console.log(`[validate-guide] ${fileArg} passed`);
}

if (process.argv[1]?.endsWith('validate-guide.ts')) {
  main().catch((err) => {
    console.error('[validate-guide] fatal:', err);
    process.exit(1);
  });
}
