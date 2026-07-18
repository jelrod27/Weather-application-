import type { FeedCategory } from '@/lib/services/rss/feedSources'

const VALID_UNITS = ['standard', 'metric', 'imperial'] as const
export type WeatherUnits = (typeof VALID_UNITS)[number]

/**
 * Normalize a client-supplied `units` query param to a known value.
 * Unknown/absent values fall back to 'imperial' (the historical default),
 * so this never 400s — it only prevents the raw string from being passed
 * through unchecked.
 */
export function normalizeUnits(raw: string | null): WeatherUnits {
  return (VALID_UNITS as readonly string[]).includes(raw ?? '')
    ? (raw as WeatherUnits)
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

export type ParsedCoordinates =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; error: string }

/**
 * Parse lat/lon query params with finite-number and geographic range checks.
 */
export function parseCoordinates(lat: string | null, lon: string | null): ParsedCoordinates {
  if (!lat || !lon) {
    return { ok: false, error: 'Latitude and longitude are required' }
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, error: 'Invalid coordinates' }
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { ok: false, error: 'Coordinates out of valid range' }
  }

  return { ok: true, latitude, longitude }
}
