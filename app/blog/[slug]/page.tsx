import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog'
import {
  blogPostOgImagePath,
  blogPostUrl,
  buildBlogPostJsonLd,
} from '@/lib/blog/post-jsonld'
import { clampDescription } from '@/lib/seo/clamp-description'
import { safeJsonLd } from '@/lib/utils'
import { BlogArticle } from './blog-article'

const BASE_URL = 'https://www.16bitweather.co'
const RSS_URL = `${BASE_URL}/blog/rss.xml`

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: 'Post Not Found', robots: { index: false, follow: false } }

  const ogImage = blogPostOgImagePath(post)
  const description = clampDescription(post.summary)

  return {
    // A post headline is already 34-60 characters and reads as its own name.
    // Letting the root template append the brand would push it past 77 and
    // Google would cut it mid-phrase, so this one route opts out.
    title: { absolute: post.title },
    description,
    keywords: post.tags.join(', '),
    openGraph: {
      title: post.title,
      description,
      url: blogPostUrl(post.slug),
      siteName: '16 Bit Weather',
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
      locale: 'en_US',
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [ogImage],
    },
    // `alternates` is replaced wholesale per segment, so the feed link has to
    // be repeated here as well as on /blog or posts advertise no feed.
    alternates: {
      canonical: blogPostUrl(post.slug),
      types: { 'application/rss+xml': RSS_URL },
    },
  }
}

export function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const related = getRelatedPosts(slug)
  return (
    <>
      {/* A real <script>, not metadata.other — Next renders `other` entries as
          <meta name=… content=…>, which no structured-data parser reads. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildBlogPostJsonLd(post)) }}
      />
      <BlogArticle post={post} relatedPosts={related} />
    </>
  )
}
