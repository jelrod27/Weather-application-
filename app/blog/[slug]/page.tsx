import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog'
import { BlogArticle } from './blog-article'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: 'Post Not Found', robots: { index: false, follow: false } }

  const ogImage = `/api/og/blog?title=${encodeURIComponent(post.title)}&subtitle=16bitbot+Weekly+Dispatch`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: '16 Bit Weather', url: 'https://www.16bitweather.co' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.16bitweather.co/blog/${post.slug}` },
    keywords: post.tags.join(', '),
    articleSection: 'Weather',
  }

  return {
    title: `${post.title} | 16 Bit Weather Blog`,
    description: post.summary,
    keywords: post.tags.join(', '),
    openGraph: {
      title: post.title,
      description: post.summary,
      url: `https://www.16bitweather.co/blog/${post.slug}`,
      siteName: '16 Bit Weather',
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
      locale: 'en_US',
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://www.16bitweather.co/blog/${post.slug}`,
    },
    other: {
      'application/ld+json': JSON.stringify(structuredData),
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
  return <BlogArticle post={post} relatedPosts={related} />
}
