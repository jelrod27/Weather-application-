"use client"

import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import Image from 'next/image'

import { cn } from '@/lib/utils'
import { themeTokens } from '@/lib/theme-tokens'
import PageWrapper from '@/components/page-wrapper'
import { ShareButtons } from '@/components/share-buttons'
import type { BlogPost } from '@/lib/blog'
import { allowedBlogUrl } from '@/lib/blog/allowed-hosts'
import { blogHeroImage } from '@/lib/blog/hero'
import { KeyTerms } from '@/components/blog/key-terms'

interface BlogArticleProps {
  post: BlogPost
  relatedPosts: BlogPost[]
}

export function BlogArticle({ post, relatedPosts }: BlogArticleProps) {
  const themeClasses = themeTokens.card

  const shareConfig = {
    title: post.title,
    text: `${post.title} -- ${post.summary}`,
    url: `https://www.16bitweather.co/blog/${post.slug}`,
  }

  return (
    <PageWrapper>
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero image — LCP candidate, priority-loaded.
            unoptimized: heroImage is served by our own /api/og endpoint (already
            a generated image); re-optimizing at build time would require a
            running server and adds no benefit.
            blogHeroImage falls back to a generated OG banner when frontmatter
            heroImage is empty, so this block always renders. */}
        <div className="relative w-full h-64 sm:h-80 mb-6 rounded-lg overflow-hidden">
          <Image
            src={blogHeroImage(post)}
            alt={post.title}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        {/* Back link */}
        <Link
          href="/blog"
          className="inline-block text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-[hsl(var(--primary))] transition-colors mb-6"
        >
          &lt; RETURN TO DISPATCH LOG
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground tracking-wider mb-4">
          <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
          <span>|</span>
          <span>{post.readTime} MIN READ</span>
          <span>|</span>
          <span>BY {post.author.toUpperCase()}</span>
        </div>

        {/* Title — text-primary, not themeClasses.accentText: accentText maps
            to text-primary-foreground, which is the on-primary-button color
            and blends into the page background (white-on-white in Daybreak). */}
        <h1 className={cn(
          'text-3xl sm:text-4xl font-extrabold font-mono uppercase tracking-tight mb-4',
          'text-primary'
        )}>
          {post.title}
        </h1>

        {/* Summary */}
        <p className="text-base font-mono text-muted-foreground mb-6 leading-relaxed">
          {post.summary}
        </p>

        {/* Key Terms */}
        {post.keyTerms && post.keyTerms.length > 0 && (
          <KeyTerms terms={post.keyTerms} />
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map(tag => (
            <Link
              key={tag}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className="px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>

        {/* Share */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[hsl(var(--border))]">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">SHARE</span>
          <ShareButtons config={shareConfig} />
        </div>

        {/* Body */}
        <div className="prose-terminal">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              h2: ({ children }) => (
                <h2 className="text-xl font-bold font-mono uppercase tracking-wider mt-10 mb-4 text-[hsl(var(--primary))]">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-bold font-mono uppercase tracking-wider mt-8 mb-3 text-[hsl(var(--primary))]">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="font-mono text-sm leading-relaxed mb-4">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc space-y-1 my-4 font-mono text-sm">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="ml-4">{children}</li>
              ),
              strong: ({ children }) => <strong>{children}</strong>,
              em: ({ children }) => <em>{children}</em>,
              a: ({ href, children }) => {
                // Render the link only when the host is in the curated
                // allow-list. Out-of-list hrefs (incl. javascript: / data: /
                // unknown attacker hosts) render as plain text. Defense
                // against indirect prompt-injection that gets the model to
                // embed phishing URLs in a generated post.
                const safe = allowedBlogUrl(typeof href === 'string' ? href : null)
                if (!safe) return <span>{children}</span>
                return (
                  <a href={safe} className="underline text-[hsl(var(--primary))]" target="_blank" rel="noopener noreferrer">{children}</a>
                )
              },
              code: ({ children }) => (
                <code className="rounded bg-black/25 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="mb-4 overflow-x-auto rounded bg-black/30 p-3 font-mono text-xs">{children}</pre>
              ),
              img: ({ src, alt }) => {
                // Same allow-list as <a>. Out-of-list image hosts could
                // beacon viewer IP/UA on every page load with no click
                // required, so refuse to render them at all.
                const safe = allowedBlogUrl(typeof src === 'string' ? src : null)
                if (!safe) return null
                return (
                  <Image
                    src={safe}
                    alt={alt || ''}
                    width={1200}
                    height={675}
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="w-full h-auto rounded-lg my-6 border border-[hsl(var(--border))]"
                  />
                )
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Bottom share */}
        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[hsl(var(--border))]">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">SHARE</span>
          <ShareButtons config={shareConfig} />
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[hsl(var(--border))]">
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider mb-6">
              RELATED DISPATCHES
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map(related => (
                <Link
                  key={related.slug.replace(/[^a-z0-9-]/g, '')}
                  href={`/blog/${encodeURIComponent(related.slug)}`}
                  className={cn(
                    'block rounded-lg border p-4 transition-all duration-200',
                    'hover:border-[hsl(var(--primary))] hover:shadow-[0_0_10px_hsl(var(--primary)/0.1)]',
                    'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                  )}
                >
                  <p className="text-xs font-mono text-muted-foreground tracking-wider mb-2">
                    {new Date(related.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </p>
                  <h3 className="text-sm font-bold font-mono uppercase tracking-tight line-clamp-2">
                    {related.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PageWrapper>
  )
}
