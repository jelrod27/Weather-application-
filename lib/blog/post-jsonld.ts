/**
 * Article structured data for a blog post.
 *
 * The post route used to hand this to Next as `metadata.other`, which renders
 * as `<meta name="application/ld+json" content="…">` — a tag no parser reads,
 * so all 44 posts shipped with no Article schema at all. The route now renders
 * the object below inside a real `<script type="application/ld+json">` via
 * `safeJsonLd`, the same way the Education Guides do.
 *
 * Pure module — no `fs`/Node imports — safe for server and client components
 * (same constraint as ./categories and ./hero).
 */

const BASE_URL = 'https://www.16bitweather.co'

const PUBLISHER = {
  '@type': 'Organization',
  name: '16 Bit Weather',
  url: BASE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
} as const

/** The fields the SEO layer needs; a `BlogPost` satisfies it structurally. */
export interface BlogPostSeoInput {
  slug: string
  title: string
  date: string
  updated?: string
  author: string
  summary: string
  tags: string[]
  heroImage: string
}

/** Canonical URL of a post. */
export function blogPostUrl(slug: string): string {
  return `${BASE_URL}/blog/${slug}`
}

/**
 * Path of the generated social banner for a post. Path only — `metadataBase`
 * in the root layout makes it absolute for Open Graph, and
 * `blogPostImageUrl` prefixes the origin for structured data.
 */
export function blogPostOgImagePath(post: Pick<BlogPostSeoInput, 'title'>): string {
  return `/api/og/blog?title=${encodeURIComponent(post.title)}&subtitle=16bitbot+Weekly+Dispatch`
}

/**
 * Absolute image for structured data: the frontmatter hero when it is already
 * an absolute http(s) URL (most posts carry a NOAA/Wikimedia URL), otherwise
 * the generated banner. Google will not fetch a relative `image`.
 */
export function blogPostImageUrl(post: Pick<BlogPostSeoInput, 'title' | 'heroImage'>): string {
  if (/^https?:\/\//i.test(post.heroImage)) return post.heroImage
  return `${BASE_URL}${blogPostOgImagePath(post)}`
}

/**
 * An Article and its BreadcrumbList in one `@graph`, matching the pattern in
 * `lib/education/guide-seo.ts`. `dateModified` falls back to `datePublished`
 * for the posts that have never been revised.
 */
export function buildBlogPostJsonLd(post: BlogPostSeoInput): Record<string, unknown> {
  const url = blogPostUrl(post.slug)

  const article = {
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: PUBLISHER,
    image: blogPostImageUrl(post),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags.join(', '),
    articleSection: 'Weather',
  }

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  }

  return { '@context': 'https://schema.org', '@graph': [article, breadcrumb] }
}
