/**
 * 16-Bit Weather Platform - Weather Systems Layout
 * SEO metadata for weather systems educational content
 */

import type { Metadata } from 'next'
import { weatherSystemsDatabase } from '@/data/weather-systems'
import { getEducationDetailHref, systemSlug } from '@/lib/education/entries'
import { safeJsonLd } from '@/lib/utils'

const BASE_URL = 'https://www.16bitweather.co'
const PAGE_URL = `${BASE_URL}/weather-systems`
const SYSTEM_COUNT = weatherSystemsDatabase.length
const OG_IMAGE = `/api/og?title=Weather+Systems&subtitle=${SYSTEM_COUNT}+Storm+Types+Explained`
const DESCRIPTION = `Guide to ${SYSTEM_COUNT} weather systems: cyclones, anticyclones, warm, cold and occluded fronts, jet streams, hurricanes and tornadoes, and the weather each brings.`

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: `Weather Systems: ${SYSTEM_COUNT} Storm Types Explained`,
  description: DESCRIPTION,
  keywords: 'weather systems, cyclones, anticyclones, cold front, warm front, hurricanes, tornadoes, storm types, atmospheric pressure, meteorology education, weather patterns, low pressure system, high pressure system',
  openGraph: {
    title: 'Weather Systems Database - 16 Bit Weather',
    description: `Comprehensive guide to ${SYSTEM_COUNT} major weather systems. Learn about cyclones, fronts, hurricanes, and more.`,
    url: PAGE_URL,
    siteName: '16 Bit Weather',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Weather Systems Guide - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weather Systems Database - 16 Bit Weather',
    description: `Guide to ${SYSTEM_COUNT} major weather systems with formation and behavior data`,
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

// A listing page is a CollectionPage; the Guides themselves carry Article markup.
const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: `Weather Systems Guide - ${SYSTEM_COUNT} Storm Types Explained`,
  description: DESCRIPTION,
  url: PAGE_URL,
  isPartOf: { '@type': 'WebSite', name: '16 Bit Weather', url: BASE_URL },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/education` },
      { '@type': 'ListItem', position: 3, name: 'Weather Systems', item: PAGE_URL },
    ],
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: SYSTEM_COUNT,
    itemListElement: weatherSystemsDatabase.map((system, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: system.name,
      url: `${BASE_URL}${getEducationDetailHref('weather-system', systemSlug(system))}`,
    })),
  },
}

export default function WeatherSystemsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }}
      />
      {children}
    </>
  )
}
