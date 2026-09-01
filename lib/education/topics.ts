/**
 * Subject tags for the 29 published Guides, and the related-Guide ranking
 * built on them.
 *
 * Two consumers share this map. The generator (`scripts/education/`) ranks its
 * source catalog against a Guide's tags; the Guide pages render a Related
 * Guides block from tags two Guides have in common. Keeping the tags here
 * rather than in `scripts/` is what lets the page do that without importing
 * generator code — and it keeps planning/adr/0002 intact: the model still
 * writes no links, the code does.
 *
 * Keyed `<kind>:<slug>`. `__tests__/education/` asserts the map covers exactly
 * the eligible set, so a Guide URL without tags fails CI.
 */

import {
  getShareableGuideEntries,
  type EducationEntryKind,
  type EducationEntryRef,
} from '@/lib/education/entries'

export type GuideTopicTag =
  | 'air-masses'
  | 'atmosphere'
  | 'cloud-formation'
  | 'clouds'
  | 'downburst'
  | 'dust'
  | 'flood'
  | 'fronts'
  | 'global-circulation'
  | 'hail'
  | 'jet-stream'
  | 'lightning'
  | 'mid-latitude-cyclone'
  | 'monsoon'
  | 'ocean'
  | 'optics'
  | 'orographic'
  | 'precipitation'
  | 'pressure'
  | 'safety'
  | 'severe'
  | 'stability'
  | 'synoptic'
  | 'thunderstorms'
  | 'tornado'
  | 'tropical'
  | 'upper-air'
  | 'wind'
  | 'winter'

/** Most important first; both consumers weight matches by this order. */
export const GUIDE_TOPICS: Record<string, readonly GuideTopicTag[]> = {
  'cloud:cirrus': ['clouds', 'cloud-formation', 'upper-air', 'optics'],
  'cloud:cumulus': ['clouds', 'cloud-formation', 'stability', 'thunderstorms'],
  'cloud:cumulonimbus': ['clouds', 'thunderstorms', 'severe', 'lightning'],
  'cloud:stratus': ['clouds', 'cloud-formation', 'ocean', 'atmosphere'],
  'cloud:nimbostratus': ['clouds', 'precipitation', 'fronts', 'cloud-formation'],
  'cloud:altocumulus': ['clouds', 'cloud-formation', 'stability', 'synoptic'],
  'cloud:lenticular': ['clouds', 'orographic', 'wind', 'cloud-formation'],

  'weather-system:cyclones': ['pressure', 'synoptic', 'mid-latitude-cyclone', 'global-circulation'],
  'weather-system:anticyclones': ['pressure', 'synoptic', 'global-circulation', 'upper-air'],
  'weather-system:depressions': ['pressure', 'mid-latitude-cyclone', 'synoptic', 'fronts'],
  'weather-system:blocking-highs': ['upper-air', 'pressure', 'jet-stream', 'global-circulation'],
  'weather-system:warm-fronts': ['fronts', 'air-masses', 'synoptic', 'clouds'],
  'weather-system:cold-fronts': ['fronts', 'air-masses', 'synoptic', 'thunderstorms'],
  'weather-system:occluded-fronts': ['fronts', 'mid-latitude-cyclone', 'air-masses', 'synoptic'],
  'weather-system:stationary-fronts': ['fronts', 'air-masses', 'synoptic', 'precipitation'],
  'weather-system:atmospheric-rivers': ['precipitation', 'flood', 'ocean', 'global-circulation'],
  'weather-system:jet-streams': ['jet-stream', 'upper-air', 'global-circulation', 'atmosphere'],
  'weather-system:monsoons': ['monsoon', 'global-circulation', 'precipitation', 'ocean'],
  'weather-system:polar-vortex': ['upper-air', 'jet-stream', 'winter', 'global-circulation'],
  'weather-system:mid-latitude-cyclones': ['mid-latitude-cyclone', 'fronts', 'synoptic', 'pressure'],
  'weather-system:tropical-cyclones': ['tropical', 'ocean', 'wind', 'flood'],
  'weather-system:squall-lines': ['thunderstorms', 'severe', 'wind', 'fronts'],
  'weather-system:mesoscale-convective-complexes': ['thunderstorms', 'severe', 'precipitation', 'flood'],

  'phenomenon:ball-lightning': ['lightning', 'thunderstorms', 'atmosphere'],
  'phenomenon:thundersnow': ['winter', 'precipitation', 'stability', 'lightning'],
  'phenomenon:microbursts': ['downburst', 'thunderstorms', 'wind', 'severe'],
  'phenomenon:sun-dogs': ['optics', 'clouds', 'atmosphere'],
  'phenomenon:haboob': ['dust', 'wind', 'downburst', 'thunderstorms'],
  'phenomenon:sprites': ['lightning', 'atmosphere', 'thunderstorms'],
}

export function topicKey(kind: EducationEntryKind, slug: string): string {
  return `${kind}:${slug}`
}

export function getGuideTopics(kind: EducationEntryKind, slug: string): readonly GuideTopicTag[] {
  return GUIDE_TOPICS[topicKey(kind, slug)] ?? []
}

/**
 * Weights halve down the list, so a tag outweighs every tag after it combined —
 * the same rule `scripts/education/sources.ts` applies to the catalog. Two
 * Guides that share a first tag are related however the rest of their lists
 * differ; two that share only their last tags barely are.
 */
function tagWeights(tags: readonly GuideTopicTag[]): Map<GuideTopicTag, number> {
  return new Map(tags.map((tag, index) => [tag, 2 ** (tags.length - 1 - index)]))
}

/**
 * The published Guides most closely related to one Guide, by shared tags.
 *
 * Only the 29 published Guide URLs are candidates (planning/adr/0001): a
 * related link must land on a page that exists. A Guide with no tags in
 * common is never offered, so a short list means the map is thin around that
 * Entry, not that the block pads itself. Ties keep publication order.
 */
export function getRelatedGuides(
  kind: EducationEntryKind,
  slug: string,
  limit = 3,
): EducationEntryRef[] {
  const own = getGuideTopics(kind, slug)
  if (own.length === 0) return []
  const weight = tagWeights(own)

  return getShareableGuideEntries()
    .filter((entry) => !(entry.kind === kind && entry.slug === slug))
    .map((entry, order) => {
      const theirs = getGuideTopics(entry.kind, entry.slug)
      const score = theirs.reduce((n, tag) => n + (weight.get(tag) ?? 0), 0)
      return { entry, score, order }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map(({ entry }) => entry)
}
