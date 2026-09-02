import { parseAltitudeRange } from '@/lib/education/altitude'
import { getGuideContent, getGuideSlugs, isAllowedSourceUrl, isCalendarDate } from '@/lib/education/content'
import { getDiagram, getDiagramIds, isKnownDiagramId } from '@/lib/education/diagrams'
import { buildGuideSegments } from '@/lib/education/guide-layout'
import { cloudDatabase } from '@/data/cloud-types'
import {
  getCloudBySlug,
  getPhenomenonBySlug,
  getWeatherSystemBySlug,
} from '@/lib/education/entries'

describe('parseAltitudeRange', () => {
  it('parses every altitudeRange in the cloud database', () => {
    const unparsed = cloudDatabase
      .filter((cloud) => parseAltitudeRange(cloud.altitudeRange) === null)
      .map((cloud) => `${cloud.name}: ${cloud.altitudeRange}`)
    expect(unparsed).toEqual([])
  })

  it('strips thousands separators and records an open top', () => {
    expect(parseAltitudeRange('1,000-60,000+ ft')).toEqual({
      baseFt: 1000,
      topFt: 60000,
      openTop: true,
    })
    expect(parseAltitudeRange('20,000-40,000 ft')).toEqual({
      baseFt: 20000,
      topFt: 40000,
      openTop: false,
    })
  })

  it('ignores a metric gloss after the feet value', () => {
    expect(parseAltitudeRange('49,000-82,000 ft (15-25 km)')).toEqual({
      baseFt: 49000,
      topFt: 82000,
      openTop: false,
    })
  })

  it('returns null rather than guessing at unusable input', () => {
    expect(parseAltitudeRange('')).toBeNull()
    expect(parseAltitudeRange(undefined)).toBeNull()
    expect(parseAltitudeRange('very high up')).toBeNull()
    // A reversed range would invert the diagram, so it is refused.
    expect(parseAltitudeRange('40,000-20,000 ft')).toBeNull()
  })
})

describe('diagram registry', () => {
  it('resolves registered diagrams', () => {
    expect(isKnownDiagramId('storm-cross-section')).toBe(true)
    expect(getDiagram('cloud-altitude-plot')?.id).toBe('cloud-altitude-plot')
    expect(getDiagramIds().length).toBeGreaterThan(0)
  })

  it('refuses ids nobody registered, including inherited object keys', () => {
    expect(getDiagram('not-a-diagram')).toBeNull()
    expect(isKnownDiagramId('not-a-diagram')).toBe(false)
    expect(getDiagram('constructor')).toBeNull()
    expect(getDiagram('__proto__')).toBeNull()
  })

  it('gives every registered diagram a caption', () => {
    for (const id of getDiagramIds()) {
      expect(getDiagram(id)?.caption).toBeTruthy()
    }
  })

  it('reports a diagram as unrenderable when it would draw nothing', () => {
    // Otherwise the <figure> and its caption are committed before the component
    // returns null, stranding a caption with no diagram above it.
    const plot = getDiagram('cloud-altitude-plot')!
    const cumulonimbus = getCloudBySlug('cumulonimbus')!

    expect(plot.isRenderable!({})).toBe(false)
    expect(plot.isRenderable!({ cloud: cumulonimbus })).toBe(true)
    expect(plot.isRenderable!({ cloud: { ...cumulonimbus, altitudeRange: 'high altitude' } })).toBe(
      false,
    )
  })
})

describe('getGuideContent', () => {
  it('loads the cumulonimbus Guide', () => {
    const guide = getGuideContent('cloud', 'cumulonimbus')
    expect(guide).not.toBeNull()
    expect(guide?.title).toBe('Cumulonimbus')
    expect(guide?.summary.length).toBeGreaterThan(40)
    // Depth is the point of the Guide (planning/adr/0001); the template it
    // replaced rendered a median of 84 words.
    expect(guide!.body.split(/\s+/).length).toBeGreaterThan(600)
  })

  it('reads the generation date the publisher writes, as YYYY-MM-DD', () => {
    // publish.ts quotes `generated`, so it arrives as a string; `reviewed` is
    // unquoted and arrives as a Date. Both must come out the same shape.
    const guide = getGuideContent('cloud', 'cirrus')
    expect(guide?.generated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(guide?.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('rejects a frontmatter date that is not a real calendar day', () => {
    // V8 rolls 2026-02-30 over to March 1 instead of failing, so without the
    // round-trip check a typo would reach the sitemap and the JSON-LD as a
    // date the Guide never declared.
    expect(isCalendarDate('2026-02-28')).toBe(true)
    expect(isCalendarDate('2026-02-30')).toBe(false)
    expect(isCalendarDate('2026-13-01')).toBe(false)
    expect(isCalendarDate('2026-1-5')).toBe(false)
    expect(isCalendarDate('2026-08-29T00:00:00Z')).toBe(false)
    expect(isCalendarDate('')).toBe(false)
  })

  it('returns null for an Entry with no Guide', () => {
    // Cirrostratus, not one of the 29 published Guides: planning/adr/0001 keeps
    // it an Atlas row, so it is the one kind of Entry guaranteed never to gain
    // a Guide. This assertion used to name cirrus, which the generator then
    // wrote a Guide for — the test asserted the exact state the pipeline
    // exists to change. Do not swap this back to a featured slug.
    expect(getCloudBySlug('cirrostratus')).toBeDefined()
    expect(getGuideContent('cloud', 'cirrostratus')).toBeNull()
  })

  it('refuses slugs that could escape the content directory', () => {
    expect(getGuideContent('cloud', '../../../etc/passwd')).toBeNull()
    expect(getGuideContent('cloud', '..%2Fcumulonimbus')).toBeNull()
    expect(getGuideContent('cloud', 'Cumulonimbus')).toBeNull()
    expect(getGuideContent('cloud', '')).toBeNull()
  })

  it('keeps every citation the loader is willing to accept', () => {
    const guide = getGuideContent('cloud', 'cumulonimbus')
    expect(guide!.sources.length).toBe(6)
    // Asserted against the loader's own rule rather than a looser restatement
    // of it, so a citation the loader silently drops cannot pass here.
    for (const source of guide!.sources) {
      expect(isAllowedSourceUrl(source.url)).toBe(true)
    }
  })

  it('keeps only diagram ids that exist in the registry', () => {
    const guide = getGuideContent('cloud', 'cumulonimbus')
    expect(guide!.diagrams.length).toBeGreaterThan(0)
    for (const diagram of guide!.diagrams) {
      expect(isKnownDiagramId(diagram.id)).toBe(true)
    }
  })

  it('keeps the review date that YAML hands back as a Date', () => {
    // `reviewed: 2026-08-29` is a YAML timestamp, so gray-matter returns a Date
    // and a string-only read dropped it — the page lost its "Checked against
    // sources" line and its JSON-LD lost dateModified, with a green build.
    const guide = getGuideContent('cloud', 'cumulonimbus')
    expect(guide!.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('lists slugs that have Guides', () => {
    expect(getGuideSlugs('cloud')).toContain('cumulonimbus')
    // Shape, not count. A kind whose content directory does not exist yet
    // returns [] rather than throwing; asserting emptiness would break on the
    // first phenomenon Guide, which is expected work rather than a regression.
    expect(Array.isArray(getGuideSlugs('phenomenon'))).toBe(true)
  })
})

describe('buildGuideSegments', () => {
  const body = ['First block here.', '## A heading', 'Second block here.'].join('\n\n')

  it('places a diagram after the block its anchor matches', () => {
    const segments = buildGuideSegments(body, [{ id: 'x', insertAfter: 'First block' }])
    expect(segments).toHaveLength(2)
    expect(segments[0].diagramId).toBe('x')
    expect(segments[0].markdown).toBe('First block here.')
    expect(segments[1].diagramId).toBeNull()
    expect(segments[1].markdown).toContain('Second block here.')
  })

  it('matches across a hard-wrapped line break', () => {
    // The anchor is one phrase in the source; markdown wrapping splits it.
    const wrapped = 'a cloud that crosses all\nthree at once, base to anvil.'
    const segments = buildGuideSegments(wrapped, [
      { id: 'x', insertAfter: 'crosses all three at once' },
    ])
    expect(segments[0].diagramId).toBe('x')
  })

  it('drops a diagram whose anchor matches nothing', () => {
    const segments = buildGuideSegments(body, [{ id: 'x', insertAfter: 'nowhere in the text' }])
    expect(segments).toHaveLength(1)
    expect(segments[0].diagramId).toBeNull()
  })

  it('returns the whole body as one segment when there are no diagrams', () => {
    const segments = buildGuideSegments(body, [])
    expect(segments).toHaveLength(1)
    expect(segments[0].markdown).toBe(body)
  })

  it('renders two diagrams anchored to the same block back to back', () => {
    const segments = buildGuideSegments(body, [
      { id: 'a', insertAfter: 'First block' },
      { id: 'b', insertAfter: 'First block' },
    ])
    expect(segments.map((s) => s.diagramId)).toEqual(['a', 'b', null])
    expect(segments[1].markdown).toBe('')
  })
})

describe('isAllowedSourceUrl', () => {
  it('accepts official meteorological hosts over https', () => {
    expect(isAllowedSourceUrl('https://www.weather.gov/safety/thunderstorm')).toBe(true)
    expect(isAllowedSourceUrl('https://forecast.weather.gov/glossary.php?word=anvil')).toBe(true)
    expect(isAllowedSourceUrl('https://www.spc.noaa.gov/faq/')).toBe(true)
  })

  it('refuses lookalikes, unlisted hosts and plaintext', () => {
    // A suffix match would let this through, which is why the rule is exact.
    expect(isAllowedSourceUrl('https://notweather.gov/safety')).toBe(false)
    expect(isAllowedSourceUrl('https://weather.gov.example.com/safety')).toBe(false)
    expect(isAllowedSourceUrl('http://www.weather.gov/safety')).toBe(false)
    expect(isAllowedSourceUrl('https://en.wikipedia.org/wiki/Cumulonimbus')).toBe(false)
    expect(isAllowedSourceUrl('not a url')).toBe(false)
  })
})

describe('Guide slugs correspond to Entries', () => {
  // A mistyped filename would otherwise be filtered out of generateStaticParams
  // and the Guide would be silently unreachable. All three kinds render Guides
  // now, so all three are checked.
  it('resolves every cloud Guide filename to a cloud Entry', () => {
    expect(getGuideSlugs('cloud').filter((slug) => !getCloudBySlug(slug))).toEqual([])
  })

  it('resolves every weather-system Guide filename to a weather-system Entry', () => {
    expect(
      getGuideSlugs('weather-system').filter((slug) => !getWeatherSystemBySlug(slug)),
    ).toEqual([])
  })

  it('resolves every phenomenon Guide filename to a phenomenon Entry', () => {
    expect(getGuideSlugs('phenomenon').filter((slug) => !getPhenomenonBySlug(slug))).toEqual([])
  })
})
