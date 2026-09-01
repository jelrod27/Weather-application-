import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import CloudDetail from '@/components/education/cloud-detail'
import CloudGuide from '@/components/education/cloud-guide'
import RelatedGuides from '@/components/education/related-guides'
import { getGuideContent, getGuideSlugs } from '@/lib/education/content'
import { FEATURED_DETAIL_SLUGS, getCloudBySlug } from '@/lib/education/entries'
import { buildGuideJsonLd, buildGuideMetadata, type GuideSeoInput } from '@/lib/education/guide-seo'
import { safeJsonLd } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  // Featured Entries plus anything that has a Guide, so a new markdown file is
  // statically rendered without also being added to the featured list.
  //
  // Filtered to slugs that actually resolve to an Entry: the page calls
  // notFound() when getCloudBySlug misses, so a mistyped filename would
  // otherwise prerender a 404 and the author would never learn their Guide is
  // unreachable. education-guides.test.ts asserts the correspondence so the
  // typo fails CI rather than being quietly filtered away here.
  const slugs = new Set([...FEATURED_DETAIL_SLUGS.cloud, ...getGuideSlugs('cloud')])
  return [...slugs].filter((slug) => getCloudBySlug(slug)).map((slug) => ({ slug }))
}

function seoInput(slug: string, cloud: NonNullable<ReturnType<typeof getCloudBySlug>>): GuideSeoInput {
  return {
    kind: 'cloud',
    slug,
    name: cloud.name,
    // description16bit is flavour text ("Massive storm tower reaching max
    // altitude limit"); a Guide summary is written to be read in search results.
    fallbackDescription: cloud.description16bit,
    guide: getGuideContent('cloud', slug),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const cloud = getCloudBySlug(slug)
  if (!cloud) return { title: 'Cloud Type Not Found' }
  return buildGuideMetadata(seoInput(slug, cloud))
}

export default async function CloudDetailPage({ params }: PageProps) {
  const { slug } = await params
  const cloud = getCloudBySlug(slug)
  if (!cloud) notFound()

  const input = seoInput(slug, cloud)
  const { guide } = input

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildGuideJsonLd(input)) }}
      />
      {guide ? (
        <CloudGuide cloud={cloud} guide={guide} />
      ) : (
        <CloudDetail cloud={cloud} related={<RelatedGuides kind="cloud" slug={slug} />} />
      )}
    </>
  )
}
