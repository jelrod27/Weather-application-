/**
 * Tests for blog index layout: featured hero card + smaller grid cards
 */

import React from 'react'

jest.mock('next/link', () => {
  return function MockLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    return <a href={href} className={className}>{children}</a>
  }
})

jest.mock('@/components/page-wrapper', () => {
  return function MockPageWrapper({ children }: { children: React.ReactNode }) {
    return <div data-testid="page-wrapper">{children}</div>
  }
})

jest.mock('@/components/share-buttons', () => ({
  ShareButtons: () => <div data-testid="share-buttons" />,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import type { BlogPost, BlogCategory } from '@/lib/blog'
import { getAllPosts, getPostCategoryIds, BLOG_CATEGORIES } from '@/lib/blog'

const makePosts = (count: number): BlogPost[] =>
  Array.from({ length: count }, (_, i) => ({
    slug: `post-${i}`,
    title: `Post Title ${i}`,
    date: new Date(2026, 3, 5 - i).toISOString(),
    author: '16bitbot',
    summary: `Summary for post ${i}`,
    tags: ['weather', 'testing'],
    heroImage: i === 0 ? '/api/og/blog?title=Featured' : '',
    readTime: 3,
    content: `Content for post ${i}`,
  }))

let BlogIndex: React.ComponentType<{
  posts: BlogPost[]
  categories: BlogCategory[]
  initialCategory: string | null
}>

beforeAll(async () => {
  const mod = await import('@/app/blog/blog-index')
  BlogIndex = mod.BlogIndex
})

describe('Blog index layout', () => {
  it('should render a FEATURED INTEL badge on the first post', () => {
    render(<BlogIndex posts={makePosts(4)} categories={[]} initialCategory={null} />)
    expect(screen.getByText('FEATURED INTEL')).toBeInTheDocument()
  })

  it('should render remaining posts in a grid container', () => {
    const { container } = render(<BlogIndex posts={makePosts(4)} categories={[]} initialCategory={null} />)
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
    // Grid should contain 3 posts (4 total minus 1 featured)
    const gridLinks = grid!.querySelectorAll('a')
    expect(gridLinks).toHaveLength(3)
  })
})

describe('Blog category filter', () => {
  it('renders an ALL button plus one button per provided category', () => {
    render(<BlogIndex posts={makePosts(3)} categories={BLOG_CATEGORIES} initialCategory={null} />)
    expect(screen.getByText('ALL')).toBeInTheDocument()
    for (const category of BLOG_CATEGORIES) {
      expect(screen.getByText(category.label)).toBeInTheDocument()
    }
  })

  it('maps every published post to at least one category', () => {
    const posts = getAllPosts()
    expect(posts.length).toBeGreaterThan(0)
    const orphans = posts
      .filter(p => getPostCategoryIds(p.tags).length === 0)
      .map(p => p.slug)
    expect(orphans).toEqual([])
  })

  it('filters the list to posts in the selected category', () => {
    const [base] = makePosts(1)
    const posts: BlogPost[] = [
      { ...base, slug: 'space-post', title: 'Solar Flare Watch', tags: ['space weather'] },
      { ...base, slug: 'severe-post', title: 'Tornado Outbreak', tags: ['tornadoes'] },
    ]
    render(<BlogIndex posts={posts} categories={BLOG_CATEGORIES} initialCategory={null} />)
    expect(screen.getByText('Solar Flare Watch')).toBeInTheDocument()
    expect(screen.getByText('Tornado Outbreak')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Severe Weather'))
    expect(screen.queryByText('Solar Flare Watch')).not.toBeInTheDocument()
    expect(screen.getByText('Tornado Outbreak')).toBeInTheDocument()
  })
})
