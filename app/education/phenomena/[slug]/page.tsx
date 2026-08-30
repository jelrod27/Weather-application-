import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PhenomenonDetail from '@/components/education/phenomenon-detail'
import PhenomenonGuide from '@/components/education/phenomenon-guide'
import { getGuideContent, getGuideSlugs } from '@/lib/education/content'
import {
  FEATURED_DETAIL_SLUGS,
  getEducationDetailHref,
  getPhenomenonBySlug,
} from '@/lib/education/entries'
import { safeJsonLd } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  // Featured Entries plus anything with a Guide, so a new markdown file is
  // statically rendered without also being added to the featured list.
  // Filtered to slugs that resolve, because the page calls notFound() when
  // getPhenomenonBySlug misses — a mistyped filename would otherwise prerender
  // a 404 and the author would never learn the Guide is unreachable.
  // education-guides.test.ts asserts the correspondence so the typo fails CI.
  const slugs = new Set([...FEATURED_DETAIL_SLUGS.phenomenon, ...getGuideSlugs('phenomenon')])
  return [...slugs].filter((slug) => getPhenomenonBySlug(slug)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const phenomenon = getPhenomenonBySlug(slug)
  if (!phenomenon) return { title: 'Phenomenon Not Found' }

  const guide = getGuideContent('phenomenon', slug)
  const url = `https://www.16bitweather.co${getEducationDetailHref('phenomenon', slug)}`
  const title = `${guide?.title ?? phenomenon.name} — 16-Bit Takes`
  const description = guide?.summary ?? phenomenon.description

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

export default async function PhenomenonDetailPage({ params }: PageProps) {
  const { slug } = await params
  const phenomenon = getPhenomenonBySlug(slug)
  if (!phenomenon) notFound()

  const guide = getGuideContent('phenomenon', slug)
  if (!guide) return <PhenomenonDetail phenomenon={phenomenon} />

  const url = `https://www.16bitweather.co${getEducationDetailHref('phenomenon', slug)}`
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    // Matches the <title> and og:title above; a headline naming a section
    // that appears nowhere on the page is worse than no headline.
    headline: `${guide.title} — 16-Bit Takes`,
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
      <PhenomenonGuide phenomenon={phenomenon} guide={guide} />
    </>
  )
}
