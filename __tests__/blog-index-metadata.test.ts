/**
 * Metadata for /blog: bare titles under the root template, canonical URLs that
 * keep page 1 on /blog, `noindex, follow` on the filter views, and the RSS
 * alternate that made the feed discoverable.
 */

import { notFound } from 'next/navigation'

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

const RSS = { 'application/rss+xml': 'https://www.16bitweather.co/blog/rss.xml' }

async function metadataFor(searchParams: Record<string, string>) {
  const { generateMetadata } = await import('@/app/blog/page')
  return generateMetadata({ searchParams: Promise.resolve(searchParams) })
}

describe('/blog metadata', () => {
  it('uses a short bare title so the root template adds the brand once', async () => {
    const metadata = await metadataFor({})
    expect(metadata.title).toBe('Weather Blog')
    expect(String(metadata.title)).not.toContain('16 Bit Weather')
    expect(String(metadata.title).length).toBeLessThanOrEqual(43)
  })

  it('keeps page 1 canonical on /blog', async () => {
    expect((await metadataFor({})).alternates?.canonical).toBe('https://www.16bitweather.co/blog')
    expect((await metadataFor({ page: '1' })).alternates?.canonical).toBe(
      'https://www.16bitweather.co/blog',
    )
  })

  it('self-canonicalises deeper pages and keeps them indexable', async () => {
    const metadata = await metadataFor({ page: '3' })
    expect(metadata.alternates?.canonical).toBe('https://www.16bitweather.co/blog?page=3')
    expect(metadata.robots).toBeUndefined()
    expect(metadata.title).toBe('Weather Blog — Page 3')
  })

  it('noindexes filtered views and points them at /blog', async () => {
    for (const params of [{ category: 'severe-weather' }, { tag: 'tornadoes' }]) {
      const metadata = await metadataFor(params)
      expect(metadata.robots).toEqual({ index: false, follow: true })
      expect(metadata.alternates?.canonical).toBe('https://www.16bitweather.co/blog')
    }
  })

  it('advertises the RSS feed on every variant', async () => {
    for (const params of [{}, { page: '2' }, { category: 'severe-weather' }]) {
      expect((await metadataFor(params)).alternates?.types).toEqual(RSS)
    }
  })
})

describe('/blog pagination bounds', () => {
  beforeEach(() => {
    ;(notFound as unknown as jest.Mock).mockClear()
  })

  it('404s a page number past the end of the archive', async () => {
    const { default: BlogPage } = await import('@/app/blog/page')
    await expect(
      BlogPage({ searchParams: Promise.resolve({ page: '999' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('404s a page number that is not a positive integer', async () => {
    const { default: BlogPage } = await import('@/app/blog/page')
    await expect(
      BlogPage({ searchParams: Promise.resolve({ page: 'two' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('serves page 1 without calling notFound', async () => {
    const { default: BlogPage } = await import('@/app/blog/page')
    await BlogPage({ searchParams: Promise.resolve({}) })
    expect(notFound).not.toHaveBeenCalled()
  })
})
