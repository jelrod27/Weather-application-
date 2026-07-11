import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aviation Weather SIGMETs, Turbulence & Flight Conditions | 16 Bit Weather',
  description:
    'Aviation weather briefing with SIGMETs, AIRMETs, turbulence maps, and real-time flight conditions. Educational terminal-style weather for pilots and enthusiasts.',
  keywords:
    'aviation weather, aviation weather SIGMET, SIGMET, AIRMET, turbulence, flight conditions, pilot weather, aviation alerts',
  openGraph: {
    title: 'Aviation Weather — SIGMETs & Flight Conditions',
    description: 'SIGMETs, turbulence maps, and real-time flight conditions.',
    url: 'https://www.16bitweather.co/aviation',
    siteName: '16 Bit Weather',
    images: [{ url: '/api/og?title=Aviation+Weather&subtitle=SIGMETs+%2B+Flight+Conditions', width: 1200, height: 630, alt: 'Aviation Weather' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aviation Weather — SIGMETs & Flight Conditions',
    description: 'SIGMETs, turbulence maps, and real-time flight conditions.',
    images: ['/api/og?title=Aviation+Weather&subtitle=SIGMETs+%2B+Flight+Conditions'],
  },
  alternates: { canonical: 'https://www.16bitweather.co/aviation' },
}

export default function AviationLayout({ children }: { children: React.ReactNode }) {
  return children
}
