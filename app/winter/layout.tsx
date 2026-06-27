import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winter Weather Alerts - Snow, Ice & Blizzard Warnings | 16 Bit Weather',
  description:
    'Active NWS winter weather alerts: snow, ice, blizzard, freeze, and wind chill warnings. Filtered winter storm outlook for your region in retro terminal style.',
  keywords:
    'winter weather, snow alert, blizzard warning, ice storm, freeze warning, wind chill, NWS winter alerts, winter storm',
  openGraph: {
    title: 'Winter Weather Alerts | 16 Bit Weather',
    description: 'Snow, ice, blizzard, and freeze warnings from the National Weather Service.',
    url: 'https://www.16bitweather.co/winter',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Winter+Weather&subtitle=NWS+Snow+%26+Ice+Alerts',
        width: 1200,
        height: 630,
        alt: 'Winter Weather Alerts - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Winter Weather Alerts | 16 Bit Weather',
    description: 'Snow, ice, blizzard, and freeze warnings from the National Weather Service.',
    images: ['/api/og?title=Winter+Weather&subtitle=NWS+Snow+%26+Ice+Alerts'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/winter',
  },
}

export default function WinterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
