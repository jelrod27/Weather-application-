import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tropical Tracker — NHC Outlooks & Atlantic Satellite | 16 Bit Weather',
  description:
    'Live NHC tropical weather outlooks, Atlantic basin satellite imagery, and sea surface temperatures — hurricane season tracking in a retro terminal UI.',
  keywords: 'tropical weather, NHC outlook, hurricane tracker, tropical storm, satellite imagery, sea surface temperature',
  openGraph: {
    title: 'Tropical Tracker | 16 Bit Weather',
    description:
      'Live NHC tropical outlooks, Atlantic satellite imagery, and sea surface temperature analysis.',
    url: 'https://www.16bitweather.co/tropical',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Tropical+Weather&subtitle=NHC+Outlook+%2B+Satellite',
        width: 1200,
        height: 630,
        alt: 'Tropical Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tropical Tracker | 16 Bit Weather',
    description:
      'Live NHC tropical outlooks, Atlantic satellite imagery, and sea surface temperatures.',
    images: ['/api/og?title=Tropical+Weather&subtitle=NHC+Outlook+%2B+Satellite'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/tropical',
  },
}

export default function TropicalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
