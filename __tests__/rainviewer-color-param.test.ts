import {
  RAINVIEWER_TILE_COLOR_PARAM,
  RAINVIEWER_UNIVERSAL_BLUE_LEGEND,
} from '@/lib/radar/rainviewer'
import {
  buildRadarMetadata,
  RAINVIEWER_PROVIDER,
} from '@/lib/radar/providers/registry'

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response
}

describe('RainViewer tile color', () => {
  it('uses the supported Universal Blue palette everywhere tiles are configured', async () => {
    expect(RAINVIEWER_TILE_COLOR_PARAM).toBe(2)
    expect(RAINVIEWER_PROVIDER.xyz?.urlTemplate).toContain(`/${RAINVIEWER_TILE_COLOR_PARAM}/`)

    const radarMetadata = await buildRadarMetadata(35.47, -97.52, async () =>
      jsonResponse({
        version: '2.0',
        generated: 1_788_868_800,
        host: 'https://tilecache.rainviewer.com',
        radar: {
          past: [{ time: 1_788_868_800, path: '/v2/radar/1788868800' }],
          nowcast: [],
        },
        satellite: { infrared: [] },
      }))
    expect(radarMetadata.rainviewer.colorScheme).toBe(RAINVIEWER_TILE_COLOR_PARAM)
  })

  it('uses representative values from the official Universal Blue rain table', () => {
    expect(RAINVIEWER_UNIVERSAL_BLUE_LEGEND).toEqual([
      { color: '#88ddee', label: 'Light', value: '10-20 dBZ' },
      { color: '#0077aa', label: 'Moderate', value: '20-35 dBZ' },
      { color: '#ffaa00', label: 'Heavy', value: '35-45 dBZ' },
      { color: '#c10000', label: 'Very Heavy', value: '45-55 dBZ' },
      { color: '#ff77ff', label: 'Intense', value: '55-65 dBZ' },
      { color: '#ffffff', label: 'Extreme', value: '65+ dBZ' },
    ])
  })
})
