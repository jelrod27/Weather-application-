/**
 * Weather Glossary Layout — SEO for /education/glossary
 */

import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/utils'
import FeaturedCityLinks from '@/components/featured-city-links'

const GLOSSARY_URL = 'https://www.16bitweather.co/education/glossary'

export const metadata: Metadata = {
  title: 'Weather Glossary - Metric Definitions | 16 Bit Weather',
  description:
    'Understand every weather metric: UV Index, humidity, barometric pressure, wind, visibility, feels like temperature, precipitation, pollen, and more. In-depth definitions with practical tips.',
  keywords:
    'weather glossary, UV index explained, humidity definition, barometric pressure meaning, wind speed, visibility weather, feels like temperature, precipitation measurement, pollen count, weather terms, meteorology glossary',
  openGraph: {
    title: 'Weather Glossary - 16 Bit Weather',
    description:
      'In-depth definitions of every weather metric. UV Index, humidity, pressure, wind, and more explained with practical tips.',
    url: GLOSSARY_URL,
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Weather+Glossary&subtitle=Metric+Definitions',
        width: 1200,
        height: 630,
        alt: 'Weather Glossary - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weather Glossary - 16 Bit Weather',
    description: 'In-depth definitions of every weather metric with practical tips',
    images: ['/api/og?title=Weather+Glossary&subtitle=Metric+Definitions'],
  },
  alternates: {
    canonical: GLOSSARY_URL,
  },
}

const glossarySchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Education',
          item: 'https://www.16bitweather.co/education',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Weather Glossary',
          item: GLOSSARY_URL,
        },
      ],
    },
    {
      '@type': 'DefinedTermSet',
      name: 'Weather Metric Glossary',
      description: 'Comprehensive definitions of weather measurements and metrics',
      url: GLOSSARY_URL,
      hasDefinedTerm: [
        { '@type': 'DefinedTerm', name: 'UV Index', description: 'Measures ultraviolet radiation strength from the sun' },
        { '@type': 'DefinedTerm', name: 'Humidity', description: 'Amount of water vapor present in the air' },
        { '@type': 'DefinedTerm', name: 'Barometric Pressure', description: 'Weight of the atmosphere pressing down on Earth' },
        { '@type': 'DefinedTerm', name: 'Wind', description: 'Movement of air from high to low pressure areas' },
        { '@type': 'DefinedTerm', name: 'Visibility', description: 'Maximum distance objects can be clearly seen' },
        { '@type': 'DefinedTerm', name: 'Feels Like', description: 'Apparent temperature accounting for wind and humidity' },
        { '@type': 'DefinedTerm', name: 'Precipitation', description: 'Total rainfall and snowfall measurement' },
        { '@type': 'DefinedTerm', name: 'Pollen Count', description: 'Concentration of airborne pollen grains' },
        { '@type': 'DefinedTerm', name: 'Sun Times', description: 'Sunrise and sunset times for a location' },
        { '@type': 'DefinedTerm', name: 'Moon Phase', description: 'Current shape of the moon illuminated portion' },
      ],
    },
    {
      '@type': 'WebPage',
      name: 'Weather Glossary - Metric Definitions',
      url: GLOSSARY_URL,
      description: 'In-depth definitions of weather metrics with practical tips',
      isPartOf: { '@id': 'https://www.16bitweather.co/#website' },
      about: { '@type': 'DefinedTermSet', url: GLOSSARY_URL },
    },
  ],
}

export default function EducationGlossaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(glossarySchema) }}
      />
      {children}
      <FeaturedCityLinks
        title="See metrics in context — city forecasts"
        limit={8}
      />
    </>
  )
}
