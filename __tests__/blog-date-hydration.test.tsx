/** @jest-environment node */

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { BlogArticle } from '@/app/blog/[slug]/blog-article'
import { BlogIndex } from '@/app/blog/blog-index'
import type { BlogPost } from '@/lib/blog'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}))

jest.mock('@/components/page-wrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/share-buttons', () => ({
  ShareButtons: () => <div />,
}))

const post: BlogPost = {
  slug: 'sunday-outlook',
  title: 'Sunday Outlook',
  date: '2026-11-16T02:43:17.365Z',
  author: '16bitbot',
  summary: 'A weekly weather outlook.',
  tags: ['weather'],
  heroImage: '',
  readTime: 3,
  content: 'Article body.',
}

const related: BlogPost = {
  ...post,
  slug: 'previous-outlook',
  title: 'Previous Outlook',
  date: '2026-11-15T23:30:00.000Z',
}

/** Emulate each environment's default zone, honoring any explicit formatter zone. */
function dateLabels(element: React.ReactElement, defaultTimeZone: string): string[] {
  const toLocaleDateString = Date.prototype.toLocaleDateString
  const formatter = jest.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(
    function (this: Date, locales, options) {
      return toLocaleDateString.call(this, locales, { timeZone: defaultTimeZone, ...options })
    },
  )
  try {
    return renderToStaticMarkup(element).match(/\bNOV(?:EMBER)? \d{1,2}, 2026\b/g) ?? []
  } finally {
    formatter.mockRestore()
  }
}

describe.each(['America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Tokyo'])(
  'blog hydration dates in %s',
  timeZone => {
    it('keeps article and related-post dates identical to the UTC server render', () => {
      const element = <BlogArticle post={post} relatedPosts={[related]} />
      const serverDates = dateLabels(element, 'UTC')

      expect(serverDates).toEqual(['NOVEMBER 16, 2026', 'NOV 15, 2026'])
      expect(dateLabels(element, timeZone)).toEqual(serverDates)
    })

    it('keeps featured and grid-card dates identical to the UTC server render', () => {
      const element = (
        <BlogIndex
          posts={[post, related]}
          categories={[]}
          activeCategory={null}
          activeTag={null}
          activeTagLabel={null}
          page={1}
          totalPages={1}
          totalPosts={2}
        />
      )
      const serverDates = dateLabels(element, 'UTC')

      expect(serverDates).toEqual(['NOVEMBER 16, 2026', 'NOV 15, 2026'])
      expect(dateLabels(element, timeZone)).toEqual(serverDates)
    })
  },
)
