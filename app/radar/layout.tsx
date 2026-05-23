/**
 * 16-Bit Weather Platform - Radar Page Layout
 * SEO metadata for live animated radar (US NEXRAD + global RainViewer)
 */

import type { Metadata } from 'next'

// Force dynamic rendering to avoid edge function size limits
export const dynamic = 'force-dynamic'

const radarJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Live Weather Radar",
  "description": "Animated US NEXRAD composite radar and global RainViewer precipitation overlays.",
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
  title: 'Live Weather Radar Map - NEXRAD + RainViewer | 16 Bit Weather',
  description: 'Animated US NEXRAD composite radar with 4-hour playback and live refresh. Global precipitation via RainViewer outside the US. Storm-watch controls in retro terminal style.',
  keywords: 'weather radar, NEXRAD radar, live radar, precipitation map, rain radar, storm tracker, doppler radar, US weather radar, RainViewer, real-time radar',
  openGraph: {
    title: 'Live Weather Radar - 16 Bit Weather',
    description: 'Animated US NEXRAD composite radar with 4-hour playback. Global RainViewer coverage outside the US.',
    url: 'https://www.16bitweather.co/radar',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Live+Weather+Radar&subtitle=NEXRAD+%2B+RainViewer',
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
    description: 'Animated US NEXRAD composite radar with global RainViewer coverage',
    images: ['/api/og?title=Live+Weather+Radar&subtitle=NEXRAD+%2B+RainViewer'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/radar',
  },
  other: {
    'application/ld+json': JSON.stringify(radarJsonLd),
  },
}

export default function RadarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
