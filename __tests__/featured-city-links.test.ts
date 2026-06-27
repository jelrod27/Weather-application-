import { FEATURED_CITY_SLUGS, getFeaturedCities } from '@/lib/featured-city-links'

describe('featured city links', () => {
  it('includes GSC-demand cities with metadata', () => {
    const slugs = getFeaturedCities().map((c) => c.slug)
    expect(slugs).toEqual([...FEATURED_CITY_SLUGS])
    expect(slugs).toContain('boston-ma')
    expect(slugs).toContain('denver-co')
    expect(slugs).toContain('atlanta-ga')
  })

  it('provides human-readable labels for footer links', () => {
    const boston = getFeaturedCities().find((c) => c.slug === 'boston-ma')
    expect(boston?.label).toBe('Boston, MA')
  })
})
