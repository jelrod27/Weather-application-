import { US_STATE_CODES } from '@/lib/home/hub-location';

/** Normalize "San Ramon, CA" → "san-ramon-ca" for /weather/[city] routes. */
export function locationInputToSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/** Best-effort display name from a slug when the city is not in our catalog. */
export function slugToDisplayName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Best-effort Open-Meteo search string from a slug. */
export function slugToSearchTerm(slug: string): string {
  const parts = slug.split('-')
  if (parts.length > 1) {
    const maybeState = parts[parts.length - 1].toUpperCase()
    if (maybeState.length === 2 && US_STATE_CODES.has(maybeState)) {
      const cityParts = parts.slice(0, -1)
      const cityName = cityParts.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      return `${cityName}, ${maybeState}`
    }
  }
  return slugToDisplayName(slug)
}
