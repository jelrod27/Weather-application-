/**
 * City Weather Page - Server Component
 *
 * Live weather renders first; climate/SEO content follows below the fold.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'

import { safeJsonLd } from '@/lib/utils'
import CityWeatherClient from './client'
import CityClimateGuide from '@/components/city/city-climate-guide'
import {
  cityData as cityMetadata,
  getCityEnrichment,
  getNearbyCities,
} from '@/lib/cities'
import { slugToDisplayName, slugToSearchTerm } from '@/lib/city-slug'
import { buildCityPageMetadata } from '@/lib/seo/city-page-seo'

const BASE_URL = 'https://www.16bitweather.co'

export async function generateStaticParams(): Promise<Array<{ city: string }>> {
  return Object.keys(cityMetadata).map(citySlug => ({ city: citySlug }))
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = cityMetadata[citySlug]

  if (!city) {
    const displayName = slugToDisplayName(citySlug)
    return {
      title: `${displayName} Weather Forecast | 16 Bit Weather`,
      description: `Live weather conditions and forecast for ${displayName}.`,
      robots: { index: false, follow: true },
      alternates: { canonical: `${BASE_URL}/weather/${citySlug}` },
    }
  }

  return buildCityPageMetadata(city, citySlug)
}

interface PageParams {
  params: Promise<{ city: string }>
}

export default async function CityWeatherPage({ params }: PageParams) {
  const { city: citySlug } = await params
  const city = cityMetadata[citySlug]

  const cityInfo = city || {
    name: slugToDisplayName(citySlug),
    state: '',
    searchTerm: slugToSearchTerm(citySlug),
    title: `${slugToDisplayName(citySlug)} Weather Forecast - 16 Bit Weather`,
    description: `Current weather conditions and 7-day forecast for ${slugToDisplayName(citySlug)}.`,
    content: {
      intro: `Weather information for ${slugToDisplayName(citySlug)}.`,
      climate: 'Real-time weather data and forecasts available.',
      patterns: 'Check current conditions and extended forecasts.',
    },
  }

  const isPredefinedCity = !!city
  const enrichment = isPredefinedCity ? getCityEnrichment(citySlug) : null
  const nearbyCities = isPredefinedCity ? getNearbyCities(citySlug) : []
  const fullLocation = cityInfo.state ? `${cityInfo.name}, ${cityInfo.state}` : cityInfo.name

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${fullLocation} Climate & Year-Round Weather Guide`,
    description: `${fullLocation} climate averages, monthly weather patterns, and best time to visit.`,
    url: `${BASE_URL}/weather/${citySlug}`,
    about: {
      '@type': 'Place',
      name: fullLocation,
      address: {
        '@type': 'PostalAddress',
        addressLocality: cityInfo.name,
        addressRegion: cityInfo.state || undefined,
        addressCountry: 'US',
      },
    },
    mainEntity: {
      '@type': 'WeatherForecast',
      location: { '@type': 'Place', name: fullLocation },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: fullLocation, item: `${BASE_URL}/weather/${citySlug}` },
      ],
    },
  }

  const faqJsonLd = enrichment?.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: enrichment.faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }
    : null

  const climateGuide = isPredefinedCity ? (
    <CityClimateGuide
      fullLocation={fullLocation}
      cityName={cityInfo.name}
      content={cityInfo.content}
      enrichment={enrichment}
      nearbyCities={nearbyCities}
    />
  ) : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      ) : null}

      <Suspense
        fallback={
          <div className="min-h-[400px] bg-gradient-to-b from-gray-900 to-black">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center text-white">Loading live weather data...</div>
            </div>
          </div>
        }
      >
        <CityWeatherClient
          city={cityInfo}
          citySlug={citySlug}
          climateGuide={climateGuide}
        />
      </Suspense>
    </>
  )
}

export const revalidate = 600
