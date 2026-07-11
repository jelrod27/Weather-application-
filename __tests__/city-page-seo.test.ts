import {
  buildCityPageDescription,
  buildCityPageMetadata,
  buildCityPageTitle,
  PRIORITY_SEO_CITY_SLUGS,
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
})
