import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WeatherSystemDetail from '@/components/education/weather-system-detail'
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

  const url = `https://www.16bitweather.co${getEducationDetailHref('weather-system', slug)}`
  const title = `${system.name} — Weather Systems Guide`
  const description = guideDescription(system)

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
          url: `/api/og?title=${encodeURIComponent(system.name)}&subtitle=${encodeURIComponent('Weather Systems Guide')}`,
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
        `/api/og?title=${encodeURIComponent(system.name)}&subtitle=${encodeURIComponent('Weather Systems Guide')}`,
      ],
    },
  }
}

export default async function WeatherSystemDetailPage({ params }: PageProps) {
  const { slug } = await params
  const system = getWeatherSystemBySlug(slug)
  if (!system) notFound()

  const url = `https://www.16bitweather.co${getEducationDetailHref('weather-system', slug)}`
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${system.name} — Weather Systems Guide`,
    description: guideDescription(system),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: '16 Bit Weather', url: 'https://www.16bitweather.co' },
    publisher: { '@type': 'Organization', name: '16 Bit Weather', url: 'https://www.16bitweather.co' },
    about: { '@type': 'Thing', name: system.name },
    keywords: system.classification,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }}
      />
      <WeatherSystemDetail system={system} />
    </>
  )
}
