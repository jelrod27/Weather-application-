"use client"

import Link from 'next/link'
import Image from 'next/image'

import { cn } from '@/lib/utils'
import { themeTokens } from '@/lib/theme-tokens'
import PageWrapper from '@/components/page-wrapper'
import { ShareButtons } from '@/components/share-buttons'
import type { BlogCategory, BlogCategoryId } from '@/lib/blog/categories'
import { blogHeroImage } from '@/lib/blog/hero'
import { blogIndexHref, blogPostHref } from '@/lib/blog/query'

/**
 * The subset of a post a card renders. Deliberately not `BlogPost`: the index
 * is a client component, so anything in these props is serialized into the
 * page's inline RSC payload, and shipping `content` for every post is what
 * made /blog 388 KB of HTML for ten cards.
 */
export interface BlogIndexCard {
  slug: string
  title: string
  date: string
  author: string
  summary: string
  tags: string[]
  heroImage: string
  readTime: number
}

interface BlogIndexProps {
  /** Only the current page's posts — filtering and paging happen server-side. */
  posts: BlogIndexCard[]
  categories: BlogCategory[]
  activeCategory: BlogCategoryId | null
  activeTag: string | null
  activeTagLabel: string | null
  page: number
  totalPages: number
  /** Posts matching the active filter across all pages. */
  totalPosts: number
}

const CHIP_BASE =
  'px-3 py-1 text-xs font-mono uppercase tracking-wider rounded border transition-colors'
const CHIP_ON =
  'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
const CHIP_OFF =
  'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'

/**
 * Page numbers to link: always the first, last and current page, plus two
 * either side. Gaps render as an ellipsis.
 */
function pageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const wanted = new Set<number>([1, totalPages, page])
  for (let offset = 1; offset <= 2; offset++) {
    wanted.add(page - offset)
    wanted.add(page + offset)
  }
  return Array.from(wanted)
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)
}

function formatDate(date: string, month: 'long' | 'short'): string {
  return new Date(date)
    .toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric' })
    .toUpperCase()
}

export function BlogIndex({
  posts,
  categories,
  activeCategory,
  activeTag,
  activeTagLabel,
  page,
  totalPages,
  totalPosts,
}: BlogIndexProps) {
  const themeClasses = themeTokens.card

  // The hero card only leads the archive; deeper pages are a plain grid.
  const featured = page === 1 ? posts[0] : undefined
  const gridPosts = featured ? posts.slice(1) : posts

  const filterHref = (category: BlogCategoryId | null) =>
    blogIndexHref({ category, tag: activeTag })

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <p className="text-xs font-mono tracking-widest text-muted-foreground">
            // TRANSMISSION LOG
          </p>
          {/* text-primary, not themeClasses.accentText: accentText maps to
              text-primary-foreground (the on-primary-button color), which
              blends into the page background — white-on-white in Daybreak. */}
          <h1
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl font-extrabold font-mono',
              'text-primary',
              themeClasses.glow
            )}
          >
            WEATHER BLOG
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-2xl mx-auto', themeClasses.text)}>
            Weekly dispatches from 16bitbot. Space weather, severe storms, weather
            phenomena, and climate records.
          </p>
          <ShareButtons
            config={{
              title: '16 Bit Weather Blog',
              text: 'Weekly weather intelligence from 16bitbot at 16bitweather.co',
              url: 'https://www.16bitweather.co/blog',
            }}
            className="mt-3 justify-center"
          />
        </div>

        {/* Category filter — links, not state, so every filtered view is a
            crawlable URL and the server can page within the filter. */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href={filterHref(null)}
              className={cn(CHIP_BASE, !activeCategory ? CHIP_ON : CHIP_OFF)}
            >
              ALL
            </Link>
            {categories.map(category => (
              <Link
                key={category.id}
                href={filterHref(category.id)}
                className={cn(CHIP_BASE, activeCategory === category.id ? CHIP_ON : CHIP_OFF)}
              >
                {category.label}
              </Link>
            ))}
          </div>
        )}

        {/* Active tag filter */}
        {activeTag && (
          <div className="flex flex-wrap gap-2 justify-center items-center">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              TAG:
            </span>
            <span className={cn(CHIP_BASE, CHIP_ON)}>{activeTagLabel ?? activeTag}</span>
            <Link
              href={blogIndexHref({ category: activeCategory })}
              className={cn(CHIP_BASE, CHIP_OFF)}
            >
              CLEAR
            </Link>
          </div>
        )}

        {/* Post count */}
        <p className="text-xs font-mono text-muted-foreground text-center tracking-wider">
          SHOWING {posts.length} OF {totalPosts} DISPATCHES
        </p>

        {/* Featured post (hero card) — page 1 only */}
        {featured && (
          <Link
            href={blogPostHref(featured.slug)}
            className={cn(
              'block rounded-lg border overflow-hidden transition-all duration-200',
              'hover:border-[hsl(var(--primary))] hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]',
              'border-[hsl(var(--primary)/0.5)]',
              'bg-[hsl(var(--card))]'
            )}
          >
            {/* blogHeroImage falls back to a generated OG banner when the
                frontmatter heroImage is empty, so the featured card always
                has art (the old imageless branch rendered its title in
                accentText, which was invisible on light themes). */}
            <div className="relative w-full h-56 sm:h-72 md:h-80">
              <Image
                src={blogHeroImage(featured)}
                alt={featured.title}
                fill
                priority
                unoptimized
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="inline-block px-2 py-0.5 text-xs font-mono uppercase tracking-widest text-[hsl(var(--primary))] border border-[hsl(var(--primary))] rounded mb-3">
                  FEATURED INTEL
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-mono uppercase tracking-tight text-white mb-2">
                  {featured.title}
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-300 tracking-wider">
                  <span>{formatDate(featured.date, 'long')}</span>
                  <span>|</span>
                  <span>{featured.readTime} MIN READ</span>
                  <span>|</span>
                  <span>BY {featured.author.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="p-6 pt-0">
              <p className="text-sm font-mono text-muted-foreground mb-4 leading-relaxed">
                {featured.summary}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {featured.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--primary))] whitespace-nowrap ml-4">
                  ACCESS FULL REPORT &rarr;
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Grid posts (smaller cards) */}
        {gridPosts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map(post => (
              <Link
                key={post.slug}
                href={blogPostHref(post.slug)}
                className={cn(
                  'block rounded-lg border p-5 transition-all duration-200',
                  'hover:border-[hsl(var(--primary))] hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)]',
                  'border-[hsl(var(--border))]',
                  'bg-[hsl(var(--card))]'
                )}
              >
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground tracking-wider mb-3">
                  <span>{formatDate(post.date, 'short')}</span>
                  <span>|</span>
                  <span>{post.readTime} MIN</span>
                </div>
                <h3 className="text-base font-bold font-mono uppercase tracking-tight mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs font-mono text-muted-foreground line-clamp-3 mb-3">
                  {post.summary}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    >
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      +{post.tags.length - 3}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--primary))]">
                  ACCESS FILE &rarr;
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg font-mono text-muted-foreground">NO DISPATCHES FOUND</p>
            <p className="text-sm font-mono text-muted-foreground mt-2">Check back soon for weather intelligence.</p>
          </div>
        )}

        {/* Pagination — real links so every post is reachable from the server
            HTML. The old buttons paged in React state, which left posts 11+
            unlinked from /blog entirely. */}
        {totalPages > 1 && (
          <nav
            aria-label="Blog pagination"
            className="flex flex-wrap justify-center items-center gap-2 pt-4"
          >
            {page > 1 ? (
              <Link
                href={blogIndexHref({ category: activeCategory, tag: activeTag, page: page - 1 })}
                rel="prev"
                className={cn(CHIP_BASE, CHIP_OFF)}
              >
                NEWER
              </Link>
            ) : (
              <span className={cn(CHIP_BASE, 'border-[hsl(var(--border))] opacity-30')}>NEWER</span>
            )}

            {pageWindow(page, totalPages).map((target, index, all) => (
              <span key={target} className="flex items-center gap-2">
                {index > 0 && target - all[index - 1] > 1 && (
                  <span className="text-xs font-mono text-muted-foreground">…</span>
                )}
                {target === page ? (
                  <span aria-current="page" className={cn(CHIP_BASE, CHIP_ON)}>
                    {target}
                  </span>
                ) : (
                  <Link
                    href={blogIndexHref({ category: activeCategory, tag: activeTag, page: target })}
                    className={cn(CHIP_BASE, CHIP_OFF)}
                  >
                    {target}
                  </Link>
                )}
              </span>
            ))}

            {page < totalPages ? (
              <Link
                href={blogIndexHref({ category: activeCategory, tag: activeTag, page: page + 1 })}
                rel="next"
                className={cn(CHIP_BASE, CHIP_OFF)}
              >
                OLDER
              </Link>
            ) : (
              <span className={cn(CHIP_BASE, 'border-[hsl(var(--border))] opacity-30')}>OLDER</span>
            )}
          </nav>
        )}

        {/* RSS link */}
        <div className="text-center pt-4 border-t border-[hsl(var(--border))]">
          <a
            href="/blog/rss.xml"
            type="application/rss+xml"
            className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-[hsl(var(--primary))] transition-colors"
          >
            RSS FEED
          </a>
        </div>
      </div>
    </PageWrapper>
  )
}
