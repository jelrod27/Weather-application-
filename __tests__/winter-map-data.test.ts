import { getWinterMapState, validateWinterContours } from '@/components/winter/winter-map-data'
import type { WinterMapSnapshot, WinterContourFeature } from '@/lib/winter/types'

const NOW = Date.parse('2026-11-14T16:00:00Z')

function contour(rank = 1): WinterContourFeature {
  return {
    type: 'Feature',
    properties: { category: String(rank), label: `${rank * 10}%`, color: '#3366cc', rank },
    geometry: { type: 'Polygon', coordinates: [[[-105, 39], [-102, 39], [-102, 41], [-105, 39]]] },
  }
}

function snapshot(overrides: Partial<WinterMapSnapshot> = {}): WinterMapSnapshot {
  return {
    selection: { product: 'snow', day: 1, threshold: 4 },
    source: 'WPC', sourceUrl: 'https://www.wpc.ncep.noaa.gov/', coverage: 'Contiguous United States',
    status: 'available', issuedAt: '2026-11-14T12:00:00Z', validFrom: '2026-11-14T12:00:00Z',
    validTo: '2026-11-15T12:00:00Z', fetchedAt: '2026-11-14T15:59:00Z', message: null, legend: [],
    contours: { type: 'FeatureCollection', features: [contour()] }, ...overrides,
  }
}

describe('winter contour visibility', () => {
  it('keeps a current future-day outlook visible before its valid window begins', () => {
    expect(getWinterMapState(snapshot({ validFrom: '2026-11-15T00:00:00Z' }), NOW).status).toBe('available')
    expect(getWinterMapState(snapshot(), NOW).contours.features).toHaveLength(1)
  })

  it.each(['unavailable', 'stale'] as const)('clears contours when the source status is %s', status => {
    expect(getWinterMapState(snapshot({ status }), NOW).contours.features).toEqual([])
  })

  it('clears a missing snapshot and an expired snapshot at the exact valid-to boundary', () => {
    expect(getWinterMapState(null, NOW).contours.features).toEqual([])
    const result = getWinterMapState(snapshot({ validTo: '2026-11-14T16:00:00Z' }), NOW)
    expect(result.status).toBe('expired')
    expect(result.contours.features).toEqual([])
  })

  it.each([
    ['snow', '2026-11-13T10:00:00Z'],
    ['ice', '2026-11-13T09:59:59Z'],
    ['impacts', '2026-11-14T10:00:00Z'],
  ] as const)('hides %s after the issuance freshness ceiling', (product, issuedAt) => {
    const value = snapshot({ issuedAt, selection: { product, day: 1, threshold: 4 } })
    expect(getWinterMapState(value, NOW).status).toBe('stale')
    expect(getWinterMapState(value, NOW).contours.features).toEqual([])
  })

  it('rejects missing, invalid and reversed validity timestamps', () => {
    for (const overrides of [{ issuedAt: null }, { validFrom: 'bad' }, { validTo: null }, { validFrom: '2026-11-16T00:00:00Z' }]) {
      expect(getWinterMapState(snapshot(overrides), NOW).status).toBe('invalid')
    }
  })

  it('distinguishes verified empty outlooks from invalid geometry', () => {
    expect(getWinterMapState(snapshot({ status: 'empty', contours: { type: 'FeatureCollection', features: [] } }), NOW).status).toBe('empty')
    expect(getWinterMapState(snapshot({ contours: { type: 'FeatureCollection', features: [] } }), NOW).status).toBe('invalid')
  })
})

describe('winter contour geometry', () => {
  it('sorts nested contours low-to-high without mutating the source collection', () => {
    const original = { type: 'FeatureCollection', features: [contour(9), contour(1), contour(5)] }
    expect(validateWinterContours(original).features.map(feature => feature.properties.rank)).toEqual([1, 5, 9])
    expect(original.features.map(feature => feature.properties.rank)).toEqual([9, 1, 5])
  })

  it('preserves multipolygon geometry and polygon holes', () => {
    const value = contour()
    const polygon = { ...value.geometry, coordinates: [...value.geometry.coordinates, [[-104, 39.5], [-103, 39.5], [-103, 40], [-104, 39.5]]] }
    const result = validateWinterContours({ type: 'FeatureCollection', features: [{ ...value, geometry: { type: 'MultiPolygon', coordinates: [polygon.coordinates] } }] })
    expect(result.features[0]?.geometry).toEqual({ type: 'MultiPolygon', coordinates: [polygon.coordinates] })
  })

  it.each([
    null,
    { type: 'Point', coordinates: [-105, 40] },
    { type: 'Polygon', coordinates: [] },
    { type: 'Polygon', coordinates: [[[-105, 39], [-102, 39], [-102, 41]]] },
    { type: 'Polygon', coordinates: [[[-105, 39], [-102, 39], [-102, Infinity], [-105, 39]]] },
    { type: 'Polygon', coordinates: [[[-205, 39], [-102, 39], [-102, 41], [-205, 39]]] },
    { type: 'MultiPolygon', coordinates: [null] },
  ])('filters malformed or unsupported geometry safely: %j', geometry => {
    const result = validateWinterContours({ type: 'FeatureCollection', features: [{ ...contour(), geometry }, contour(2)] })
    expect(result.features.map(feature => feature.properties.rank)).toEqual([2])
  })

  it.each([{ color: 'url(https://untrusted.test)' }, { rank: NaN }, { label: null }, { category: null }])('filters invalid style properties: %j', properties => {
    expect(validateWinterContours({ type: 'FeatureCollection', features: [{ ...contour(), properties: { ...contour().properties, ...properties } }] }).features).toEqual([])
  })

  it('handles an invalid collection without throwing', () => {
    expect(validateWinterContours({ type: 'FeatureCollection', features: null }).features).toEqual([])
  })
})
