/**
 * Which Entries the generator is allowed to write a Guide for.
 *
 * The eligible set is exactly the 29 Entries already published as Guide URLs
 * (`getShareableGuideEntries`). The other 47 Entries in the databases are Atlas
 * rows, and generating a page for one of them is the specific failure
 * planning/adr/0001 exists to prevent: 47 more thin pages in one subfolder is
 * what Google's Helpful Content system demotes at the section level. So the
 * queue is not "Entries without a page" — it is "published Guides that are
 * still short", and it empties at 29.
 *
 * Coverage for the remaining Entries comes from Collection Guides, which are a
 * different shape of page and not this generator's job.
 */

import path from 'node:path';

import { getGuideSlugs } from '@/lib/education/content';
import {
  getCloudBySlug,
  getEducationDetailHref,
  getPhenomenonBySlug,
  getShareableGuideEntries,
  getWeatherSystemBySlug,
  type EducationEntryKind,
} from '@/lib/education/entries';

/**
 * Entry kinds whose detail route renders long-form Guides today.
 *
 * A Guide written for a kind that is not here would sit in `content/education/`
 * unread — `getGuideContent` is only called from the cloud route. The
 * correspondence is asserted in `__tests__/education/queue.test.ts`, so wiring a
 * route without adding its kind here (or the reverse) fails CI rather than
 * quietly producing content nobody can reach.
 */
export const KINDS_WITH_GUIDE_RENDERING: readonly EducationEntryKind[] = [
  'cloud',
  'weather-system',
  'phenomenon',
];

/** Route segment for each kind, matching `app/education/<segment>/[slug]`. */
export const KIND_ROUTE_SEGMENT: Record<EducationEntryKind, string> = {
  cloud: 'cloud-types',
  'weather-system': 'weather-systems',
  phenomenon: 'phenomena',
};

export interface EligibleEntry {
  kind: EducationEntryKind;
  slug: string;
  /** Entry name as the databases store it, e.g. "WARM FRONTS". */
  entryName: string;
  /** Reading title for the Guide, e.g. "Warm Fronts". */
  title: string;
  href: string;
  /** Whether a markdown Guide already exists for this Entry. */
  hasGuide: boolean;
  /** Whether this Entry's route renders long-form Guides. */
  renders: boolean;
}

/**
 * The databases store cloud and system names in caps ("MID-LATITUDE
 * CYCLONES"); phenomena are already mixed case. Caps is a display choice for
 * the Atlas chrome, not the name, so it is undone for prose.
 */
export function toGuideTitle(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}

function entryName(kind: EducationEntryKind, slug: string): string | null {
  if (kind === 'cloud') return getCloudBySlug(slug)?.name ?? null;
  if (kind === 'weather-system') return getWeatherSystemBySlug(slug)?.name ?? null;
  return getPhenomenonBySlug(slug)?.name ?? null;
}

/** Every Entry published as a Guide URL, whether or not it has prose yet. */
export function getEligibleEntries(): EligibleEntry[] {
  const guideSlugs: Record<EducationEntryKind, Set<string>> = {
    cloud: new Set(getGuideSlugs('cloud')),
    'weather-system': new Set(getGuideSlugs('weather-system')),
    phenomenon: new Set(getGuideSlugs('phenomenon')),
  };

  return getShareableGuideEntries().map((entry) => {
    const name = entryName(entry.kind, entry.slug) ?? entry.title;
    return {
      kind: entry.kind,
      slug: entry.slug,
      entryName: name,
      title: toGuideTitle(name),
      href: getEducationDetailHref(entry.kind, entry.slug),
      hasGuide: guideSlugs[entry.kind].has(entry.slug),
      renders: KINDS_WITH_GUIDE_RENDERING.includes(entry.kind),
    };
  });
}

/**
 * Eligible Entries that do not have a Guide yet.
 *
 * Kinds whose route renders Guides come first, so `--next` picks work that
 * reaches a reader rather than a markdown file nothing loads. Order is
 * otherwise the publication order of `getShareableGuideEntries`.
 */
export function getGuideQueue(): EligibleEntry[] {
  return getEligibleEntries()
    .filter((entry) => !entry.hasGuide)
    .sort((a, b) => Number(b.renders) - Number(a.renders));
}

export class IneligibleEntryError extends Error {}

/**
 * Resolves a target slug against the eligible set.
 *
 * Throws rather than returning null: a slug that names a real Entry which is
 * not a published Guide is the tempting mistake, and the message has to say why
 * it is refused rather than reading as "not found".
 */
export function resolveTarget(slug: string, kind?: EducationEntryKind): EligibleEntry {
  const eligible = getEligibleEntries();
  const matches = eligible.filter((entry) => entry.slug === slug && (!kind || entry.kind === kind));

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const kinds = matches.map((m) => m.kind).join(', ');
    throw new IneligibleEntryError(
      `"${slug}" is ambiguous across kinds (${kinds}). Pass --kind to choose one.`,
    );
  }

  const isKnownEntry =
    Boolean(getCloudBySlug(slug)) ||
    Boolean(getWeatherSystemBySlug(slug)) ||
    Boolean(getPhenomenonBySlug(slug));

  if (isKnownEntry) {
    throw new IneligibleEntryError(
      `"${slug}" is an Entry but not one of the ${eligible.length} published Guides, so it is not ` +
        `eligible for a Guide. See planning/adr/0001 — Entries without a Guide are Atlas rows, and ` +
        `coverage for them comes from Collection Guides, not a page each.`,
    );
  }
  throw new IneligibleEntryError(`"${slug}" does not match any education Entry.`);
}

/** Where a Guide for this Entry is written. */
export function guideFilePath(entry: EligibleEntry): string {
  const directory =
    entry.kind === 'cloud' ? 'clouds' : entry.kind === 'weather-system' ? 'weather-systems' : 'phenomena';
  return path.join(process.cwd(), 'content', 'education', directory, `${entry.slug}.md`);
}
