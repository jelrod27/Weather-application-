import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import RelatedGuides from '@/components/education/related-guides'
import WeatherSystemDetail from '@/components/education/weather-system-detail'
import WeatherSystemGuide from '@/components/education/weather-system-guide'
import { getGuideContent } from '@/lib/education/content'
import { getAllWeatherSystemSlugs, getWeatherSystemBySlug } from '@/lib/education/entries'
import { buildGuideJsonLd, buildGuideMetadata, type GuideSeoInput } from '@/lib/education/guide-seo'
import { safeJsonLd } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllWeatherSystemSlugs().map((slug) => ({ slug }))
}

function seoInput(
  slug: string,
  system: NonNullable<ReturnType<typeof getWeatherSystemBySlug>>,
): GuideSeoInput {
  return {
    kind: 'weather-system',
    slug,
    name: system.name,
    // A Guide summary is written to be read in a search result; formationProcess
    // is a data field truncated at 160 characters.
    fallbackDescription: system.formationProcess.slice(0, 160),
    guide: getGuideContent('weather-system', slug),
    keywords: system.classification,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const system = getWeatherSystemBySlug(slug)
  if (!system) return { title: 'Weather System Not Found' }
  return buildGuideMetadata(seoInput(slug, system))
}

export default async function WeatherSystemDetailPage({ params }: PageProps) {
  const { slug } = await params
  const system = getWeatherSystemBySlug(slug)
  if (!system) notFound()

  const input = seoInput(slug, system)
  const { guide } = input

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildGuideJsonLd(input)) }}
      />
      {guide ? (
        <WeatherSystemGuide system={system} guide={guide} />
      ) : (
        <WeatherSystemDetail
          system={system}
          related={<RelatedGuides kind="weather-system" slug={slug} />}
        />
      )}
    </>
  )
}
