import {
  buildFramesFromRainViewerPast,
  fetchRainViewerManifest,
  RAINVIEWER_ATTRIBUTION,
  RAINVIEWER_FRAME_STEP_MINUTES,
  RAINVIEWER_PAST_MINUTES,
  RAINVIEWER_TILE_COLOR_PARAM,
  RAINVIEWER_UNIVERSAL_BLUE_LEGEND,
} from '@/lib/radar/rainviewer'
import { getRadarCoverageRegion } from '@/lib/radar/providers/coverage'
import type {
  RadarLegendBand,
  RadarMetadata,
  RadarProvider,
  RadarProviderSelection,
} from '@/lib/radar/providers/types'

export const REFLECTIVITY_LEGEND: RadarLegendBand[] = [
  ...RAINVIEWER_UNIVERSAL_BLUE_LEGEND,
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
    urlTemplate: `https://tilecache.rainviewer.com/v2/radar/{epochSeconds}/512/{z}/{x}/{y}/${RAINVIEWER_TILE_COLOR_PARAM}/1_1.png`,
    direct: true,
  },
  notes: [
    'Global composite radar tiles from the RainViewer Weather Maps API.',
    'Frame list and tile host come from weather-maps.json.',
  ],
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
      colorScheme: RAINVIEWER_TILE_COLOR_PARAM,
      smooth: true,
      snow: true,
      tileSize: 512,
    },
  }
}
