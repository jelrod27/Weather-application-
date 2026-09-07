import type { Metadata } from 'next'

import { getCityEnrichment } from '@/lib/cities'
import { clampDescription, MAX_DESCRIPTION_LENGTH } from '@/lib/seo/clamp-description'
import { koppenFamily } from '@/lib/seo/city-directory'

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

/**
 * Canonical slug for a bare city name, e.g. `new-york` → `new-york-ny`.
 *
 * The catalog keys carry a state suffix, so a visitor or link that drops it
 * would otherwise land on the noindex fallback page — a duplicate of the real
 * city page. Only unambiguous names resolve: `portland` matches two states and
 * stays unresolved, because guessing one would send readers to the wrong coast.
 */
export function resolveCitySlugAlias(
  slug: string,
  catalogSlugs: readonly string[],
): string | null {
  if (catalogSlugs.includes(slug)) return null

  const matches = catalogSlugs.filter((candidate) => {
    const withoutState = candidate.replace(/-[a-z]{2}$/, '')
    return withoutState === slug
  })

  return matches.length === 1 ? matches[0] : null
}

/**
 * The root layout's title template appends " | 16 Bit Weather" (17 chars), so
 * the page part stays at or under 43 characters: long city names drop the
 * state abbreviation rather than push the whole title past 60.
 */
export function buildCityPageTitle(city: CityMeta, citySlug: string): string {
  const label = city.name.length <= 10 ? `${city.name} ${city.state}` : city.name
  if ((PRIORITY_SEO_CITY_SLUGS as readonly string[]).includes(citySlug)) {
    return `${label} Climate & Year-Round Weather`
  }
  return `${city.name}, ${city.state} Climate & Weather Guide`
}

export function buildCityPageDescription(city: CityMeta, citySlug?: string): string {
  if (citySlug === 'boston-ma') {
    return `Boston MA climate and year-round weather guide: monthly averages, nor'easter winters, humid summers, and best time to visit, plus a live forecast.`
  }
  if (citySlug === 'atlanta-ga') {
    return `Atlanta Georgia climate and summer weather guide: humid subtropical seasons, monthly averages, severe storm risk, best time to visit, and a live forecast.`
  }
  // Everything below is built from the city's own climate record, so no two
  // cities share a description and none can drift from the page it describes.
  // Google treats 40-odd near-identical descriptions as a rewrite candidate.
  const enrichment = citySlug ? getCityEnrichment(citySlug) : null
  if (enrichment) {
    const family = koppenFamily(enrichment.climateType)
    const highs = enrichment.monthlyHighs
    const hasMonthly = Array.isArray(highs) && highs.length === 12
    if (family && hasMonthly) {
      const opening = `${city.name}, ${city.state} climate guide: ${family}, with July highs near ${highs[6]}°F and January highs near ${highs[0]}°F.`
      // Longest closing that still fits. Without this the clamp would drop the
      // sentence outright on the longest city-and-family combinations, so some
      // cities would silently lose it while their neighbours kept it.
      const closings = [
        'Monthly averages, best time to visit, live forecast.',
        'Monthly averages and a live forecast.',
        'Live forecast included.',
      ]
      const closing = closings.find(
        (candidate) => `${opening} ${candidate}`.length <= MAX_DESCRIPTION_LENGTH,
      )
      return closing ? `${opening} ${closing}` : clampDescription(opening)
    }
  }

  return `${city.name}, ${city.state} climate averages, monthly weather patterns, and best time to visit. Live forecast, 7-day outlook, and year-round temperature data.`
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
