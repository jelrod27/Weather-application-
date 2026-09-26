import { US_STATE_CODES } from '@/lib/us-states'
import { normalizeCountryHint, normalizePlaceHint } from '@/lib/geocoding/country-hints'
import { normalizeRegionHint } from '@/lib/geocoding/region-hints'

/** Normalize "San Ramon, CA" → "san-ramon-ca" for /weather/[city] routes. */
export function locationInputToSlug(input: string): string {
  const parts = input.split(',').map((part) => normalizePlaceHint(part).replace(/ /g, '-')).filter(Boolean)
  // City/region/country needs an explicit boundary: the region may itself
  // contain several words. Keep familiar two-part US catalog URLs unchanged.
  return parts.join(parts.length >= 3 ? '--' : '-')
}

/** Best-effort display name from a slug when the city is not in our catalog. */
export function slugToDisplayName(slug: string): string {
  return slug.split('--').map((part) => part.split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')).join(', ')
}

/** Best-effort Open-Meteo search string from a slug. */
export function slugToSearchTerm(slug: string): string {
  if (slug.includes('--')) {
    const parts = slug.split('--').map(slugToDisplayName)
    const last = parts.length - 1
    if (parts.length >= 3 && /^[a-z]{2}$/i.test(parts[1])) parts[1] = parts[1].toUpperCase()
    parts[last] = normalizeCountryHint(parts[last]) ?? parts[last]
    return parts.join(', ')
  }
  const parts = slug.split('-')
  if (parts.length > 1) {
    const maybeState = parts[parts.length - 1].toUpperCase()
    if (maybeState.length === 2 && US_STATE_CODES.has(maybeState)) {
      const cityParts = parts.slice(0, -1)
      const cityName = cityParts.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      return `${cityName}, ${maybeState}`
    }
  }
  for (let count = parts.length - 1; count > 0; count--) {
    const country = normalizeCountryHint(parts.slice(-count).join(' '))
    if (country) {
      // Full country names must not become ambiguous US state codes (Canada → CA).
      const hint = US_STATE_CODES.has(country) ? slugToDisplayName(parts.slice(-count).join('-')) : country
      const remaining = parts.slice(0, -count)
      // Recover common region suffixes from older links without guessing
      // where an arbitrary multi-word city ends.
      for (let regionWords = remaining.length - 1; regionWords > 0; regionWords--) {
        const region = remaining.slice(-regionWords).join(' ')
        if (normalizeRegionHint(region, country)) {
          const regionLabel = /^[a-z]{2}$/i.test(region) ? region.toUpperCase() : slugToDisplayName(remaining.slice(-regionWords).join('-'))
          return `${slugToDisplayName(remaining.slice(0, -regionWords).join('-'))}, ${regionLabel}, ${hint}`
        }
      }
      return `${slugToSearchTerm(remaining.join('-'))}, ${hint}`
    }
  }
  return slugToDisplayName(slug)
}
