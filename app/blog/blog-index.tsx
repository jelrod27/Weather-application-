"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { cn } from '@/lib/utils'
import { themeTokens } from '@/lib/theme-tokens'
import PageWrapper from '@/components/page-wrapper'
import { ShareButtons } from '@/components/share-buttons'
import type { BlogPost } from '@/lib/blog'
import { getPostCategoryIds, type BlogCategory } from '@/lib/blog/categories'
import { blogHeroImage } from '@/lib/blog/hero'

const POSTS_PER_PAGE = 10

interface BlogIndexProps {
  posts: BlogPost[]
  categories: BlogCategory[]
  initialCategory: string | null
}

export function BlogIndex({ posts, categories, initialCategory }: BlogIndexProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory)
  const [page, setPage] = useState(1)
  const themeClasses = themeTokens.card

  const filtered = selectedCategory
    ? posts.filter(p => getPostCategoryIds(p.tags).some(id => id === selectedCategory))
    : posts

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)

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

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => { setSelectedCategory(null); setPage(1) }}
              className={cn(
                'px-3 py-1 text-xs font-mono uppercase tracking-wider rounded border transition-colors',
                !selectedCategory
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'
              )}
            >
              ALL
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => { setSelectedCategory(category.id); setPage(1) }}
                className={cn(
                  'px-3 py-1 text-xs font-mono uppercase tracking-wider rounded border transition-colors',
                  selectedCategory === category.id
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}

        {/* Post count */}
        <p className="text-xs font-mono text-muted-foreground text-center tracking-wider">
          SHOWING {paginated.length} OF {filtered.length} DISPATCHES
        </p>

        {/* Featured post (hero card) — page 1 only */}
        {page === 1 && paginated[0] && (() => {
          const feat = paginated[0]
          return (
            <Link
              href={`/blog/${encodeURIComponent(feat.slug)}`}
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
              {(
                <div className="relative w-full h-56 sm:h-72 md:h-80">
                  <Image
                    src={blogHeroImage(feat)}
                    alt={feat.title}
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
                      {feat.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-300 tracking-wider">
                      <span>{new Date(feat.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                      <span>|</span>
                      <span>{feat.readTime} MIN READ</span>
                      <span>|</span>
                      <span>BY {feat.author.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-6 pt-0">
                <p className="text-sm font-mono text-muted-foreground mb-4 leading-relaxed">
                  {feat.summary}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {feat.tags.map(tag => (
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
          )
        })()}

        {/* Grid posts (smaller cards) */}
        {(() => {
          const gridPosts = page === 1 ? paginated.slice(1) : paginated
          if (gridPosts.length === 0) return null
          return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gridPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${encodeURIComponent(post.slug)}`}
                  className={cn(
                    'block rounded-lg border p-5 transition-all duration-200',
                    'hover:border-[hsl(var(--primary))] hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)]',
                    'border-[hsl(var(--border))]',
                    'bg-[hsl(var(--card))]'
                  )}
                >
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground tracking-wider mb-3">
                    <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
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
          )
        })()}

        {/* Empty state */}
        {paginated.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg font-mono text-muted-foreground">NO DISPATCHES FOUND</p>
            <p className="text-sm font-mono text-muted-foreground mt-2">Check back soon for weather intelligence.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider border border-[hsl(var(--border))] rounded disabled:opacity-30 hover:border-[hsl(var(--primary))] transition-colors"
            >
              PREV
            </button>
            <span className="px-4 py-2 text-xs font-mono tracking-wider text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider border border-[hsl(var(--border))] rounded disabled:opacity-30 hover:border-[hsl(var(--primary))] transition-colors"
            >
              NEXT
            </button>
          </div>
        )}

        {/* RSS link */}
        <div className="text-center pt-4 border-t border-[hsl(var(--border))]">
          <a
            href="/blog/rss.xml"
            className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-[hsl(var(--primary))] transition-colors"
          >
            RSS FEED
          </a>
        </div>
      </div>
    </PageWrapper>
  )
}
