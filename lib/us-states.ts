/**
 * Canonical US state / territory authority.
 *
 * Used by geocoding, location labels, city slugs, and hub relevance.
 */

const US_STATE_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY',
}

/** 50 states + DC (postal / label geocoding). */
export const US_STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
] as const

/**
 * Codes accepted in "City, ST" labels — states + DC + common territories.
 */
export const US_STATE_CODES = new Set<string>([
  ...US_STATE_ABBREVIATIONS,
  'PR', 'VI', 'GU', 'AS', 'MP',
])

const VALID_ABBRS = new Set(Object.values(US_STATE_ABBR))

/**
 * Convert a US state name to its 2-letter abbreviation.
 * Returns the input unchanged if it's already a valid abbreviation,
 * or `null` if the input doesn't match any known US state.
 */
export function toStateAbbr(input: string | undefined | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  if (upper.length === 2 && VALID_ABBRS.has(upper)) return upper

  const abbr = US_STATE_ABBR[trimmed.toLowerCase()]
  return abbr ?? null
}

const STATE_ABBR_SET = new Set<string>(US_STATE_ABBREVIATIONS)

/** True when value is a US state abbreviation or full name (not territories). */
export function isUsState(input: string | undefined | null): boolean {
  if (!input) return false
  const trimmed = input.trim()
  if (!trimmed) return false
  if (STATE_ABBR_SET.has(trimmed.toUpperCase())) return true
  return Object.prototype.hasOwnProperty.call(US_STATE_ABBR, trimmed.toLowerCase())
}
