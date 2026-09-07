/**
 * Tests for blog index layout: featured hero card + smaller grid cards, plus
 * the link-driven filters and pagination that replaced the old React state.
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

import { render, screen } from '@testing-library/react'
import { getAllPosts, getPostCategoryIds, BLOG_CATEGORIES } from '@/lib/blog'
import type { BlogCategory } from '@/lib/blog'
import type { BlogIndexCard } from '@/app/blog/blog-index'

const makePosts = (count: number): BlogIndexCard[] =>
  Array.from({ length: count }, (_, i) => ({
    slug: `post-${i}`,
    title: `Post Title ${i}`,
    date: new Date(2026, 3, 5 - i).toISOString(),
    author: '16bitbot',
    summary: `Summary for post ${i}`,
    tags: ['weather', 'testing'],
    heroImage: i === 0 ? '/api/og/blog?title=Featured' : '',
    readTime: 3,
  }))

type BlogIndexProps = {
  posts: BlogIndexCard[]
  categories: BlogCategory[]
  activeCategory: string | null
  activeTag: string | null
  activeTagLabel: string | null
  page: number
  totalPages: number
  totalPosts: number
}

let BlogIndex: React.ComponentType<BlogIndexProps>

const defaults = {
  categories: [] as BlogCategory[],
  activeCategory: null,
  activeTag: null,
  activeTagLabel: null,
  page: 1,
  totalPages: 1,
}

const renderIndex = (props: Partial<BlogIndexProps> & { posts: BlogIndexCard[] }) =>
  render(
    <BlogIndex
      {...defaults}
      totalPosts={props.posts.length}
      {...(props as BlogIndexProps)}
    />,
  )

beforeAll(async () => {
  const mod = await import('@/app/blog/blog-index')
  BlogIndex = mod.BlogIndex as React.ComponentType<BlogIndexProps>
})

describe('Blog index layout', () => {
  it('should render a FEATURED INTEL badge on the first post', () => {
    renderIndex({ posts: makePosts(4) })
    expect(screen.getByText('FEATURED INTEL')).toBeInTheDocument()
  })

  it('should render remaining posts in a grid container', () => {
    const { container } = renderIndex({ posts: makePosts(4) })
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
    // Grid should contain 3 posts (4 total minus 1 featured)
    expect(grid!.querySelectorAll('a')).toHaveLength(3)
  })

  it('drops the hero card on pages after the first', () => {
    renderIndex({ posts: makePosts(4), page: 2, totalPages: 3, totalPosts: 24 })
    expect(screen.queryByText('FEATURED INTEL')).not.toBeInTheDocument()
    expect(screen.getByText('Post Title 0')).toBeInTheDocument()
  })
})

describe('Blog category filter', () => {
  it('renders an ALL link plus one link per provided category', () => {
    renderIndex({ posts: makePosts(3), categories: BLOG_CATEGORIES })
    expect(screen.getByText('ALL')).toHaveAttribute('href', '/blog')
    for (const category of BLOG_CATEGORIES) {
      expect(screen.getByText(category.label)).toHaveAttribute(
        'href',
        `/blog?category=${category.id}`,
      )
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

  it('keeps an active tag when switching category', () => {
    renderIndex({
      posts: makePosts(2),
      categories: BLOG_CATEGORIES,
      activeTag: 'tornadoes',
      activeTagLabel: 'tornadoes',
    })
    expect(screen.getByText('Severe Weather')).toHaveAttribute(
      'href',
      '/blog?category=severe-weather&tag=tornadoes',
    )
    expect(screen.getByText('CLEAR')).toHaveAttribute('href', '/blog')
  })
})

describe('Blog pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = renderIndex({ posts: makePosts(3) })
    expect(container.querySelector('nav[aria-label="Blog pagination"]')).toBeNull()
  })

  it('links every page, with page 1 on the bare /blog URL', () => {
    renderIndex({ posts: makePosts(10), page: 2, totalPages: 3, totalPosts: 24 })

    expect(screen.getByText('NEWER')).toHaveAttribute('href', '/blog')
    expect(screen.getByText('OLDER')).toHaveAttribute('href', '/blog?page=3')
    expect(screen.getByText('1')).toHaveAttribute('href', '/blog')
    expect(screen.getByText('3')).toHaveAttribute('href', '/blog?page=3')
    // The current page is marked, not linked.
    expect(screen.getByText('2')).toHaveAttribute('aria-current', 'page')
  })

  it('carries the active filter into every page link', () => {
    renderIndex({
      posts: makePosts(10),
      page: 1,
      totalPages: 2,
      totalPosts: 14,
      activeCategory: 'space-weather',
    })
    expect(screen.getByText('OLDER')).toHaveAttribute(
      'href',
      '/blog?category=space-weather&page=2',
    )
  })
})
