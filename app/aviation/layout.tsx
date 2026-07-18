import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Flight Tracker & Aviation Weather | 16 Bit Weather',
  description:
    'ADS-B live flight tracker with callsign search, route weather briefs, SIGMETs, AIRMETs, and turbulence maps. Educational only — not for operational dispatch.',
  keywords:
    'live flight tracker, ADS-B, aviation weather, SIGMET, AIRMET, turbulence, flight conditions, callsign search',
  openGraph: {
    title: 'Live Flight Tracker & Aviation Weather',
    description: 'ADS-B sky map, callsign search, and NOAA route weather briefs.',
    url: 'https://www.16bitweather.co/aviation',
    siteName: '16 Bit Weather',
    images: [{ url: '/api/og?title=Live+Flight+Tracker&subtitle=ADS-B+%2B+Aviation+Weather', width: 1200, height: 630, alt: 'Live Flight Tracker' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Flight Tracker & Aviation Weather',
    description: 'ADS-B sky map, callsign search, and NOAA route weather briefs.',
    images: ['/api/og?title=Live+Flight+Tracker&subtitle=ADS-B+%2B+Aviation+Weather'],
  },
  alternates: { canonical: 'https://www.16bitweather.co/aviation' },
}

export default function AviationLayout({ children }: { children: React.ReactNode }) {
  return children
}
