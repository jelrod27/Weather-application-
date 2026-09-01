import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import PhenomenonDetail from '@/components/education/phenomenon-detail'
import PhenomenonGuide from '@/components/education/phenomenon-guide'
import RelatedGuides from '@/components/education/related-guides'
import { getGuideContent, getGuideSlugs } from '@/lib/education/content'
import { FEATURED_DETAIL_SLUGS, getPhenomenonBySlug } from '@/lib/education/entries'
import { buildGuideJsonLd, buildGuideMetadata, type GuideSeoInput } from '@/lib/education/guide-seo'
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

function seoInput(
  slug: string,
  phenomenon: NonNullable<ReturnType<typeof getPhenomenonBySlug>>,
): GuideSeoInput {
  return {
    kind: 'phenomenon',
    slug,
    name: phenomenon.name,
    fallbackDescription: phenomenon.description,
    guide: getGuideContent('phenomenon', slug),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const phenomenon = getPhenomenonBySlug(slug)
  if (!phenomenon) return { title: 'Phenomenon Not Found' }
  return buildGuideMetadata(seoInput(slug, phenomenon))
}

export default async function PhenomenonDetailPage({ params }: PageProps) {
  const { slug } = await params
  const phenomenon = getPhenomenonBySlug(slug)
  if (!phenomenon) notFound()

  const input = seoInput(slug, phenomenon)
  const { guide } = input

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildGuideJsonLd(input)) }}
      />
      {guide ? (
        <PhenomenonGuide phenomenon={phenomenon} guide={guide} />
      ) : (
        <PhenomenonDetail
          phenomenon={phenomenon}
          related={<RelatedGuides kind="phenomenon" slug={slug} />}
        />
      )}
    </>
  )
}
