/**
 * Tests for Article JSON-LD structured data on blog post pages
 * Ensures blog posts include proper schema.org Article markup for SEO
 */

import type { BlogPost } from '@/lib/blog'

// Mock the blog module before importing the page
const mockPost: BlogPost = {
  slug: 'test-weather-post',
  title: 'Test Weather Post',
  date: '2026-01-15T00:00:00.000Z',
  author: '16bitbot',
  summary: 'A test blog post about weather',
  tags: ['weather', 'testing'],
  heroImage: '/images/test.png',
  readTime: 3,
  content: 'Test content here.',
}

jest.mock('@/lib/blog', () => ({
  getPostBySlug: jest.fn((slug: string) => {
    if (slug === 'test-weather-post') return mockPost
    return null
  }),
  getAllPosts: jest.fn(() => [mockPost]),
  getRelatedPosts: jest.fn(() => []),
}))

describe('Blog post JSON-LD structured data', () => {
  it('should include Article JSON-LD in generateMetadata', async () => {
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-weather-post' }),
    })

    expect(metadata.other).toBeDefined()
    const jsonLd = (metadata.other as Record<string, string>)['application/ld+json']
    expect(jsonLd).toBeDefined()

    const parsed = JSON.parse(jsonLd)
    expect(parsed['@context']).toBe('https://schema.org')
    expect(parsed['@type']).toBe('Article')
    expect(parsed.headline).toBe('Test Weather Post')
    expect(parsed.description).toBe('A test blog post about weather')
    expect(parsed.datePublished).toBe('2026-01-15T00:00:00.000Z')
    expect(parsed.dateModified).toBe('2026-01-15T00:00:00.000Z')
    expect(parsed.author).toEqual({ '@type': 'Person', name: '16bitbot' })
    expect(parsed.publisher).toEqual({
      '@type': 'Organization',
      name: '16 Bit Weather',
      url: 'https://www.16bitweather.co',
    })
    expect(parsed.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://www.16bitweather.co/blog/test-weather-post',
    })
    expect(parsed.keywords).toBe('weather, testing')
    expect(parsed.articleSection).toBe('Weather')
  })

  it('should not include JSON-LD when post is not found', async () => {
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'nonexistent-post' }),
    })

    expect(metadata.title).toBe('Post Not Found')
    expect(metadata.robots).toEqual({ index: false, follow: false })
    expect(metadata.other).toBeUndefined()
  })
})
