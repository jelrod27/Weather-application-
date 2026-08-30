import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WeatherSystemDetail from '@/components/education/weather-system-detail'
import WeatherSystemGuide from '@/components/education/weather-system-guide'
import { getGuideContent } from '@/lib/education/content'
import {
  getAllWeatherSystemSlugs,
  getEducationDetailHref,
  getWeatherSystemBySlug,
} from '@/lib/education/entries'
import { safeJsonLd } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllWeatherSystemSlugs().map((slug) => ({ slug }))
}

function guideDescription(system: NonNullable<ReturnType<typeof getWeatherSystemBySlug>>): string {
  return system.formationProcess.slice(0, 160)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const system = getWeatherSystemBySlug(slug)
  if (!system) return { title: 'Weather System Not Found' }

  const guide = getGuideContent('weather-system', slug)
  const url = `https://www.16bitweather.co${getEducationDetailHref('weather-system', slug)}`
  const title = `${guide?.title ?? system.name} — Weather Systems Guide`
  // A Guide summary is written to be read in a search result; formationProcess
  // is a data field truncated at 160 characters.
  const description = guide?.summary ?? guideDescription(system)

  return {
    title: `${title} | 16 Bit Weather`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(guide?.title ?? system.name)}&subtitle=${encodeURIComponent('Weather Systems Guide')}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        `/api/og?title=${encodeURIComponent(guide?.title ?? system.name)}&subtitle=${encodeURIComponent('Weather Systems Guide')}`,
      ],
    },
  }
}

export default async function WeatherSystemDetailPage({ params }: PageProps) {
  const { slug } = await params
  const system = getWeatherSystemBySlug(slug)
  if (!system) notFound()

  const guide = getGuideContent('weather-system', slug)
  const url = `https://www.16bitweather.co${getEducationDetailHref('weather-system', slug)}`
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${guide?.title ?? system.name} — Weather Systems Guide`,
    description: guide?.summary ?? guideDescription(system),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: '16 Bit Weather', url: 'https://www.16bitweather.co' },
    publisher: { '@type': 'Organization', name: '16 Bit Weather', url: 'https://www.16bitweather.co' },
    about: { '@type': 'Thing', name: guide?.title ?? system.name },
    keywords: system.classification,
    ...(guide ? { citation: guide.sources.map((source) => source.url) } : {}),
    ...(guide?.reviewed ? { dateModified: guide.reviewed } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }}
      />
      {guide ? (
        <WeatherSystemGuide system={system} guide={guide} />
      ) : (
        <WeatherSystemDetail system={system} />
      )}
    </>
  )
}
