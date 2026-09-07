import type { Metadata } from 'next'

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'Travel Weather & Interstate Corridors',
  description: 'Travel weather forecasts with interstate corridor conditions. Plan your route with driving hazard maps and WPC daily outlooks.',
  keywords: 'travel weather, interstate weather, driving conditions, corridor forecast, road weather, WPC outlook',
  openGraph: {
    title: 'Travel Weather',
    description: 'Interstate corridor forecasts and driving condition maps.',
    url: 'https://www.16bitweather.co/travel',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Travel+Weather&subtitle=Interstate+Corridor+Forecasts',
        width: 1200,
        height: 630,
        alt: 'Travel Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Travel Weather',
    description: 'Interstate corridor forecasts and driving condition maps.',
    images: ['/api/og?title=Travel+Weather&subtitle=Interstate+Corridor+Forecasts'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/travel',
  },
}

export default function TravelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* The corridor map draws Carto basemap tiles; preconnect here, not site-wide. */}
      <link rel="preconnect" href="https://a.basemaps.cartocdn.com" />
      <link rel="preconnect" href="https://b.basemaps.cartocdn.com" />
      {children}
    </>
  )
}
