/**
 * 16-Bit Weather Platform - News Page Layout
 * SEO metadata for weather news aggregation
 */

import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/utils'

const newsJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Weather News",
  "description": "Multi-source weather news aggregation including earth science and space categories.",
  "url": "https://www.16bitweather.co/news",
  "isPartOf": {
    "@type": "WebSite",
    "name": "16 Bit Weather",
    "url": "https://www.16bitweather.co"
  }
}

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'Weather News: Quakes, Volcanoes & Climate',
  description: 'Live weather news from USGS, NASA and NOAA: earthquakes, volcanic activity, severe weather, space weather and climate updates in one retro terminal feed.',
  keywords: 'weather news, earthquake news, volcano updates, severe weather alerts, climate news, NOAA updates, NASA weather, space weather, natural disasters, weather alerts',
  openGraph: {
    title: 'Weather News Hub - 16 Bit Weather',
    description: 'Real-time weather news from trusted sources including USGS, NASA, and NOAA. Earthquakes, volcanoes, severe weather, and climate updates.',
    url: 'https://www.16bitweather.co/news',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Weather+News&subtitle=Earthquakes+Volcanoes+Climate',
        width: 1200,
        height: 630,
        alt: 'Weather News - 16 Bit Weather Terminal',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weather News Hub - 16 Bit Weather',
    description: 'Real-time weather news from USGS, NASA, and NOAA',
    images: ['/api/og?title=Weather+News&subtitle=Earthquakes+Volcanoes+Climate'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/news',
  },
}

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* JSON-LD must be a <script>; metadata.other renders a <meta> tag that crawlers ignore. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(newsJsonLd) }}
      />
      {children}
    </>
  )
}
