/**
 * Article JSON-LD for blog posts.
 *
 * The route used to hand this to Next as `metadata.other`, which renders as
 * `<meta name="application/ld+json" content="…">` — markup no structured-data
 * parser reads. These tests pin the replacement: a pure builder the page
 * renders inside a real <script>, and metadata that no longer carries `other`.
 */

import type { BlogPost } from '@/lib/blog'
import { buildBlogPostJsonLd } from '@/lib/blog/post-jsonld'

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

function graphNode(jsonLd: Record<string, unknown>, type: string): Record<string, unknown> {
  const graph = jsonLd['@graph'] as Array<Record<string, unknown>>
  const node = graph.find(entry => entry['@type'] === type)
  if (!node) throw new Error(`no ${type} in @graph`)
  return node
}

describe('buildBlogPostJsonLd', () => {
  it('emits an Article and a BreadcrumbList in one @graph', () => {
    const jsonLd = buildBlogPostJsonLd(mockPost)
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect((jsonLd['@graph'] as unknown[]).length).toBe(2)
  })

  it('describes the post on the Article node', () => {
    const article = graphNode(buildBlogPostJsonLd(mockPost), 'Article')

    expect(article.headline).toBe('Test Weather Post')
    expect(article.description).toBe('A test blog post about weather')
    expect(article.datePublished).toBe('2026-01-15T00:00:00.000Z')
    expect(article.author).toEqual({ '@type': 'Person', name: '16bitbot' })
    expect(article.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://www.16bitweather.co/blog/test-weather-post',
    })
    expect(article.keywords).toBe('weather, testing')
    expect(article.articleSection).toBe('Weather')
  })

  it('names 16 Bit Weather as publisher with an absolute logo', () => {
    const article = graphNode(buildBlogPostJsonLd(mockPost), 'Article')

    expect(article.publisher).toEqual({
      '@type': 'Organization',
      name: '16 Bit Weather',
      url: 'https://www.16bitweather.co',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.16bitweather.co/icon-512.png',
        width: 512,
        height: 512,
      },
    })
  })

  it('reports dateModified from `updated` when the post has been revised', () => {
    const revised = { ...mockPost, updated: '2026-03-02T12:00:00.000Z' }
    expect(graphNode(buildBlogPostJsonLd(revised), 'Article').dateModified).toBe(
      '2026-03-02T12:00:00.000Z',
    )
  })

  it('falls back to datePublished for posts never revised', () => {
    expect(graphNode(buildBlogPostJsonLd(mockPost), 'Article').dateModified).toBe(
      '2026-01-15T00:00:00.000Z',
    )
  })

  it('uses the hero image when it is already an absolute URL', () => {
    const post = { ...mockPost, heroImage: 'https://cdn.star.nesdis.noaa.gov/hero.jpg' }
    expect(graphNode(buildBlogPostJsonLd(post), 'Article').image).toBe(
      'https://cdn.star.nesdis.noaa.gov/hero.jpg',
    )
  })

  it('falls back to the absolute generated banner for a relative or empty hero', () => {
    for (const heroImage of ['/images/test.png', '']) {
      const image = graphNode(buildBlogPostJsonLd({ ...mockPost, heroImage }), 'Article').image
      expect(image).toBe(
        'https://www.16bitweather.co/api/og/blog?title=Test%20Weather%20Post&subtitle=16bitbot+Weekly+Dispatch',
      )
    }
  })

  it('walks Home → Blog → post in the BreadcrumbList', () => {
    const breadcrumb = graphNode(buildBlogPostJsonLd(mockPost), 'BreadcrumbList')

    expect(breadcrumb.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.16bitweather.co' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.16bitweather.co/blog' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Test Weather Post',
        item: 'https://www.16bitweather.co/blog/test-weather-post',
      },
    ])
  })
})

describe('Blog post metadata', () => {
  it('no longer smuggles JSON-LD through metadata.other', async () => {
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-weather-post' }),
    })

    expect(metadata.other).toBeUndefined()
  })

  it('opts out of the brand template so a headline is not cut mid-phrase', async () => {
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-weather-post' }),
    })

    // Post headlines run to 60 characters on their own; adding the 17-character
    // brand suffix would render a title Google truncates.
    expect(metadata.title).toEqual({ absolute: 'Test Weather Post' })
  })

  it('keeps every published post headline inside the search-result budget', async () => {
    const { getAllPosts } = await import('@/lib/blog')

    const overBudget = getAllPosts()
      .filter((post) => post.title.length > 60)
      .map((post) => `${post.slug} (${post.title.length})`)

    expect(overBudget).toEqual([])
  })

  it('advertises the RSS feed alongside the canonical', async () => {
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-weather-post' }),
    })

    expect(metadata.alternates?.canonical).toBe(
      'https://www.16bitweather.co/blog/test-weather-post',
    )
    expect(metadata.alternates?.types).toEqual({
      'application/rss+xml': 'https://www.16bitweather.co/blog/rss.xml',
    })
  })

  it('noindexes a missing post', async () => {
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'nonexistent-post' }),
    })

    expect(metadata.title).toBe('Post Not Found')
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
