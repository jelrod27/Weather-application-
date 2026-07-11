import type { Metadata } from 'next'

const BASE_URL = 'https://www.16bitweather.co'

/** Cities with the strongest GSC impression volume — climate-focused copy. */
export const PRIORITY_SEO_CITY_SLUGS = [
  'boston-ma',
  'atlanta-ga',
  'pittsburgh-pa',
  'denver-co',
  'virginia-beach-va',
  'chicago-il',
  'miami-fl',
  'new-york-ny',
  'los-angeles-ca',
  'seattle-wa',
] as const

type CityMeta = {
  name: string
  state: string
}

export function buildCityPageTitle(city: CityMeta, citySlug: string): string {
  const label = `${city.name}, ${city.state}`
  if ((PRIORITY_SEO_CITY_SLUGS as readonly string[]).includes(citySlug)) {
    return `${city.name} ${city.state} Climate & Year-Round Weather Guide | 16 Bit Weather`
  }
  return `${label} Climate & Year-Round Weather | 16 Bit Weather`
}

export function buildCityPageDescription(city: CityMeta, citySlug?: string): string {
  if (citySlug === 'boston-ma') {
    return `Boston MA climate and year-round weather guide: monthly averages, nor'easter winters, humid summers, and best time to visit. Live forecast plus New England climate patterns.`
  }
  if (citySlug === 'atlanta-ga') {
    return `Atlanta Georgia climate and summer weather guide: humid subtropical seasons, monthly averages, severe storm risk, and best time to visit. Live forecast included.`
  }
  if (citySlug && (PRIORITY_SEO_CITY_SLUGS as readonly string[]).includes(citySlug)) {
    return `${city.name}, ${city.state} climate averages, monthly weather patterns, and year-round temperature guide. Live forecast, 7-day outlook, and best time to visit.`
  }
  return `${city.name}, ${city.state} climate averages, monthly weather patterns, and best time to visit. Live forecast, 7-day outlook, and year-round temperature data with retro terminal style.`
}

export function buildCityPageKeywords(city: CityMeta): string {
  return [
    `${city.name} weather`,
    `${city.name} ${city.state} weather`,
    `${city.name} climate`,
    `${city.name} ${city.state} climate`,
    `climate in ${city.name}`,
    `climate of ${city.name}`,
    `${city.name} weather year round`,
    `${city.name} weather by month`,
    `${city.name} forecast`,
    `best time to visit ${city.name}`,
    `${city.name} monthly weather`,
    '16 bit weather',
  ].join(', ')
}

export function buildCityPageMetadata(city: CityMeta, citySlug: string): Pick<
  Metadata,
  'title' | 'description' | 'keywords' | 'openGraph' | 'twitter' | 'alternates'
> {
  const pageTitle = buildCityPageTitle(city, citySlug)
  const description = buildCityPageDescription(city, citySlug)
  const ogImage = `/api/og?title=${encodeURIComponent(city.name + ', ' + city.state)}&subtitle=Climate+%26+Weather+Guide`

  return {
    title: pageTitle,
    description,
    keywords: buildCityPageKeywords(city),
    openGraph: {
      title: pageTitle,
      description,
      url: `${BASE_URL}/weather/${citySlug}`,
      siteName: '16 Bit Weather',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${city.name} Climate & Weather - 16 Bit Weather`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${BASE_URL}/weather/${citySlug}`,
    },
  }
}
