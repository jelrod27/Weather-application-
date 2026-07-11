import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Space Weather Monitor — Solar Flare Tracker & Live Kp Index | 16 Bit Weather',
  description:
    'Free space weather monitor and solar flare tracker. Live Kp index, solar wind, geomagnetic storm alerts, sunspots, X-ray flux, and aurora forecast from NOAA SWPC.',
  keywords:
    'space weather monitor, solar flare monitor, space weather tracker, solar flare tracker, Kp index live, solar activity today, solar wind, geomagnetic storm tracker, aurora forecast, solar storm monitor',
  openGraph: {
    title: 'Space Weather Monitor — Solar Flare Tracker & Kp Index',
    description:
      'Live solar flare monitor with Kp index, solar wind, geomagnetic storm alerts, and aurora forecast.',
    url: 'https://www.16bitweather.co/space-weather',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Space+Weather+Monitor&subtitle=Solar+Flare+Tracker+%2B+Live+Kp',
        width: 1200,
        height: 630,
        alt: 'Space Weather Monitor',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Weather Monitor — Solar Flare Tracker & Kp Index',
    description:
      'Live solar flare monitor with Kp index, solar wind, and aurora forecast.',
    images: ['/api/og?title=Space+Weather+Monitor&subtitle=Solar+Flare+Tracker+%2B+Live+Kp'],
  },
  alternates: { canonical: 'https://www.16bitweather.co/space-weather' },
}

export default function SpaceWeatherLayout({ children }: { children: React.ReactNode }) {
  return children
}
