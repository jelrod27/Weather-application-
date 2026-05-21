/**
 * Blog filter categories.
 *
 * The blog index filters posts by a small, fixed set of categories rather
 * than exposing every raw frontmatter tag (which produced 40+ near-duplicate
 * buttons). Posts keep their original `tags`; this module just maps those
 * tags onto categories.
 *
 * Pure module — no `fs`/Node imports — so it is safe to import from both
 * server and client components.
 */

export type BlogCategoryId =
  | 'space-weather'
  | 'severe-weather'
  | 'climate-earth'
  | 'weekly-dispatch'

export interface BlogCategory {
  id: BlogCategoryId
  label: string
}

/** Canonical category list, in display order. */
export const BLOG_CATEGORIES: BlogCategory[] = [
  { id: 'space-weather', label: 'Space Weather' },
  { id: 'severe-weather', label: 'Severe Weather' },
  { id: 'climate-earth', label: 'Climate & Earth' },
  { id: 'weekly-dispatch', label: 'Weekly Dispatch' },
]

/**
 * Maps a normalized tag to its category. A tag that is not listed here simply
 * contributes no category — the post still appears under "All". The
 * blog-index test asserts every current post lands in at least one category,
 * so add new tags here as they appear.
 */
const TAG_TO_CATEGORY: Record<string, BlogCategoryId> = {
  // Space Weather
  'aurora': 'space-weather',
  'sun': 'space-weather',
  'solar weather': 'space-weather',
  'solar cycle': 'space-weather',
  'solar flare': 'space-weather',
  'solar flares': 'space-weather',
  'solar activity': 'space-weather',
  'geomagnetic': 'space-weather',
  'geomagnetic storms': 'space-weather',
  'space weather': 'space-weather',
  'lyrid meteor shower': 'space-weather',
  // Severe Weather
  'severe weather': 'severe-weather',
  'tornadoes': 'severe-weather',
  'supercells': 'severe-weather',
  'plains': 'severe-weather',
  'spring storms': 'severe-weather',
  'spring pattern': 'severe-weather',
  'spring weather': 'severe-weather',
  'freeze warning': 'severe-weather',
  'tropical': 'severe-weather',
  'california rain': 'severe-weather',
  'forecast': 'severe-weather',
  // Climate & Earth
  'climate': 'climate-earth',
  'paleoclimate': 'climate-earth',
  'cryosphere': 'climate-earth',
  'ocean currents': 'climate-earth',
  'pacific': 'climate-earth',
  'el nino': 'climate-earth',
  'earth day': 'climate-earth',
  'earthquakes': 'climate-earth',
  'tsunami': 'climate-earth',
  'volcanoes': 'climate-earth',
  'atmosphere layers': 'climate-earth',
  'aviation': 'climate-earth',
  'science': 'climate-earth',
  'weather': 'climate-earth',
  'historical events': 'climate-earth',
  // Weekly Dispatch
  'weekly recap': 'weekly-dispatch',
  'weekly dispatch': 'weekly-dispatch',
  'roadmap': 'weekly-dispatch',
}

/** Lowercase, collapse hyphen/whitespace runs to a single space, trim. */
function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/[\s-]+/g, ' ').trim()
}

/**
 * Category ids for a set of post tags, in canonical order. May be empty if
 * none of the tags map to a known category.
 */
export function getPostCategoryIds(tags: string[]): BlogCategoryId[] {
  const matched = new Set<BlogCategoryId>()
  for (const tag of tags) {
    const id = TAG_TO_CATEGORY[normalizeTag(tag)]
    if (id) matched.add(id)
  }
  return BLOG_CATEGORIES.map(c => c.id).filter(id => matched.has(id))
}
