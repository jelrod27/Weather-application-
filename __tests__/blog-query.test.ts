/**
 * The /blog index URL surface: tag slugs, filter/page parsing, and the hrefs
 * that link them. `?tag=` used to link a filter the page never implemented,
 * and pagination lived in React state, so posts 11+ had no URL at all.
 */

import {
  POSTS_PER_PAGE,
  blogIndexHref,
  blogPageSlice,
  blogTotalPages,
  filterBlogPosts,
  parseBlogIndexQuery,
  tagSlug,
} from '@/lib/blog/query'

describe('tagSlug', () => {
  it('collapses every spelling of a tag to one URL form', () => {
    expect(tagSlug('Severe Weather')).toBe('severe-weather')
    expect(tagSlug('severe weather')).toBe('severe-weather')
    expect(tagSlug('severe-weather')).toBe('severe-weather')
    expect(tagSlug('  SEVERE   WEATHER  ')).toBe('severe-weather')
  })

  it('drops punctuation rather than percent-encoding it', () => {
    expect(tagSlug('Volcanoes & Ash')).toBe('volcanoes-ash')
    expect(tagSlug('el niño')).toBe('el-ni-o')
  })
})

describe('parseBlogIndexQuery', () => {
  it('defaults to the unfiltered first page', () => {
    expect(parseBlogIndexQuery({})).toEqual({ category: null, tag: null, page: 1 })
  })

  it('accepts a known category and ignores an unknown one', () => {
    expect(parseBlogIndexQuery({ category: 'space-weather' }).category).toBe('space-weather')
    expect(parseBlogIndexQuery({ category: 'not-a-category' }).category).toBeNull()
  })

  it('normalises the tag parameter', () => {
    expect(parseBlogIndexQuery({ tag: 'Severe Weather' }).tag).toBe('severe-weather')
    expect(parseBlogIndexQuery({ tag: '' }).tag).toBeNull()
  })

  it('takes the first value when a parameter repeats', () => {
    expect(parseBlogIndexQuery({ tag: ['tornadoes', 'aurora'], page: ['2', '9'] })).toEqual({
      category: null,
      tag: 'tornadoes',
      page: 2,
    })
  })

  it('returns a null page for anything that is not a positive integer', () => {
    for (const page of ['0', '-2', '1.5', 'two', '', ' 3']) {
      expect(parseBlogIndexQuery({ page }).page).toBeNull()
    }
    expect(parseBlogIndexQuery({ page: '3' }).page).toBe(3)
  })
})

describe('filterBlogPosts', () => {
  const posts = [
    { slug: 'a', tags: ['Severe Weather', 'tornadoes'] },
    { slug: 'b', tags: ['space weather'] },
    { slug: 'c', tags: ['severe-weather'] },
  ]

  it('matches tags case- and separator-insensitively', () => {
    const matched = filterBlogPosts(posts, { category: null, tag: 'severe-weather' })
    expect(matched.map(p => p.slug)).toEqual(['a', 'c'])
  })

  it('filters by category', () => {
    const matched = filterBlogPosts(posts, { category: 'space-weather', tag: null })
    expect(matched.map(p => p.slug)).toEqual(['b'])
  })

  it('composes both filters', () => {
    expect(filterBlogPosts(posts, { category: 'space-weather', tag: 'tornadoes' })).toEqual([])
  })

  it('returns everything when neither filter is set', () => {
    expect(filterBlogPosts(posts, { category: null, tag: null })).toHaveLength(3)
  })
})

describe('pagination', () => {
  const posts = Array.from({ length: POSTS_PER_PAGE * 2 + 3 }, (_, i) => i)

  it('reports at least one page, even for an empty list', () => {
    expect(blogTotalPages(0)).toBe(1)
    expect(blogTotalPages(POSTS_PER_PAGE)).toBe(1)
    expect(blogTotalPages(POSTS_PER_PAGE + 1)).toBe(2)
    expect(blogTotalPages(posts.length)).toBe(3)
  })

  it('slices the page a reader asked for', () => {
    expect(blogPageSlice(posts, 1)).toEqual(posts.slice(0, POSTS_PER_PAGE))
    expect(blogPageSlice(posts, 3)).toEqual(posts.slice(POSTS_PER_PAGE * 2))
  })
})

describe('blogIndexHref', () => {
  it('keeps page 1 on the bare /blog URL', () => {
    expect(blogIndexHref()).toBe('/blog')
    expect(blogIndexHref({ page: 1 })).toBe('/blog')
  })

  it('adds ?page= from page 2 onward', () => {
    expect(blogIndexHref({ page: 4 })).toBe('/blog?page=4')
  })

  it('composes filters with pagination', () => {
    expect(blogIndexHref({ category: 'space-weather', page: 2 })).toBe(
      '/blog?category=space-weather&page=2',
    )
    expect(blogIndexHref({ tag: 'severe-weather' })).toBe('/blog?tag=severe-weather')
  })
})
