import type { Metadata } from 'next'

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'Weather Education Hub: Learn Meteorology',
  description: 'Learn meteorology with interactive lessons on weather systems, cloud types, weather phenomena, and extreme weather. Free educational resources.',
  keywords: 'weather education, learn meteorology, cloud types, weather systems, weather phenomena, weather science',
  openGraph: {
    title: 'Weather Education Hub',
    description: 'Interactive meteorology lessons and weather science resources.',
    url: 'https://www.16bitweather.co/education',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Weather+Education+Hub&subtitle=Learn+Meteorology',
        width: 1200,
        height: 630,
        alt: 'Weather Education Hub',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weather Education Hub',
    description: 'Interactive meteorology lessons and weather science resources.',
    images: ['/api/og?title=Weather+Education+Hub&subtitle=Learn+Meteorology'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/education',
  },
}

export default function EducationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
