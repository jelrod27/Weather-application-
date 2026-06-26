import {
  buildRainViewerCoverageTileTemplate,
  buildRainViewerRadarTileTemplate,
  formatRainViewerTileOptions,
} from '@/lib/radar/rainviewer/tile-url'

describe('RainViewer tile URLs', () => {
  it('formats smooth/snow option suffix', () => {
    expect(formatRainViewerTileOptions({ smooth: true, snow: true })).toBe('1_1')
    expect(formatRainViewerTileOptions({ smooth: false, snow: true })).toBe('0_1')
  })

  it('builds proxied radar tile template by default', () => {
    const template = buildRainViewerRadarTileTemplate(
      'https://tilecache.rainviewer.com',
      '/v2/radar/abc123',
      { size: 512, colorScheme: 6, smooth: true, snow: true },
    )

    expect(template).toBe('/api/radar/tile/v2/radar/abc123/512/{z}/{x}/{y}/6/1_1.png')
  })

  it('builds direct radar tile template when proxy disabled', () => {
    const template = buildRainViewerRadarTileTemplate(
      'https://tilecache.rainviewer.com/',
      'v2/radar/abc123',
      { size: 256, colorScheme: 2, smooth: false, snow: false },
      false,
    )

    expect(template).toBe(
      'https://tilecache.rainviewer.com/v2/radar/abc123/256/{z}/{x}/{y}/2/0_0.png',
    )
  })

  it('builds proxied coverage tile template by default', () => {
    const template = buildRainViewerCoverageTileTemplate('https://tilecache.rainviewer.com', {
      size: 512,
    })

    expect(template).toBe('/api/radar/tile/v2/coverage/0/512/{z}/{x}/{y}/0/0_0.png')
  })
})
