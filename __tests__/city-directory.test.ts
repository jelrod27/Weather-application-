import { cityData } from '@/lib/cities'
import {
  cityDirectoryCount,
  getCityDirectory,
  koppenCode,
  koppenFamily,
} from '@/lib/seo/city-directory'
import { buildCityPageDescription } from '@/lib/seo/city-page-seo'
import { MAX_DESCRIPTION_LENGTH } from '@/lib/seo/clamp-description'

describe('koppenCode', () => {
  it('reads the code out of a classification string', () => {
    expect(koppenCode('Humid continental (Köppen Dfa)')).toBe('Dfa')
    expect(koppenCode('Humid continental (Köppen Dfa/Dfb)')).toBe('Dfa')
    expect(koppenCode('Hot desert (Köppen BWh)')).toBe('BWh')
  })

  it('returns an empty string when there is no code to read', () => {
    expect(koppenCode('Temperate')).toBe('')
  })
})

describe('koppenFamily', () => {
  it('maps codes to the family a reader browses by', () => {
    expect(koppenFamily('Humid subtropical (Köppen Cfa)')).toBe('humid subtropical')
    expect(koppenFamily('Mediterranean (Köppen Csa/Csb)')).toBe('mediterranean')
    expect(koppenFamily('Subarctic (Köppen Dfc)')).toBe('subarctic')
    expect(koppenFamily('Semi-arid continental (Köppen BSk)')).toBe('semi-arid')
  })

  it('returns null rather than guessing when the code is unknown', () => {
    expect(koppenFamily('Temperate')).toBeNull()
    expect(koppenFamily('Something (Köppen Zzz)')).toBeNull()
  })
})

describe('getCityDirectory', () => {
  const groups = getCityDirectory()

  it('lists every catalog city exactly once', () => {
    const listed = groups.flatMap((group) => group.cities.map((city) => city.slug))
    expect(listed.slice().sort()).toEqual(Object.keys(cityData).slice().sort())
    expect(new Set(listed).size).toBe(listed.length)
    expect(listed).toHaveLength(cityDirectoryCount())
  })

  it('leaves no empty group and gives each one a blurb', () => {
    for (const group of groups) {
      expect(group.cities.length).toBeGreaterThan(0)
      expect(group.blurb.length).toBeGreaterThan(40)
    }
  })

  it('sorts cities by name inside a group', () => {
    for (const group of groups) {
      const names = group.cities.map((city) => city.name)
      expect(names).toEqual(names.slice().sort((a, b) => a.localeCompare(b, 'en')))
    }
  })

  it('carries the July and January highs the directory prints', () => {
    for (const group of groups) {
      for (const city of group.cities) {
        if (city.summerHigh === null) continue
        expect(Number.isFinite(city.summerHigh)).toBe(true)
        expect(Number.isFinite(city.winterHigh)).toBe(true)
      }
    }
  })
})

describe('city descriptions are distinct', () => {
  const slugs = Object.keys(cityData)
  const descriptions = slugs.map((slug) =>
    buildCityPageDescription(cityData[slug], slug),
  )

  it('gives every city its own description', () => {
    // Near-identical descriptions across 40-odd pages are what Google treats
    // as a rewrite candidate, so no two may match.
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('keeps every description inside the snippet budget', () => {
    const over = slugs.filter((_, i) => descriptions[i].length > MAX_DESCRIPTION_LENGTH)
    expect(over).toEqual([])
  })

  it('always ends on a complete sentence', () => {
    const truncated = slugs.filter((_, i) => !descriptions[i].endsWith('.'))
    expect(truncated).toEqual([])
  })
})
