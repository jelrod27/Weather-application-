import { normalizeWinterOutlook, winterLayerUrl, parseWinterSourceTime } from '@/lib/winter/outlooks'
import type { WinterMapSelection } from '@/lib/winter/types'

const now = Date.parse('2026-11-14T17:00:00Z')
const selection: WinterMapSelection = { product: 'snow', day: 1, threshold: 4 }
const polygon = { type: 'Polygon', coordinates: [[[-110, 40], [-109, 40], [-109, 41], [-110, 40]]] }
function feature(properties: Record<string, unknown> = {}) {
  return { type: 'Feature', geometry: polygon, properties: {
    issue_time: '2026-11-14 08:26:53', start_time: '2026-11-14 12:00:00',
    end_time: '2026-11-15 12:00:00', outlook: 'Slight (10-39%)', idp_source: 'wwd_day1_psnow_gt_04', ...properties,
  } }
}
const collection = (features: unknown[]) => ({ type: 'FeatureCollection', features })

describe('winter national outlook fidelity', () => {
  it('uses fixed official service and threshold/day layer IDs', () => {
    expect(winterLayerUrl({ product: 'snow', day: 3, threshold: 12 })).toMatch(/wpc_prob_winter_precip\/MapServer\/13\/query/)
    expect(winterLayerUrl({ product: 'ice', day: 2, threshold: 4 })).toMatch(/MapServer\/9\/query/)
    expect(winterLayerUrl({ product: 'impacts', day: 2, threshold: 4 })).toMatch(/wpc_wssi\/MapServer\/2\/query/)
  })
  it('parses NOAA timestamp formats explicitly as UTC', () => {
    expect(parseWinterSourceTime('2026-11-14 1516Z')).toBe('2026-11-14T15:16:00.000Z')
    expect(parseWinterSourceTime('15Z 11/14/26')).toBe('2026-11-14T15:00:00.000Z')
    expect(parseWinterSourceTime('2026-11-14 08:26:53')).toBe('2026-11-14T08:26:53.000Z')
    expect(parseWinterSourceTime('2026-02-30 08:00:00')).toBeNull()
    expect(parseWinterSourceTime('not a date')).toBeNull()
  })
  it('preserves category ranges rather than inventing exact probabilities', () => {
    const result = normalizeWinterOutlook(collection([feature(), feature({ outlook: 'High (70-100%)' })]), selection, now)
    expect(result.status).toBe('available')
    expect(result.issuedAt).toBe('2026-11-14T08:26:53.000Z')
    expect(result.contours.features.map(f => f.properties.label)).toEqual(['Slight · 10–39%', 'High · 70–100%'])
    expect(result.validFrom).toBe('2026-11-14T12:00:00.000Z')
  })
  it('accepts below-ten-percent contours as a source category, not zero risk', () => {
    const result = normalizeWinterOutlook(collection([feature({ outlook: 'Less than 10 percent' })]), selection, now)
    expect(result.contours.features[0].properties.label).toBe('Less than 10%')
    expect(result.status).toBe('available')
  })
  it('keeps WSSI impact categories separate from amounts', () => {
    const result = normalizeWinterOutlook(collection([feature({ issue_time: '2026-11-14 1516Z', start_time: '15Z 11/14/26', end_time: '12Z 11/15/26', impact: 'MODERATE', idp_source: 'WSSI_OVERALL_Day_1' })]), { ...selection, product: 'impacts' }, now)
    expect(result.status).toBe('available')
    expect(result.contours.features[0].properties.label).toBe('Moderate impacts')
  })
  it.each([
    ['mixed cycles', collection([feature(), feature({ issue_time: '2026-11-14 09:00:00' })])],
    ['unknown category', collection([feature({ outlook: 'Catastrophic 99%' })])],
    ['wrong source product', collection([feature({ idp_source: 'wwd_day1_psnow_gt_12' })])],
    ['missing metadata', collection([feature({ start_time: null })])],
    ['inverted validity', collection([feature({ end_time: '2026-11-14 11:00:00' })])],
    ['future issue timestamp', collection([feature({ issue_time: '2026-11-15 08:00:00' })])],
    ['invalid polygon', collection([{ ...feature(), geometry: { type: 'Polygon', coordinates: [] } }])],
    ['truncated features', { ...collection([feature()]), exceededTransferLimit: true }],
  ])('rejects %s instead of showing misleading partial maps', (_, body) => {
    const result = normalizeWinterOutlook(body, selection, now)
    expect(result.status).toBe('unavailable')
    expect(result.contours.features).toHaveLength(0)
  })
  it('does not claim no hazard for an empty response with no cycle validity', () => {
    const result = normalizeWinterOutlook(collection([]), selection, now)
    expect(result.status).toBe('unavailable')
    expect(result.message).toMatch(/validity/i)
  })
  it('hides expired forecasts and overly old source issuance', () => {
    for (const body of [collection([feature({ start_time: '2026-11-13 12:00:00', end_time: '2026-11-14 12:00:00' })]), collection([feature({ issue_time: '2026-11-12 08:00:00' })])]) {
      const result = normalizeWinterOutlook(body, selection, now)
      expect(result.status).toBe('stale')
      expect(result.contours.features).toHaveLength(0)
    }
  })
})
