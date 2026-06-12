import type { FeedCategory } from '@/lib/services/rss/feedSources'

const VALID_UNITS = ['standard', 'metric', 'imperial'] as const
export type OwmUnits = (typeof VALID_UNITS)[number]

/**
 * Normalize a client-supplied `units` query param to a known OpenWeatherMap
 * value. Unknown/absent values fall back to 'imperial' (the historical
 * default), so this never 400s — it only prevents the raw string from being
 * interpolated into an upstream URL.
 */
export function normalizeUnits(raw: string | null): OwmUnits {
  return (VALID_UNITS as readonly string[]).includes(raw ?? '')
    ? (raw as OwmUnits)
    : 'imperial'
}

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'earthquakes', 'volcanoes', 'space', 'climate', 'severe', 'science', 'hurricanes',
] satisfies FeedCategory[])

/**
 * Parse a comma-separated `categories` query param, keeping only known
 * FeedCategory values. Returns undefined when the param is absent OR empty
 * (`?categories=`) — downstream this is treated as "all feeds", matching the
 * pre-existing route behavior. For a non-empty param, returns the valid
 * FeedCategory values, or an empty array when none are valid (e.g. all-garbage
 * input like `?categories=bogus`, which yields no feeds).
 */
export function parseFeedCategories(raw: string | null): FeedCategory[] | undefined {
  if (!raw) return undefined
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter((c): c is FeedCategory => VALID_CATEGORIES.has(c))
}
