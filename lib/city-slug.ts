import { US_STATE_CODES } from '@/lib/us-states'
import { normalizeCountryHint } from '@/lib/geocoding/country-hints'

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
  for (let count = Math.min(3, parts.length - 1); count > 0; count--) {
    const country = normalizeCountryHint(parts.slice(-count).join(' '))
    if (country) {
      // Full country names must not become ambiguous US state codes (Canada → CA).
      const hint = US_STATE_CODES.has(country) ? slugToDisplayName(parts.slice(-count).join('-')) : country
      return `${slugToSearchTerm(parts.slice(0, -count).join('-'))}, ${hint}`
    }
  }
  return slugToDisplayName(slug)
}
