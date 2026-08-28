import { cityData } from '@/lib/cities'

/** Stable slugs for crawlable internal links — aligned with GSC query demand. */
export const FEATURED_CITY_SLUGS = [
  'boston-ma',
  'atlanta-ga',
  'denver-co',
  'pittsburgh-pa',
  'new-york-ny',
  'chicago-il',
  'los-angeles-ca',
  'houston-tx',
  'phoenix-az',
  'philadelphia-pa',
  'seattle-wa',
  'miami-fl',
] as const

export function getFeaturedCities() {
  return FEATURED_CITY_SLUGS.map((slug) => {
    const city = cityData[slug]
    return {
      slug,
      name: city?.name ?? slug,
      state: city?.state ?? '',
      label: city ? `${city.name}, ${city.state}` : slug,
    }
  })
}
