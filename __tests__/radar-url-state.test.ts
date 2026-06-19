import {
  DEFAULT_RADAR_LAYERS,
  DEFAULT_RADAR_TILE_PREFERENCES,
  DEFAULT_RADAR_ZOOM,
  mergeRadarUrlParams,
  parseRadarUrlState,
  serializeRadarUrlParams,
} from '@/lib/radar/radar-url-state'

describe('radar-url-state', () => {
  it('returns defaults when radar params are absent', () => {
    expect(parseRadarUrlState(new URLSearchParams('location=Chicago'))).toEqual({
      layers: DEFAULT_RADAR_LAYERS,
      frameIndex: null,
      zoom: null,
      tilePreferences: DEFAULT_RADAR_TILE_PREFERENCES,
      explicitLayers: false,
    })
  })

  it('parses custom layers, frame, and zoom', () => {
    const parsed = parseRadarUrlState(new URLSearchParams('layers=precip,spc&frame=12&zoom=8'))
    expect(parsed.layers).toEqual({
      precipitation: true,
      alerts: false,
      spc: true,
      stormReports: false,
    })
    expect(parsed.frameIndex).toBe(12)
    expect(parsed.zoom).toBe(8)
  })

  it('omits default radar params when serializing', () => {
    const params = serializeRadarUrlParams({
      layers: DEFAULT_RADAR_LAYERS,
      frameIndex: 48,
      zoom: DEFAULT_RADAR_ZOOM,
      frameCount: 49,
    })

    expect(params.get('layers')).toBeNull()
    expect(params.get('zoom')).toBeNull()
    expect(params.get('frame')).toBeNull()
  })

  it('serializes non-default layers, zoom, and historical frame', () => {
    const params = serializeRadarUrlParams({
      layers: {
        precipitation: true,
        alerts: false,
        spc: true,
        stormReports: false,
      },
      frameIndex: 10,
      zoom: 7,
      frameCount: 49,
    })

    expect(params.get('layers')).toBe('precip,spc')
    expect(params.get('zoom')).toBe('7')
    expect(params.get('frame')).toBe('10')
  })

  it('merges radar params without dropping location params', () => {
    const existing = new URLSearchParams('location=Chicago&lat=41.88&lon=-87.63')
    const radarParams = new URLSearchParams('layers=precip,spc&frame=3&zoom=9')
    const merged = mergeRadarUrlParams(existing, radarParams)

    expect(merged.get('location')).toBe('Chicago')
    expect(merged.get('lat')).toBe('41.88')
    expect(merged.get('layers')).toBe('precip,spc')
    expect(merged.get('frame')).toBe('3')
    expect(merged.get('zoom')).toBe('9')
  })
})
