import type { Metadata } from 'next'
import { getAllPosts, getCategoriesInUse, BLOG_CATEGORIES } from '@/lib/blog'
import { BlogIndex } from './blog-index'

const BASE_URL = 'https://www.16bitweather.co'

interface PageProps {
  searchParams: Promise<{ category?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { category } = await searchParams

  const baseTitle = '16 Bit Weather Blog | Weekly Dispatches from 16bitbot'
  const baseDescription =
    'Weekly dispatches from 16bitbot. Space weather, severe storms, weather phenomena, and climate records.'

  // Category-filtered URLs are near-duplicates of the index — keep them out of
  // the index so crawl budget concentrates on canonical /blog and posts.
  const categoryLabel = BLOG_CATEGORIES.find(c => c.id === category)?.label
  if (categoryLabel) {
    return {
      title: `${categoryLabel} | ${baseTitle}`,
      description: `${categoryLabel} posts — ${baseDescription}`,
      robots: { index: false, follow: true },
      alternates: { canonical: `${BASE_URL}/blog` },
    }
  }

  return {
    title: baseTitle,
    description: baseDescription,
    alternates: { canonical: `${BASE_URL}/blog` },
  }
}

export default async function BlogPage({ searchParams }: PageProps) {
  const posts = getAllPosts()
  const categories = getCategoriesInUse()
  const { category } = await searchParams
  const initialCategory =
    category && BLOG_CATEGORIES.some(c => c.id === category) ? category : null
  return <BlogIndex posts={posts} categories={categories} initialCategory={initialCategory} />
}
