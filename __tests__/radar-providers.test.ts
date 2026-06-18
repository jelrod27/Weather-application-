import {
  buildRadarMetadata,
  getRadarCoverageRegion,
  selectRadarProvider,
} from '@/lib/radar'

describe('radar providers', () => {
  const now = Date.UTC(2026, 5, 18, 21, 40, 0)

  it('selects NOAA MRMS with Iowa fallback for US locations', () => {
    const selection = selectRadarProvider(40.7128, -74.006)

    expect(selection.selectedProvider.id).toBe('noaa-mrms')
    expect(selection.fallbackProvider?.id).toBe('iowa-nexrad')
  })

  it('selects MSC GeoMet with RainViewer fallback for Canada locations', () => {
    const selection = selectRadarProvider(53.5461, -113.4938)

    expect(selection.selectedProvider.id).toBe('canada-geomet')
    expect(selection.fallbackProvider?.id).toBe('rainviewer')
  })

  it('selects RainViewer fallback for Mexico and broader North America', () => {
    expect(getRadarCoverageRegion(19.4326, -99.1332)).toBe('north-america-fallback')
    expect(selectRadarProvider(19.4326, -99.1332).selectedProvider.id).toBe('rainviewer')
  })

  it('uses RainViewer as a degraded global fallback outside North America', () => {
    expect(getRadarCoverageRegion(51.5072, -0.1276)).toBe('global')
    expect(selectRadarProvider(51.5072, -0.1276).selectedProvider.id).toBe('rainviewer')
  })

  it('builds metadata with provider-specific frame windows', () => {
    const us = buildRadarMetadata(40.7128, -74.006, now)
    const canada = buildRadarMetadata(53.5461, -113.4938, now)

    expect(us.selectedProvider.id).toBe('noaa-mrms')
    expect(us.frames).toHaveLength(49)
    expect(canada.selectedProvider.id).toBe('canada-geomet')
    expect(canada.frames).toHaveLength(31)
    expect(canada.legend[0].value).toContain('dBZ')
  })
})
