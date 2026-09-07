import {
  buildCityPageDescription,
  buildCityPageMetadata,
  buildCityPageTitle,
  PRIORITY_SEO_CITY_SLUGS,
  resolveCitySlugAlias,
} from '@/lib/seo/city-page-seo'

describe('city-page-seo', () => {
  const boston = { name: 'Boston', state: 'MA' }

  it('uses climate-focused titles for priority GSC cities', () => {
    const title = buildCityPageTitle(boston, 'boston-ma')
    expect(title).toContain('Climate')
    expect(title).toContain('Year-Round Weather')
    expect(title).toContain('Boston MA')
  })

  it('includes climate and year-round language in descriptions', () => {
    const description = buildCityPageDescription(boston, 'boston-ma')
    expect(description).toContain('Boston MA climate')
    expect(description).toContain('year-round')
    expect(description).toContain('best time to visit')
  })

  it('builds metadata with canonical www URL and OG image', () => {
    const metadata = buildCityPageMetadata(boston, 'boston-ma')
    expect(metadata.alternates?.canonical).toBe('https://www.16bitweather.co/weather/boston-ma')
    expect(JSON.stringify(metadata.openGraph?.images)).toContain('/api/og?')
    expect(metadata.keywords).toContain('Boston climate')
    expect(metadata.keywords).toContain('climate in Boston')
    expect(metadata.description).toContain("nor'easter")
  })

  it('lists ten priority city slugs from GSC traffic', () => {
    expect(PRIORITY_SEO_CITY_SLUGS).toHaveLength(10)
    expect(PRIORITY_SEO_CITY_SLUGS).toContain('boston-ma')
    expect(PRIORITY_SEO_CITY_SLUGS).toContain('pittsburgh-pa')
  })

  it('does not sell retro styling in city descriptions', () => {
    const description = buildCityPageDescription({ name: 'Boise', state: 'ID' }, 'boise-id')
    expect(description.toLowerCase()).not.toContain('retro terminal')
  })
})

describe('resolveCitySlugAlias', () => {
  const catalog = ['new-york-ny', 'boston-ma', 'portland-or', 'portland-me']

  it('resolves a bare city name to its canonical slug', () => {
    expect(resolveCitySlugAlias('new-york', catalog)).toBe('new-york-ny')
    expect(resolveCitySlugAlias('boston', catalog)).toBe('boston-ma')
  })

  it('leaves a canonical slug alone', () => {
    expect(resolveCitySlugAlias('boston-ma', catalog)).toBeNull()
  })

  it('refuses to guess when a name spans two states', () => {
    expect(resolveCitySlugAlias('portland', catalog)).toBeNull()
  })

  it('leaves a slug with no catalog match alone', () => {
    expect(resolveCitySlugAlias('notacity-xyz', catalog)).toBeNull()
  })
})
