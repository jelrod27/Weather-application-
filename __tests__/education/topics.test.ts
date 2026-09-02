import { getShareableGuideEntries } from '@/lib/education/entries'
import { GUIDE_TOPICS, getGuideTopics, getRelatedGuides, topicKey } from '@/lib/education/topics'
import { GUIDE_DIRECTION } from '../../scripts/education/topics'

const publishedKeys = () =>
  new Set(getShareableGuideEntries().map((entry) => topicKey(entry.kind, entry.slug)))

describe('GUIDE_TOPICS', () => {
  it('tags exactly the 29 published Guide URLs', () => {
    const tagged = new Set(Object.keys(GUIDE_TOPICS))
    const published = publishedKeys()
    expect([...tagged].filter((key) => !published.has(key))).toEqual([])
    expect([...published].filter((key) => !tagged.has(key))).toEqual([])
  })

  it('gives every Guide at least two distinct tags, so it can relate to something', () => {
    const thin = Object.entries(GUIDE_TOPICS)
      .filter(([, tags]) => tags.length < 2 || new Set(tags).size !== tags.length)
      .map(([key]) => key)
    expect(thin).toEqual([])
  })

  it('has a drafting brief for every tagged Guide and no orphaned brief', () => {
    // GUIDE_BRIEFS throws at import when a brief has no tags; this is the
    // other direction, so a Guide cannot be tagged for the page yet skipped by
    // the generator.
    expect(Object.keys(GUIDE_DIRECTION).sort()).toEqual(Object.keys(GUIDE_TOPICS).sort())
  })

  it('returns no tags for an Entry outside the published set', () => {
    expect(getGuideTopics('cloud', 'cirrostratus')).toEqual([])
  })
})

describe('getRelatedGuides', () => {
  it('links only to published Guide URLs, never to the page itself', () => {
    const published = publishedKeys()
    for (const entry of getShareableGuideEntries()) {
      const related = getRelatedGuides(entry.kind, entry.slug)
      expect(related.length).toBeLessThanOrEqual(3)
      for (const pick of related) {
        expect(pick.href).not.toBe(entry.href)
        expect(published.has(topicKey(pick.kind, pick.slug))).toBe(true)
      }
    }
  })

  it('offers at least one neighbour to every published Guide', () => {
    const lonely = getShareableGuideEntries()
      .filter((entry) => getRelatedGuides(entry.kind, entry.slug).length === 0)
      .map((entry) => entry.href)
    expect(lonely).toEqual([])
  })

  it('ranks a shared first tag above any number of shared later tags', () => {
    // Cumulonimbus: clouds, thunderstorms, severe, lightning. Cumulus shares the
    // first tag (weight 8); squall lines share thunderstorms + severe (4 + 2).
    const hrefs = getRelatedGuides('cloud', 'cumulonimbus', 29).map((entry) => entry.href)
    expect(hrefs.indexOf('/education/cloud-types/cumulus')).toBeLessThan(
      hrefs.indexOf('/education/weather-systems/squall-lines'),
    )
  })

  it('crosses kinds when the tags do', () => {
    const kinds = new Set(getRelatedGuides('phenomenon', 'thundersnow', 29).map((entry) => entry.kind))
    expect(kinds.has('weather-system')).toBe(true)
  })

  it('is deterministic and honours the limit', () => {
    const first = getRelatedGuides('weather-system', 'cyclones', 2)
    const second = getRelatedGuides('weather-system', 'cyclones', 2)
    expect(first).toHaveLength(2)
    expect(first).toEqual(second)
  })

  it('returns nothing for an Entry with no tags', () => {
    expect(getRelatedGuides('cloud', 'cirrostratus')).toEqual([])
  })
})
