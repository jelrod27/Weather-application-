/**
 * 16-Bit Weather Platform - Learn Hub Layout
 * SEO metadata for weather education hub
 */

import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Learn Weather - Educational Hub | 16 Bit Weather',
  description: 'Master meteorology with our comprehensive weather education hub. Learn about clouds, weather systems, global extremes, and atmospheric science with interactive 16-bit visualizations.',
  keywords: 'learn weather, weather education, meteorology basics, understand weather, cloud types, weather systems, atmospheric science, weather learning, climate education, weather for beginners',
  openGraph: {
    title: 'Weather Education Hub - 16 Bit Weather',
    description: 'Master meteorology with our comprehensive weather education hub. Interactive learning with retro aesthetics.',
    url: 'https://www.16bitweather.co/education',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Learn+Weather&subtitle=Educational+Hub',
        width: 1200,
        height: 630,
        alt: 'Weather Education Hub - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weather Education Hub - 16 Bit Weather',
    description: 'Master meteorology with interactive weather education',
    images: ['/api/og?title=Learn+Weather&subtitle=Educational+Hub'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/education',
  },
}

// ItemList Schema for Learning Hub
const learnSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Weather Education Topics',
  description: 'Comprehensive weather education resources',
  url: 'https://www.16bitweather.co/education',
  numberOfItems: 7,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Cloud Atlas',
      description: 'Master 10 distinct cloud formations',
      url: 'https://www.16bitweather.co/cloud-types',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Weather Systems',
      description: 'Analyze 16 major storm types',
      url: 'https://www.16bitweather.co/weather-systems',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Global Extremes',
      description: 'Track hottest and coldest places on Earth',
      url: 'https://www.16bitweather.co/extremes',
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: 'Weather Fun Facts',
      description: 'Rare atmospheric phenomena explained',
      url: 'https://www.16bitweather.co/fun-facts',
    },
    {
      '@type': 'ListItem',
      position: 5,
      name: 'Radar & Models',
      description: 'Professional-grade NEXRAD radar and GFS models',
      url: 'https://www.16bitweather.co/radar',
    },
    {
      '@type': 'ListItem',
      position: 6,
      name: 'Weather Glossary',
      description: 'In-depth definitions of every weather metric',
      url: 'https://www.16bitweather.co/education/glossary',
    },
  ],
}

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(learnSchema) }}
      />
      {children}
    </>
  )
}
