/**
 * Groups the city catalog for the `/weather` directory.
 *
 * Every city page carried a Köppen classification already, but as free text
 * ("Humid continental (Köppen Dfa/Dfb)"), which splits 45 cities across 15
 * labels and half of those hold one city. Reading the code out of the
 * parentheses collapses them into the families a reader actually browses by.
 */

import { cityData, getCityEnrichment } from '@/lib/cities'

export interface CityDirectoryEntry {
  slug: string
  name: string
  state: string
  /** The full classification as written on the city page. */
  climateType: string
  /** Average July high in °F, or null when the city carries no monthly data. */
  summerHigh: number | null
  /** Average January high in °F, or null when the city carries no monthly data. */
  winterHigh: number | null
}

export interface CityDirectoryGroup {
  family: string
  /** One sentence on what the family means, shown under the heading. */
  blurb: string
  cities: CityDirectoryEntry[]
}

/** Köppen families, in the order the directory lists them. */
const FAMILIES: Array<{ family: string; blurb: string; test: (code: string) => boolean }> = [
  {
    family: 'Humid subtropical',
    blurb:
      'Hot, humid summers and mild winters. Thunderstorms are a summer routine rather than an event, and snow is rare enough to shut a city down when it arrives.',
    test: (code) => code.startsWith('Cfa'),
  },
  {
    family: 'Humid continental',
    blurb:
      'Four distinct seasons with a real winter. Summers turn hot and humid, winters drop below freezing for weeks, and the swing between them is the largest of any group here.',
    test: (code) => code.startsWith('Dfa') || code.startsWith('Dfb'),
  },
  {
    family: 'Mediterranean',
    blurb:
      'Dry summers and wet winters, the reverse of most of the country. Rainfall arrives almost entirely between November and March.',
    test: (code) => code.startsWith('Cs'),
  },
  {
    family: 'Semi-arid',
    blurb:
      'Low annual rainfall with wide day-to-night temperature swings. Dry air makes hot afternoons more bearable and clear nights much colder than the daytime high suggests.',
    test: (code) => code.startsWith('BS'),
  },
  {
    family: 'Hot desert',
    blurb:
      'The hottest summers in the country and very little rain, most of it delivered in short bursts by the summer monsoon.',
    test: (code) => code.startsWith('BW'),
  },
  {
    family: 'Oceanic',
    blurb:
      'Narrow temperature range year round, with long stretches of grey drizzle rather than heavy downpours. Summers stay mild and winters rarely freeze hard.',
    test: (code) => code.startsWith('Cfb'),
  },
  {
    family: 'Tropical',
    blurb:
      'Warm all year with a pronounced wet season, and the hurricane season on top of it.',
    test: (code) => code.startsWith('A'),
  },
  {
    family: 'Subarctic',
    blurb:
      'Short cool summers and long, severe winters, with daylight itself swinging from a few hours to nearly the whole day.',
    test: (code) => code.startsWith('Dfc') || code.startsWith('Dfd'),
  },
]

/** The Köppen code out of a classification string, e.g. "Dfa/Dfb" → "Dfa". */
export function koppenCode(climateType: string): string {
  const match = climateType.match(/Köppen\s+([A-Za-z]+)/)
  return match ? match[1] : ''
}

/**
 * Plain-English family for a classification string, e.g.
 * "Humid continental (Köppen Dfa/Dfb)" → "humid continental". Returns null
 * when the code matches no family, so callers can fall back rather than
 * printing something wrong.
 */
export function koppenFamily(climateType: string): string | null {
  const code = koppenCode(climateType)
  if (!code) return null
  const match = FAMILIES.find(({ test }) => test(code))
  return match ? match.family.toLowerCase() : null
}

function entryFor(slug: string): CityDirectoryEntry | null {
  const city = cityData[slug]
  const enrichment = getCityEnrichment(slug)
  if (!city || !enrichment) return null

  const highs = enrichment.monthlyHighs
  const hasMonthly = Array.isArray(highs) && highs.length === 12

  return {
    slug,
    name: city.name,
    state: city.state,
    climateType: enrichment.climateType,
    summerHigh: hasMonthly ? highs[6] : null,
    winterHigh: hasMonthly ? highs[0] : null,
  }
}

/**
 * Every catalog city, grouped by Köppen family and sorted by name inside each
 * group. Families with no cities are dropped, and anything whose code matches
 * no family lands in a trailing "Other" group rather than disappearing.
 */
export function getCityDirectory(): CityDirectoryGroup[] {
  const entries = Object.keys(cityData)
    .map(entryFor)
    .filter((entry): entry is CityDirectoryEntry => entry !== null)

  const groups: CityDirectoryGroup[] = FAMILIES.map(({ family, blurb }) => ({
    family,
    blurb,
    cities: [],
  }))
  const other: CityDirectoryEntry[] = []

  for (const entry of entries) {
    const code = koppenCode(entry.climateType)
    const index = FAMILIES.findIndex(({ test }) => code && test(code))
    if (index === -1) other.push(entry)
    else groups[index].cities.push(entry)
  }

  for (const group of groups) {
    group.cities.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  }

  const populated = groups.filter((group) => group.cities.length > 0)
  if (other.length > 0) {
    populated.push({
      family: 'Other climates',
      blurb: 'Cities whose classification does not fall into the families above.',
      cities: other.sort((a, b) => a.name.localeCompare(b.name, 'en')),
    })
  }

  return populated
}

/** Total cities in the directory, for headings and metadata. */
export function cityDirectoryCount(): number {
  return Object.keys(cityData).length
}
