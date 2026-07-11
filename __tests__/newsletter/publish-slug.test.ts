import { buildPublishHeaderForTest } from '@/scripts/newsletter/publish'
import type { PublishSundayInput, PublishWednesdayInput } from '@/scripts/newsletter/publish'

const baseWednesday: Omit<PublishWednesdayInput, 'theme' | 'topicSlug' | 'topicTitle'> = {
  cadence: 'wednesday_topic',
  body: 'Body',
  openerHash: 'abc',
  keyPhrases: [],
  similarityMax: 0,
  similarityJudge: 'test',
  modelUsed: 'test',
  images: [],
  spotlight: null,
  retries: 0,
  wordCount: 100,
  closerUsed: 'test',
}

describe('newsletter publish slug/title SEO', () => {
  it('uses topic-slug + date for Wednesday posts instead of first-sentence prose', () => {
    const input: PublishWednesdayInput = {
      ...baseWednesday,
      topicSlug: 'ocean_currents',
      topicTitle: 'Ocean Currents & Heat Transport',
      theme:
        'Bergen, Norway sits at 60.4 N — roughly the same latitude as Anchorage — yet its winters stay mild because of the Gulf Stream.',
    }

    const header = buildPublishHeaderForTest(input, '2026-06-06')

    expect(header.slug).toBe('ocean-currents-2026-06-06')
    expect(header.slug).not.toContain('bergen')
    expect(header.slug.length).toBeLessThanOrEqual(40)
    expect(header.title.startsWith('Ocean Currents')).toBe(true)
    expect(header.title.length).toBeLessThanOrEqual(70)
  })

  it('falls back to topic title when Wednesday theme is empty', () => {
    const input: PublishWednesdayInput = {
      ...baseWednesday,
      topicSlug: 'volcanoes',
      topicTitle: 'Volcanoes & Atmospheric Impact',
      theme: '',
    }

    const header = buildPublishHeaderForTest(input, '2026-06-06')

    expect(header.slug).toBe('volcanoes-2026-06-06')
    expect(header.title).toBe('Volcanoes & Atmospheric Impact')
    expect(header.summary).toBe('Volcanoes & Atmospheric Impact')
  })

  it('dates Sunday weekly titles for clearer SERP snippets', () => {
    const input: PublishSundayInput = {
      cadence: 'sunday_rearview',
      body: 'Body',
      openerHash: 'abc',
      keyPhrases: [],
      similarityMax: 0,
      similarityJudge: 'test',
      modelUsed: 'test',
      images: [],
      spotlight: null,
      retries: 0,
      wordCount: 100,
      closerUsed: 'test',
    }

    const header = buildPublishHeaderForTest(input, '2026-06-14')

    expect(header.slug).toBe('this-week-in-weather-2026-06-14')
    expect(header.title).toBe('This Week in Weather — June 14, 2026')
    expect(header.summary).toContain('June 14, 2026')
  })
})
