import {
  getRainViewerDisplayFilter,
  RAINVIEWER_TILE_COLOR_PARAM,
} from '@/lib/radar/rainviewer/color-schemes'

describe('RainViewer display color schemes', () => {
  it('uses a single tile color param for upstream fetches', () => {
    expect(RAINVIEWER_TILE_COLOR_PARAM).toBe(2)
  })

  it('returns distinct client-side filters per display scheme', () => {
    const filters = new Set([1, 2, 4, 6, 8].map(getRainViewerDisplayFilter))
    expect(filters.size).toBeGreaterThan(1)
    expect(getRainViewerDisplayFilter(2)).toBe('none')
    expect(getRainViewerDisplayFilter(8)).not.toBe(getRainViewerDisplayFilter(1))
  })
})
