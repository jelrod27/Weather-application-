/**
 * Metadata and JSON-LD for the shareable Guide pages.
 *
 * The three detail routes used to build these by hand and had drifted: only
 * weather systems set an Open Graph image, none set `datePublished` or
 * `image` on the Article, and none emitted a BreadcrumbList although every
 * Guide renders visible crumbs. One builder keeps the three in step.
 */

import type { Metadata } from 'next'

import type { GuideContent } from '@/lib/education/content'
import { getEducationDetailHref, type EducationEntryKind } from '@/lib/education/entries'

const BASE_URL = 'https://www.16bitweather.co'
const PUBLISHER = { '@type': 'Organization', name: '16 Bit Weather', url: BASE_URL }

interface GuideSection {
  /** Appended to the title, so `<title>`, og:title and headline agree. */
  headlineSuffix: string
  /** Second crumb, matching the visible EducationBreadcrumb on the page. */
  atlasLabel: string
  atlasHref: string
}

export const GUIDE_SECTIONS: Record<EducationEntryKind, GuideSection> = {
  cloud: { headlineSuffix: 'Cloud Atlas', atlasLabel: 'Cloud Atlas', atlasHref: '/cloud-types' },
  'weather-system': {
    headlineSuffix: 'Weather Systems Guide',
    atlasLabel: 'Weather Systems',
    atlasHref: '/weather-systems',
  },
  phenomenon: { headlineSuffix: '16-Bit Takes', atlasLabel: '16-Bit Takes', atlasHref: '/fun-facts' },
}

export function guideUrl(kind: EducationEntryKind, slug: string): string {
  return `${BASE_URL}${getEducationDetailHref(kind, slug)}`
}

/** Path only; `metadataBase` in the root layout makes it absolute for Open Graph. */
export function guideOgImagePath(kind: EducationEntryKind, name: string): string {
  const subtitle = GUIDE_SECTIONS[kind].headlineSuffix
  return `/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(subtitle)}`
}

export interface GuideSeoInput {
  kind: EducationEntryKind
  slug: string
  /** The Entry's display name; a Guide title takes precedence when one exists. */
  name: string
  /** Fallback description when the Entry has no Guide summary. */
  fallbackDescription: string
  guide: GuideContent | null
  keywords?: string
}

function resolve(input: GuideSeoInput) {
  const { kind, slug, guide } = input
  const section = GUIDE_SECTIONS[kind]
  const name = guide?.title ?? input.name
  return {
    section,
    name,
    title: `${name} — ${section.headlineSuffix}`,
    description: guide?.summary ?? input.fallbackDescription,
    url: guideUrl(kind, slug),
    image: guideOgImagePath(kind, name),
  }
}

export function buildGuideMetadata(input: GuideSeoInput): Metadata {
  const { title, description, url, image } = resolve(input)
  return {
    title: `${title} | 16 Bit Weather`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

/**
 * An Article and its BreadcrumbList in one `@graph`. `datePublished` comes from
 * the Guide's generation date and `dateModified` from its review date; a Guide
 * carrying only one of them reports that date for both, since a page reviewed
 * once was published no later than that.
 */
export function buildGuideJsonLd(input: GuideSeoInput): Record<string, unknown> {
  const { section, name, title, description, url, image } = resolve(input)
  const { guide, keywords } = input
  const published = guide?.generated || guide?.reviewed
  const modified = guide?.reviewed || guide?.generated

  const article = {
    '@type': 'Article',
    headline: title,
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: `${BASE_URL}${image}`,
    author: PUBLISHER,
    publisher: PUBLISHER,
    about: { '@type': 'Thing', name },
    ...(keywords ? { keywords } : {}),
    ...(guide ? { citation: guide.sources.map((source) => source.url) } : {}),
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
  }

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Education', item: `${BASE_URL}/education` },
      { '@type': 'ListItem', position: 2, name: section.atlasLabel, item: `${BASE_URL}${section.atlasHref}` },
      { '@type': 'ListItem', position: 3, name, item: url },
    ],
  }

  return { '@context': 'https://schema.org', '@graph': [article, breadcrumb] }
}
