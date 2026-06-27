/**
 * Unit tests for weather/[city]/page.tsx metadata generation.
 */

import { generateMetadata } from '@/app/weather/[city]/page'
import { cityData } from '@/lib/city-metadata'

describe('weather/[city]/page generateMetadata', () => {
  const makeParams = (city: string) => Promise.resolve({ city })

  it('returns rich metadata for predefined catalog cities', async () => {
    const slug = Object.keys(cityData)[0]
    const city = cityData[slug]
    const metadata = await generateMetadata({ params: makeParams(slug) })

    expect(metadata.title).toContain(city.name)
    expect(metadata.title).toContain(city.state)
    expect(metadata.description).toContain(city.name)
    expect(metadata.alternates?.canonical).toBe(`https://www.16bitweather.co/weather/${slug}`)
    expect(metadata.openGraph?.images).toBeDefined()
    expect(metadata.twitter?.card).toBe('summary_large_image')
  })

  it('noindexes unknown city slugs with a canonical URL', async () => {
    const metadata = await generateMetadata({ params: makeParams('not-a-catalog-city') })

    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect(metadata.alternates?.canonical).toBe(
      'https://www.16bitweather.co/weather/not-a-catalog-city',
    )
  })

  it('uses 16bitweather.co URLs and dynamic OG images in metadata', async () => {
    const metadata = await generateMetadata({ params: makeParams('denver-co') })
    const metaStr = JSON.stringify(metadata)

    expect(metaStr).not.toContain('16-bit-weather.vercel.app')
    expect(metaStr).not.toContain('og-image.png')
    expect(metaStr).toContain('/api/og?')
  })
})
