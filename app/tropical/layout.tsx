import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tropical Weather Tracker — Atlantic Satellite & NHC Outlooks | 16 Bit Weather',
  description:
    'Track Atlantic tropical weather with live NHC outlooks, tropical Atlantic satellite imagery, and sea surface temperatures in a retro terminal UI.',
  keywords:
    'tropical weather, Atlantic tropical satellite, tropical Atlantic satellite, NHC outlook, hurricane tracker, tropical storm, satellite imagery, sea surface temperature',
  openGraph: {
    title: 'Tropical Weather Tracker — Atlantic Satellite & NHC | 16 Bit Weather',
    description:
      'Live NHC tropical outlooks, Atlantic basin satellite imagery, and sea surface temperature analysis.',
    url: 'https://www.16bitweather.co/tropical',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Tropical+Weather+Tracker&subtitle=Atlantic+Satellite+%2B+NHC',
        width: 1200,
        height: 630,
        alt: 'Tropical Weather Tracker',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tropical Weather Tracker — Atlantic Satellite & NHC',
    description:
      'Live NHC tropical outlooks, Atlantic satellite imagery, and sea surface temperatures.',
    images: ['/api/og?title=Tropical+Weather+Tracker&subtitle=Atlantic+Satellite+%2B+NHC'],
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
