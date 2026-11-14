import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Winter Forecast: Snow, Ice & Storm Impacts',
  description: 'Explore NWS snow and ice probabilities, winter impacts, local 72-hour forecasts, hourly conditions and winter alerts across the contiguous United States.',
  keywords: 'winter forecast, snow forecast, ice forecast, WPC snow probability, winter storm impacts, NWS local forecast, winter weather alerts',
  openGraph: {
    title: 'Winter Forecast: Snow, Ice & Storm Impacts',
    description: 'Official snow and ice probabilities, winter impacts, local forecasts and alerts for the contiguous United States.',
    url: 'https://www.16bitweather.co/winter',
    siteName: '16 Bit Weather',
    images: [{ url: '/api/og?title=Winter+Forecast&subtitle=Snow+%26+Ice+%C2%B7+NWS+%2F+WPC', width: 1200, height: 630, alt: 'Winter Forecast - 16 Bit Weather' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Winter Forecast: Snow, Ice & Storm Impacts',
    description: 'Official snow and ice probabilities, winter impacts, local forecasts and alerts for the contiguous United States.',
    images: ['/api/og?title=Winter+Forecast&subtitle=Snow+%26+Ice+%C2%B7+NWS+%2F+WPC'],
  },
  alternates: { canonical: 'https://www.16bitweather.co/winter' },
}

export default function WinterLayout({ children }: { children: ReactNode }): ReactNode {
  return children
}
