import { getGuideContent } from '@/lib/education/content'
import { getCloudBySlug } from '@/lib/education/entries'
import { buildGuideJsonLd, buildGuideMetadata, type GuideSeoInput } from '@/lib/education/guide-seo'

type Graph = { '@type': string; [key: string]: unknown }

function graphOf(schema: Record<string, unknown>): Graph[] {
  return schema['@graph'] as Graph[]
}

function cirrusInput(): GuideSeoInput {
  const cloud = getCloudBySlug('cirrus')!
  return {
    kind: 'cloud',
    slug: 'cirrus',
    name: cloud.name,
    fallbackDescription: cloud.description16bit,
    guide: getGuideContent('cloud', 'cirrus'),
  }
}

describe('buildGuideJsonLd', () => {
  it('emits an Article with both dates, an absolute image and its citations', () => {
    const input = cirrusInput()
    expect(input.guide).not.toBeNull()
    const [article] = graphOf(buildGuideJsonLd(input))

    expect(article['@type']).toBe('Article')
    expect(article.headline).toBe('Cirrus — Cloud Atlas')
    expect(article.url).toBe('https://www.16bitweather.co/education/cloud-types/cirrus')
    expect(article.datePublished).toBe(input.guide!.generated)
    expect(article.dateModified).toBe(input.guide!.reviewed)
    expect(article.datePublished).not.toBe(article.dateModified)
    expect(String(article.image)).toMatch(/^https:\/\/www\.16bitweather\.co\/api\/og\?title=Cirrus&subtitle=/)
    expect(article.citation).toEqual(input.guide!.sources.map((source) => source.url))
  })

  it('reports the one date it has for both when a Guide was never regenerated', () => {
    // Cumulonimbus was hand-reviewed before the generator existed and carries
    // no `generated` date.
    const guide = getGuideContent('cloud', 'cumulonimbus')!
    expect(guide.generated).toBe('')
    const [article] = graphOf(
      buildGuideJsonLd({ ...cirrusInput(), slug: 'cumulonimbus', name: 'Cumulonimbus', guide }),
    )
    expect(article.datePublished).toBe(guide.reviewed)
    expect(article.dateModified).toBe(guide.reviewed)
  })

  it('adds a three-crumb BreadcrumbList that matches the visible crumbs', () => {
    const [, breadcrumb] = graphOf(buildGuideJsonLd(cirrusInput()))
    expect(breadcrumb['@type']).toBe('BreadcrumbList')
    expect(breadcrumb.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Education', item: 'https://www.16bitweather.co/education' },
      { '@type': 'ListItem', position: 2, name: 'Cloud Atlas', item: 'https://www.16bitweather.co/cloud-types' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Cirrus',
        item: 'https://www.16bitweather.co/education/cloud-types/cirrus',
      },
    ])
  })

  it('still describes an Entry without a Guide, minus the dates and citations', () => {
    const [article, breadcrumb] = graphOf(
      buildGuideJsonLd({
        kind: 'weather-system',
        slug: 'depressions',
        name: 'Depressions',
        fallbackDescription: 'A low that is deepening.',
        guide: null,
        keywords: 'LOW PRESSURE',
      }),
    )
    expect(article.headline).toBe('Depressions — Weather Systems Guide')
    expect(article.description).toBe('A low that is deepening.')
    expect(article.keywords).toBe('LOW PRESSURE')
    expect(article).not.toHaveProperty('datePublished')
    expect(article).not.toHaveProperty('dateModified')
    expect(article).not.toHaveProperty('citation')
    expect(article.image).toBeDefined()
    expect((breadcrumb.itemListElement as Graph[])[1].name).toBe('Weather Systems')
  })
})

describe('buildGuideMetadata', () => {
  it('sets an Open Graph and Twitter image for every kind, not just weather systems', () => {
    const metadata = buildGuideMetadata(cirrusInput())
    expect(metadata.title).toBe('Cirrus — Cloud Atlas | 16 Bit Weather')
    expect(metadata.alternates?.canonical).toBe('https://www.16bitweather.co/education/cloud-types/cirrus')
    const og = metadata.openGraph as { images: { url: string; alt: string }[] }
    expect(og.images[0].url).toMatch(/^\/api\/og\?title=Cirrus/)
    expect(og.images[0].alt).toBe('Cirrus — Cloud Atlas')
    const twitter = metadata.twitter as { card: string; images: string[] }
    expect(twitter.card).toBe('summary_large_image')
    expect(twitter.images[0]).toBe(og.images[0].url)
  })
})
