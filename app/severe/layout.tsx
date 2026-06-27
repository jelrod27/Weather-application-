import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Severe Weather Outlook — SPC Maps & Active NWS Alerts | 16 Bit Weather',
  description:
    'Live NOAA SPC convective outlook maps and filtered NWS severe thunderstorm, tornado, hail, and flood warnings. Retro terminal UI, auto-refreshing every 5 minutes.',
  keywords: 'severe weather, SPC outlook, NWS alerts, tornado warning, thunderstorm, convective outlook, weather alerts',
  openGraph: {
    title: 'Severe Weather Outlook | 16 Bit Weather',
    description:
      'Live SPC convective outlook maps and filtered NWS severe thunderstorm, tornado, hail, and flood warnings.',
    url: 'https://www.16bitweather.co/severe',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Severe+Weather+Outlook&subtitle=SPC+Outlooks+%2B+NWS+Alerts',
        width: 1200,
        height: 630,
        alt: 'Severe Weather Outlook',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Severe Weather Outlook | 16 Bit Weather',
    description:
      'Live SPC convective outlook maps and filtered NWS severe weather warnings.',
    images: ['/api/og?title=Severe+Weather+Outlook&subtitle=SPC+Outlooks+%2B+NWS+Alerts'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/severe',
  },
}

export default function SevereLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
