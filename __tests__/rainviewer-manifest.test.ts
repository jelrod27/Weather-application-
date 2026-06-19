import {
  buildFramesFromRainViewerPast,
  formatRainViewerHistoryLabel,
  normalizeRainViewerManifest,
} from '@/lib/radar/rainviewer'

describe('RainViewer manifest helpers', () => {
  const sampleManifest = {
    version: '2.0',
    generated: 1718841600,
    host: 'https://tilecache.rainviewer.com',
    radar: {
      past: [
        { time: 1718840400, path: '/v2/radar/1718840400' },
        { time: 1718841000, path: '/v2/radar/1718841000' },
        { time: 1718841600, path: '/v2/radar/1718841600' },
      ],
    },
  }

  it('normalizes manifest payload', () => {
    const manifest = normalizeRainViewerManifest(sampleManifest)
    expect(manifest.host).toBe('https://tilecache.rainviewer.com')
    expect(manifest.past).toHaveLength(3)
  })

  it('builds frames with LIVE on the newest frame', () => {
    const manifest = normalizeRainViewerManifest(sampleManifest)
    const frames = buildFramesFromRainViewerPast(manifest.past)

    expect(frames).toHaveLength(3)
    expect(frames[2].isLive).toBe(true)
    expect(frames[0].tilePath).toBe('/v2/radar/1718840400')
    expect(frames[0].offsetMinutes).toBe(-20)
  })

  it('formats a 2-hour label for a full RainViewer loop', () => {
    expect(formatRainViewerHistoryLabel(13)).toBe('-2h')
  })
})
