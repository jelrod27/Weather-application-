/**
 * Title/summary derivation for generated posts.
 *
 * The pipeline shipped twelve titles that stop mid-word ("Two volcanoes on
 * U.S", "…at Vostok Station in ") and a 21-character summary. Two bugs did it:
 * sentence detection that split on abbreviation periods, and a raw `.slice()`
 * that cut the result mid-word. These tests pin both fixes.
 */

import {
  MAX_TITLE_LENGTH,
  buildPostSummary,
  buildPostTitle,
  deriveTheme,
  leadSentences,
  splitSentences,
  trimToWords,
} from '@/scripts/newsletter/post-header'

const VOLCANO_OPENER =
  'Two volcanoes on U.S. soil are currently demanding attention from aviation and climate scientists simultaneously. Great Sitkin, an Aleutian stratovolcano, is at Watch/Orange.'

describe('splitSentences', () => {
  it('does not break a sentence at an abbreviation period', () => {
    const [first] = splitSentences(VOLCANO_OPENER)
    expect(first).toBe(
      'Two volcanoes on U.S. soil are currently demanding attention from aviation and climate scientists simultaneously.',
    )
  })

  it('still breaks at real sentence boundaries', () => {
    expect(splitSentences('One thing happened. Another followed.')).toEqual([
      'One thing happened.',
      'Another followed.',
    ])
  })

  it('handles other common abbreviations', () => {
    expect(splitSentences('Mt. Tambora erupted in 1815. Crops failed.')).toHaveLength(2)
    expect(splitSentences('It hit at 3 p.m. local time and lasted an hour.')).toHaveLength(1)
  })
})

describe('trimToWords', () => {
  it('cuts on a word boundary, never mid-word', () => {
    expect(trimToWords('Arctic sea ice extent dropped sharply', 20)).toBe('Arctic sea ice')
  })

  it('drops a trailing preposition or article', () => {
    expect(trimToWords('a Soviet drill team at Vostok Station in East Antarctica', 40)).toBe(
      'a Soviet drill team at Vostok Station',
    )
    expect(trimToWords('the European Centre for Medium-Range Forecasts', 26)).toBe(
      'the European Centre',
    )
  })

  it('strips dangling punctuation left by the cut', () => {
    expect(trimToWords('sea ice extent dropped to 3.41 million km2 — roughly half', 43)).toBe(
      'sea ice extent dropped to 3.41 million km2',
    )
  })

  it('leaves text that already fits alone', () => {
    expect(trimToWords('Volcanoes & Atmospheric Impact', 60)).toBe(
      'Volcanoes & Atmospheric Impact',
    )
  })
})

describe('buildPostTitle', () => {
  it('produces a readable title within the SERP width', () => {
    const title = buildPostTitle('Volcanoes & Atmospheric Impact', VOLCANO_OPENER)
    expect(title).toBe('Volcanoes & Atmospheric Impact: Two volcanoes on U.S. soil')
    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH)
  })

  it('never ends on a preposition or a partial word', () => {
    const title = buildPostTitle(
      'Paleoclimate',
      'In 1989, a Soviet drill team at Vostok Station in East Antarctica pulled ice from a depth of 2,083 meters.',
    )
    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH)
    expect(title).not.toMatch(/\b(in|at|of|the|a|an|and|to|from|for|on)$/i)
    expect(title.endsWith(' ')).toBe(false)
  })

  it('falls back to the topic title when the model returns nothing usable', () => {
    expect(buildPostTitle('Volcanoes & Atmospheric Impact', '')).toBe(
      'Volcanoes & Atmospheric Impact',
    )
    expect(buildPostTitle('Marine Weather', 'Rogue')).toBe('Marine Weather')
  })

  it('trims an over-long topic title rather than overflowing', () => {
    const title = buildPostTitle(
      'A Very Long Topic Title That Runs Past The Sixty Character Budget',
      'some opening sentence about the weather',
    )
    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH)
  })
})

describe('deriveTheme', () => {
  it('keeps the whole opening sentence past an abbreviation', () => {
    const theme = deriveTheme(`# Heading\n\n${VOLCANO_OPENER}`, '', 'Volcanoes')
    expect(theme.startsWith('Two volcanoes on U.S. soil are currently demanding')).toBe(true)
    expect(theme.length).toBeGreaterThan(90)
  })

  it('pulls a second sentence when the first is too short to summarise', () => {
    const theme = deriveTheme(
      'Bergen sits at 60N. Anchorage sits at the same latitude but averages twelve degrees colder every January.',
      '',
      'Ocean Currents',
    )
    expect(theme).toContain('Anchorage')
  })

  it('skips headings and images', () => {
    const theme = deriveTheme(
      '## Rearview\n\n![A chart](https://example.com/a.png)\n\nSixty-seven confirmed tornadoes in seven days across the central plains.',
      '',
      'Weekly',
    )
    expect(theme.startsWith('Sixty-seven')).toBe(true)
  })

  it('falls back to the news angle, then the topic title', () => {
    expect(deriveTheme('', 'A quiet week for solar activity across the board.', 'Space Weather')).toBe(
      'A quiet week for solar activity across the board.',
    )
    expect(deriveTheme('', '', 'Space Weather')).toBe('Space Weather')
  })
})

describe('buildPostSummary', () => {
  it('produces a meta-description-shaped summary, not a 21-character stub', () => {
    const summary = buildPostSummary(deriveTheme(VOLCANO_OPENER, '', 'Volcanoes'), 'Volcanoes')
    expect(summary.length).toBeGreaterThanOrEqual(70)
    expect(summary.length).toBeLessThanOrEqual(158)
  })

  it('falls back to the topic title when there is no theme', () => {
    expect(buildPostSummary('', 'Volcanoes & Atmospheric Impact')).toBe(
      'Volcanoes & Atmospheric Impact',
    )
  })
})

describe('leadSentences', () => {
  it('returns whole sentences up to the cap', () => {
    const lead = leadSentences('One. Two. Three.', 4, 200)
    expect(lead).toBe('One.')
  })

  it('never exceeds the cap', () => {
    const lead = leadSentences(VOLCANO_OPENER, 90, 60)
    expect(lead.length).toBeLessThanOrEqual(60)
  })
})
