import { render, screen, within } from '@testing-library/react'
import { z } from 'zod'

import PhenomenonGuide from '@/components/education/phenomenon-guide'
import { weatherPhenomena } from '@/data/fun-facts'
import { buildGuideJsonLd } from '@/lib/education/guide-seo'
import type { ReactNode } from 'react'
import type { GuideContent } from '@/lib/education/content'

jest.mock('@/components/page-wrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

const shared = { label: 'Shared source', url: 'https://www.weather.gov/shared' }
const guideOnly = { label: 'Guide source', url: 'https://www.weather.gov/guide' }
const entryOnly = { label: 'Entry source', url: 'https://www.weather.gov/entry' }
const phenomenon = { ...weatherPhenomena[0], sources: [shared, entryOnly] }
const guide: GuideContent = {
  kind: 'phenomenon', slug: phenomenon.id, title: phenomenon.name,
  summary: 'A sourced phenomenon guide.', body: 'The guide body.',
  reviewed: '2026-09-25', generated: '', diagrams: [], sources: [shared, guideOnly],
}
const citationGraph = z.object({ '@graph': z.array(z.object({
  '@type': z.string(), citation: z.array(z.string()).optional(),
})) })

describe('PhenomenonGuide sources', () => {
  it('renders one Sources section with every citation exactly once, matching its metadata', () => {
    render(<PhenomenonGuide phenomenon={phenomenon} guide={guide} />)

    expect(screen.getAllByText('Sources', { exact: true })).toHaveLength(1)
    const sources = screen.getByRole('heading', { name: 'Sources' }).closest('section')!
    const urls = within(sources).getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(urls).toEqual([shared.url, guideOnly.url, entryOnly.url])
    expect(within(sources).getByText('Checked against sources 2026-09-25')).toBeTruthy()

    const schema = citationGraph.parse(buildGuideJsonLd({
      kind: 'phenomenon', slug: phenomenon.id, name: phenomenon.name,
      fallbackDescription: phenomenon.description, guide, sources: phenomenon.sources,
    }))
    expect(schema['@graph'].find((node) => node['@type'] === 'Article')?.citation).toEqual(urls)
  })

  it('retains Entry citations when the Guide has no sources of its own', () => {
    render(<PhenomenonGuide phenomenon={phenomenon} guide={{ ...guide, sources: [] }} />)

    const sources = screen.getByRole('heading', { name: 'Sources' }).closest('section')!
    expect(within(sources).getAllByRole('link').map((link) => link.getAttribute('href')))
      .toEqual([shared.url, entryOnly.url])
  })
})
