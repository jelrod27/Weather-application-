import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import CloudDetail from '@/components/education/cloud-detail'
import CloudGuide from '@/components/education/cloud-guide'
import { getGuideContent, getGuideSlugs } from '@/lib/education/content'
import {
  FEATURED_DETAIL_SLUGS,
  getCloudBySlug,
  getEducationDetailHref,
} from '@/lib/education/entries'
import { safeJsonLd } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  // Featured Entries plus anything that has a Guide, so a new markdown file is
  // statically rendered without also being added to the featured list.
  const slugs = new Set([...FEATURED_DETAIL_SLUGS.cloud, ...getGuideSlugs('cloud')])
  return [...slugs].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const cloud = getCloudBySlug(slug)
  if (!cloud) return { title: 'Cloud Type Not Found' }

  const guide = getGuideContent('cloud', slug)
  const url = `https://www.16bitweather.co${getEducationDetailHref('cloud', slug)}`
  const title = `${guide?.title ?? cloud.name} — Cloud Atlas`
  // description16bit is flavour text ("Massive storm tower reaching max
  // altitude limit"); a Guide summary is written to be read in search results.
  const description = guide?.summary ?? cloud.description16bit

  return {
    title: `${title} | 16 Bit Weather`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
    },
  }
}

export default async function CloudDetailPage({ params }: PageProps) {
  const { slug } = await params
  const cloud = getCloudBySlug(slug)
  if (!cloud) notFound()

  const guide = getGuideContent('cloud', slug)
  if (!guide) return <CloudDetail cloud={cloud} />

  const url = `https://www.16bitweather.co${getEducationDetailHref('cloud', slug)}`
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${guide.title} — Cloud Atlas`,
    description: guide.summary,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: '16 Bit Weather', url: 'https://www.16bitweather.co' },
    publisher: { '@type': 'Organization', name: '16 Bit Weather', url: 'https://www.16bitweather.co' },
    about: { '@type': 'Thing', name: guide.title },
    citation: guide.sources.map((source) => source.url),
    ...(guide.reviewed ? { dateModified: guide.reviewed } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }}
      />
      <CloudGuide cloud={cloud} guide={guide} />
    </>
  )
}
