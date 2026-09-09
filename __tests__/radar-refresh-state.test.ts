import type { RadarMetadata } from '@/lib/radar'
import {
  initialRadarRefreshState,
  reduceRadarRefreshState,
} from '@/lib/radar/radar-refresh-state'

const sampleMetadata: RadarMetadata = {
  location: { lat: 35.47, lon: -97.52 },
  generatedAt: '2026-09-08T12:00:00.000Z',
  selectedProvider: {
    id: 'rainviewer',
    displayName: 'RainViewer Radar',
    shortName: 'RainViewer',
    coverage: 'global',
    protocol: 'xyz',
    attribution: 'RainViewer',
    refreshIntervalSeconds: 300,
    frameStepMinutes: 10,
    pastMinutes: 120,
    supportsAnimation: true,
    qualityTier: 'community',
    notes: ['Global composite radar tiles from RainViewer.'],
  },
  frames: [
    {
      timestamp: 1_788_868_800_000,
      isoTime: '2026-09-08T12:00:00.000Z',
      epochSeconds: 1_788_868_800,
      offsetMinutes: 0,
      isLive: true,
      tilePath: '/v2/radar/1788868800',
    },
  ],
  refreshIntervalSeconds: 300,
  legend: [{ color: '#93e4dd', label: 'Light', value: '5-20 dBZ' }],
  selectionReason: 'RainViewer global composite selected for US coverage region.',
  coverageRegion: 'us',
  rainviewer: {
    host: 'https://tilecache.rainviewer.com',
    generated: 1_788_868_800,
    version: '2.0',
    colorScheme: 2,
    smooth: true,
    snow: true,
    tileSize: 512,
  },
}

describe('reduceRadarRefreshState', () => {
  it('keeps the last good metadata when a refresh fails', () => {
    const ready = reduceRadarRefreshState(initialRadarRefreshState, {
      type: 'loaded',
      metadata: sampleMetadata,
    })

    expect(
      reduceRadarRefreshState(ready, {
        type: 'failed',
        message: 'Radar refresh failed',
      }),
    ).toEqual({ metadata: sampleMetadata, error: 'Radar refresh failed' })
  })
})
