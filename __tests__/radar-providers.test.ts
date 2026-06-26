import { buildRadarMetadata, selectRadarProvider } from '@/lib/radar'

const sampleManifest = {
  version: '2.0',
  generated: 1718841600,
  host: 'https://tilecache.rainviewer.com',
  radar: {
    past: Array.from({ length: 13 }, (_, index) => ({
      time: 1718841600 - (12 - index) * 600,
      path: `/v2/radar/${1718841600 - (12 - index) * 600}`,
    })),
  },
}

describe('radar providers', () => {
  const fetchMock = jest.fn(async () => ({
    ok: true,
    json: async () => sampleManifest,
  })) as unknown as typeof fetch

  beforeEach(() => {
    fetchMock.mockClear()
  })

  it('selects RainViewer for all coverage regions', () => {
    expect(selectRadarProvider(40.7128, -74.006).selectedProvider.id).toBe('rainviewer')
    expect(selectRadarProvider(53.5461, -113.4938).selectedProvider.id).toBe('rainviewer')
    expect(selectRadarProvider(19.4326, -99.1332).selectedProvider.id).toBe('rainviewer')
    expect(selectRadarProvider(51.5072, -0.1276).selectedProvider.id).toBe('rainviewer')
  })

  it('builds metadata from the RainViewer manifest', async () => {
    const metadata = await buildRadarMetadata(40.7128, -74.006, fetchMock)

    expect(metadata.selectedProvider.id).toBe('rainviewer')
    expect(metadata.frames).toHaveLength(13)
    expect(metadata.rainviewer.host).toBe('https://tilecache.rainviewer.com')
    expect(metadata.coverageRegion).toBe('us')
    expect(metadata.frames.at(-1)?.isLive).toBe(true)
  })
})
