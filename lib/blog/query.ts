/**
 * The `/blog` index URL surface: tag slugs, filter/pagination parsing, and the
 * hrefs that link them together.
 *
 * The index used to hold its filter and page number in React state, so posts
 * 11-44 were never linked from the server HTML and every `?tag=` link a post
 * emitted pointed at a filter `/blog` did not implement. Both now resolve on
 * the server, which means one module has to own the shapes: the page reads
 * them out of `searchParams`, the client index renders links back into them.
 *
 * Pure module — no `fs`/Node imports — safe for server and client components
 * (same constraint as ./categories and ./hero).
 */

import { BLOG_CATEGORIES, getPostCategoryIds, type BlogCategoryId } from './categories'

/** Cards per page on `/blog`. Page 1 spends one of these on the featured hero. */
export const POSTS_PER_PAGE = 10

/**
 * URL form of a raw frontmatter tag. `Severe Weather`, `severe weather` and
 * `severe-weather` all collapse to `severe-weather`, so a tag has exactly one
 * URL no matter how the frontmatter spelled it.
 */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Raw `searchParams` for /blog, as Next hands them to the route. */
export interface BlogIndexSearchParams {
  category?: string | string[]
  tag?: string | string[]
  page?: string | string[]
}

export interface BlogIndexQuery {
  /** A `BLOG_CATEGORIES` id, or null when absent/unrecognised. */
  category: BlogCategoryId | null
  /** A tag slug, or null when absent/empty. */
  tag: string | null
  /** 1-based page number, or null when the parameter was not a valid page. */
  page: number | null
}

/**
 * Reads the index query out of raw `searchParams`. An unrecognised category or
 * tag narrows to nothing rather than 404ing (those URLs are already indexed as
 * canonical duplicates), but a malformed `page` returns null so the route can
 * `notFound()` instead of silently serving page 1 under a different URL.
 */
export function parseBlogIndexQuery(params: BlogIndexSearchParams): BlogIndexQuery {
  // A repeated parameter (?tag=a&tag=b) arrives as an array; take the first.
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value

  const categoryParam = first(params.category)
  const category = BLOG_CATEGORIES.find(c => c.id === categoryParam)?.id ?? null

  const tagParam = first(params.tag)
  const tag = tagParam ? tagSlug(tagParam) || null : null

  const pageParam = first(params.page)
  let page: number | null = 1
  if (pageParam !== undefined) {
    page = /^\d+$/.test(pageParam) && Number(pageParam) >= 1 ? Number(pageParam) : null
  }

  return { category, tag, page }
}

/** A post as far as index filtering is concerned. */
interface TaggedPost {
  tags: string[]
}

/** Posts matching both active filters, in the order they were given. */
export function filterBlogPosts<T extends TaggedPost>(
  posts: T[],
  { category, tag }: { category: BlogCategoryId | null; tag: string | null },
): T[] {
  return posts.filter(post => {
    if (category && !getPostCategoryIds(post.tags).includes(category)) return false
    if (tag && !post.tags.some(t => tagSlug(t) === tag)) return false
    return true
  })
}

/** Page count for a filtered list. An empty list still has one (empty) page. */
export function blogTotalPages(postCount: number): number {
  return Math.max(1, Math.ceil(postCount / POSTS_PER_PAGE))
}

/** The slice of `posts` shown on `page` (1-based). */
export function blogPageSlice<T>(posts: T[], page: number): T[] {
  return posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)
}

/**
 * Canonical href for an index view. Page 1 is `/blog`, never `/blog?page=1`,
 * so the first page has one URL and one canonical.
 */
export function blogIndexHref({
  category = null,
  tag = null,
  page = 1,
}: {
  category?: BlogCategoryId | string | null
  tag?: string | null
  page?: number
} = {}): string {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (tag) params.set('tag', tag)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/blog?${query}` : '/blog'
}
