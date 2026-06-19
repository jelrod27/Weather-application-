import type { RadarFrame } from '@/lib/radar/radar-timestamps'
import {
  buildFramesFromRainViewerPast,
  fetchRainViewerManifest,
  RAINVIEWER_ATTRIBUTION,
  RAINVIEWER_FRAME_STEP_MINUTES,
  RAINVIEWER_PAST_MINUTES,
} from '@/lib/radar/rainviewer'
import { getRadarCoverageRegion } from '@/lib/radar/providers/coverage'
import type {
  RadarLegendBand,
  RadarMetadata,
  RadarProvider,
  RadarProviderId,
  RadarProviderSelection,
} from '@/lib/radar/providers/types'

export const REFLECTIVITY_LEGEND: RadarLegendBand[] = [
  { color: '#93e4dd', label: 'Light', value: '5-20 dBZ' },
  { color: '#00c800', label: 'Moderate', value: '20-35 dBZ' },
  { color: '#ffff00', label: 'Heavy', value: '35-50 dBZ' },
  { color: '#ff8c00', label: 'Very Heavy', value: '50-65 dBZ' },
  { color: '#ff0000', label: 'Extreme', value: '65+ dBZ' },
]

export const RAINVIEWER_PROVIDER: RadarProvider = {
  id: 'rainviewer',
  displayName: 'RainViewer Radar',
  shortName: 'RainViewer',
  coverage: 'global',
  protocol: 'xyz',
  attribution: RAINVIEWER_ATTRIBUTION,
  refreshIntervalSeconds: 300,
  frameStepMinutes: RAINVIEWER_FRAME_STEP_MINUTES,
  pastMinutes: RAINVIEWER_PAST_MINUTES,
  supportsAnimation: true,
  qualityTier: 'community',
  xyz: {
    urlTemplate: 'https://tilecache.rainviewer.com/v2/radar/{epochSeconds}/256/{z}/{x}/{y}/2/1_1.png',
    direct: true,
  },
  notes: [
    'Global composite radar tiles from the RainViewer Weather Maps API.',
    'Frame list and tile host come from weather-maps.json.',
  ],
}

export const RADAR_PROVIDERS: Record<RadarProviderId, RadarProvider> = {
  rainviewer: RAINVIEWER_PROVIDER,
}

export function getRadarProvider(id: RadarProviderId): RadarProvider {
  return RADAR_PROVIDERS[id]
}

export function selectRadarProvider(latitude: number, longitude: number): RadarProviderSelection {
  const region = getRadarCoverageRegion(latitude, longitude)
  return {
    selectedProvider: RAINVIEWER_PROVIDER,
    reason: `RainViewer global composite selected for ${region} coverage region.`,
  }
}

export async function buildRadarMetadata(
  latitude: number,
  longitude: number,
  fetchImpl?: typeof fetch,
): Promise<RadarMetadata> {
  const selection = selectRadarProvider(latitude, longitude)
  const manifest = await fetchRainViewerManifest(fetchImpl)
  const frames = buildFramesFromRainViewerPast(manifest.past)

  return {
    location: { lat: latitude, lon: longitude },
    generatedAt: new Date(manifest.generated * 1000).toISOString(),
    selectedProvider: selection.selectedProvider,
    frames,
    refreshIntervalSeconds: RAINVIEWER_PROVIDER.refreshIntervalSeconds,
    legend: REFLECTIVITY_LEGEND,
    selectionReason: selection.reason,
    coverageRegion: getRadarCoverageRegion(latitude, longitude),
    rainviewer: {
      host: manifest.host,
      generated: manifest.generated,
      version: manifest.version,
      colorScheme: 2,
      smooth: true,
      snow: true,
      tileSize: 256,
    },
  }
}
