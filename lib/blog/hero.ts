/**
 * Hero-image resolution for blog posts.
 *
 * Posts are expected to carry a `heroImage` URL in frontmatter, but the
 * newsletter generator falls back to an empty string when its image catalog
 * has nothing for a topic (e.g. the 2026-06-12 biometeorology post). An
 * empty hero used to mean "render no picture at all" — on the index that
 * left the featured card imageless and dropped its title onto an unstyled
 * branch. Instead, fall back to the site's own OG-image generator so every
 * post always has a branded banner.
 *
 * Pure module — no `fs`/Node imports — safe for server and client components
 * (same constraint as ./categories).
 */

import { getPostCategoryIds } from './categories'

/** Accent types understood by /api/og/blog (see app/api/og/blog/route.tsx). */
type OgType = 'severe' | 'space' | 'education' | 'record' | 'dispatch'

function ogTypeForTags(tags: string[]): OgType {
  const categories = getPostCategoryIds(tags)
  if (categories.includes('severe-weather')) return 'severe'
  if (categories.includes('space-weather')) return 'space'
  if (categories.includes('weekly-dispatch')) return 'dispatch'
  return 'education'
}

/**
 * The image to render for a post's hero/banner slots: the frontmatter
 * `heroImage` when present, otherwise a generated OG banner. Always returns
 * a non-empty URL.
 */
export function blogHeroImage(post: { title: string; heroImage: string; tags: string[] }): string {
  if (post.heroImage) return post.heroImage
  return `/api/og/blog?title=${encodeURIComponent(post.title)}&type=${ogTypeForTags(post.tags)}`
}
