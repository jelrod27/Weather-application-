import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getAllPosts, getCategoriesInUse, BLOG_CATEGORIES } from '@/lib/blog'
import {
  blogIndexHref,
  blogPageSlice,
  blogTotalPages,
  filterBlogPosts,
  parseBlogIndexQuery,
  tagSlug,
  type BlogIndexSearchParams,
} from '@/lib/blog/query'
import { clampDescription } from '@/lib/seo/clamp-description'
import { BlogIndex, type BlogIndexCard } from './blog-index'

const BASE_URL = 'https://www.16bitweather.co'
const RSS_URL = `${BASE_URL}/blog/rss.xml`

const BASE_DESCRIPTION =
  'Weekly dispatches from 16bitbot. Space weather, severe storms, weather phenomena, and climate records.'

interface PageProps {
  searchParams: Promise<BlogIndexSearchParams>
}

/** Display label for an active tag: the first spelling any post used for it. */
function tagLabel(slug: string): string {
  for (const post of getAllPosts()) {
    const match = post.tags.find(t => tagSlug(t) === slug)
    if (match) return match
  }
  return slug.replace(/-/g, ' ')
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { category, tag, page } = parseBlogIndexQuery(await searchParams)

  // `alternates` is replaced wholesale per segment, so both /blog and the post
  // route have to advertise the feed themselves.
  const feed = { 'application/rss+xml': RSS_URL }

  // Filtered URLs are near-duplicates of the index — keep them out of the
  // index so crawl budget concentrates on canonical /blog and the posts.
  const categoryLabel = BLOG_CATEGORIES.find(c => c.id === category)?.label
  const filterLabel = categoryLabel ?? (tag ? tagLabel(tag) : null)
  if (filterLabel) {
    return {
      title: `${filterLabel} — Weather Blog`,
      description: clampDescription(`${filterLabel} posts. ${BASE_DESCRIPTION}`),
      robots: { index: false, follow: true },
      alternates: { canonical: `${BASE_URL}/blog`, types: feed },
    }
  }

  // Unfiltered pages stay indexable and self-canonical; page 1 is /blog, never
  // /blog?page=1, so the first page has a single URL.
  const pageNumber = page ?? 1
  const title = pageNumber > 1 ? `Weather Blog — Page ${pageNumber}` : 'Weather Blog'
  const description =
    pageNumber > 1
      ? clampDescription(`Page ${pageNumber} of the dispatch archive. ${BASE_DESCRIPTION}`)
      : clampDescription(BASE_DESCRIPTION)
  const canonical = `${BASE_URL}${blogIndexHref({ page: pageNumber })}`
  const ogImage = '/api/og/blog?title=Weather+Blog&subtitle=Weekly+Dispatches+from+16bitbot'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: '16 Bit Weather',
      images: [{ url: ogImage, width: 1200, height: 630, alt: '16 Bit Weather Blog' }],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: { canonical, types: feed },
  }
}

/**
 * Only the fields a card renders. The index used to receive every post in
 * full — body markdown included — which is what made /blog ship 347 KB of
 * inline RSC payload for ten cards.
 */
function toCard(post: ReturnType<typeof getAllPosts>[number]): BlogIndexCard {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    author: post.author,
    summary: post.summary,
    tags: post.tags,
    heroImage: post.heroImage,
    readTime: post.readTime,
  }
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { category, tag, page } = parseBlogIndexQuery(await searchParams)

  const filtered = filterBlogPosts(getAllPosts(), { category, tag })
  const totalPages = blogTotalPages(filtered.length)

  // A non-integer or out-of-range ?page= is a URL that never existed.
  if (page === null || page > totalPages) notFound()

  return (
    <BlogIndex
      posts={blogPageSlice(filtered, page).map(toCard)}
      categories={getCategoriesInUse()}
      activeCategory={category}
      activeTag={tag}
      activeTagLabel={tag ? tagLabel(tag) : null}
      page={page}
      totalPages={totalPages}
      totalPosts={filtered.length}
    />
  )
}
