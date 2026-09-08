/**
 * 16-Bit Weather Platform - Radar Page Layout
 * SEO metadata for North America weather radar
 */

import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/utils'

// Force dynamic rendering to avoid edge function size limits
export const dynamic = 'force-dynamic'

const radarJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Live Weather Radar",
  "description": "Global weather radar with animated precipitation and severe weather overlays.",
  "url": "https://www.16bitweather.co/radar",
  "applicationCategory": "WeatherApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'Live Weather Radar Map',
  description: 'Animated global precipitation radar from RainViewer with NWS alerts, SPC outlooks, and storm report overlays.',
  keywords: 'weather radar, RainViewer radar, live radar, precipitation map, rain radar, storm tracker, severe weather radar, global radar',
  openGraph: {
    title: 'Live Weather Radar - 16 Bit Weather',
    description: 'Animated global precipitation radar with severe weather overlays.',
    url: 'https://www.16bitweather.co/radar',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Live+Weather+Radar&subtitle=North+America+Radar+And+Alerts',
        width: 1200,
        height: 630,
        alt: 'Live Weather Radar - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Weather Radar - 16 Bit Weather',
    description: 'Animated global radar with severe weather overlays',
    images: ['/api/og?title=Live+Weather+Radar&subtitle=North+America+Radar+And+Alerts'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/radar',
  },
}

export default function RadarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* JSON-LD must be a <script>; metadata.other renders a <meta> tag that crawlers ignore. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(radarJsonLd) }}
      />
      {/* Only the radar map pulls Carto basemap tiles and RainViewer composite frames. */}
      <link rel="preconnect" href="https://a.basemaps.cartocdn.com" />
      <link rel="preconnect" href="https://b.basemaps.cartocdn.com" />
      <link rel="dns-prefetch" href="https://c.basemaps.cartocdn.com" />
      <link rel="dns-prefetch" href="https://d.basemaps.cartocdn.com" />
      <link rel="preconnect" href="https://tilecache.rainviewer.com" />
      {children}
    </>
  )
}
