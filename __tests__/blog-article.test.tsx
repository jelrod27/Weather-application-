import React from 'react'
import { render, screen } from '@testing-library/react'
import type { BlogPost } from '@/lib/blog'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { src: string; alt: string }) => <div role="img" aria-label={alt} />,
}))

jest.mock('@/components/page-wrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/share-buttons', () => ({
  ShareButtons: () => <div data-testid="share-buttons" />,
}))

import { BlogArticle } from '@/app/blog/[slug]/blog-article'

const basePost: BlogPost = {
  slug: 'sunday-outlook',
  title: 'Sunday Outlook',
  date: '2026-10-11T12:00:00.000Z',
  author: '16bitbot',
  summary: 'A weekly weather outlook.',
  tags: ['Weather'],
  heroImage: '',
  readTime: 3,
  content: 'Article body.\n\n## Source coverage\n\nCoverage details.',
}

describe('BlogArticle source coverage disclosure', () => {
  it('renders complete coverage in a disclosure', () => {
    const post = { ...basePost, coverageStatus: 'complete' as const }
    const { container } = render(<BlogArticle post={post} relatedPosts={[]} />)

    expect(screen.getByText('Article body.')).toBeInTheDocument()
    expect(screen.getByText('Source coverage and data limitations')).toBeInTheDocument()
    expect(container.querySelector('details')).toHaveTextContent('Coverage details.')
    expect(screen.queryByText(/Some source data was incomplete/)).not.toBeInTheDocument()
  })

  it('shows an incomplete coverage notice for partial coverage', () => {
    const post = { ...basePost, coverageStatus: 'partial' as const }
    render(<BlogArticle post={post} relatedPosts={[]} />)

    expect(screen.getByText(/Some source data was incomplete/)).toBeInTheDocument()
    expect(screen.getByText('Source coverage and data limitations')).toBeInTheDocument()
  })

  it('keeps legacy source coverage headings in the article body', () => {
    render(<BlogArticle post={basePost} relatedPosts={[]} />)

    expect(screen.getByText(/Article body\.\s+## Source coverage\s+Coverage details\./)).toBeInTheDocument()
    expect(screen.queryByText('Source coverage and data limitations')).not.toBeInTheDocument()
    expect(screen.queryByText(/Some source data was incomplete/)).not.toBeInTheDocument()
  })
})
