import type { RadarFrame } from '@/lib/radar/radar-timestamps'
import type { RadarCoverageRegion } from '@/lib/radar/providers/coverage'

export type RadarProviderId = 'rainviewer'

export type RadarProviderCoverage = 'global'

export type RadarProviderProtocol = 'xyz'

export interface RadarWmsConfig {
  url: string
  params: Record<string, string>
  serverType?: 'mapserver' | 'geoserver'
  timeParam: string
  direct: boolean
}

export interface RadarXyzConfig {
  urlTemplate: string
  direct: boolean
}

export interface RadarLegendBand {
  color: string
  label: string
  value: string
}

export interface RadarProvider {
  id: RadarProviderId
  displayName: string
  shortName: string
  coverage: RadarProviderCoverage
  protocol: RadarProviderProtocol
  attribution: string
  refreshIntervalSeconds: number
  frameStepMinutes: number
  pastMinutes: number
  supportsAnimation: boolean
  qualityTier: 'official' | 'community' | 'fallback'
  wms?: RadarWmsConfig
  xyz?: RadarXyzConfig
  fallbackProviderId?: RadarProviderId
  notes: string[]
}

export interface RadarProviderSelection {
  selectedProvider: RadarProvider
  fallbackProvider?: RadarProvider
  reason: string
}

export interface RainViewerMetadataConfig {
  host: string
  generated: number
  version: string
  colorScheme: number
  smooth: boolean
  snow: boolean
  tileSize: 256 | 512
}

export interface RadarMetadata {
  location: {
    lat: number
    lon: number
  }
  generatedAt: string
  selectedProvider: RadarProvider
  fallbackProvider?: RadarProvider
  frames: RadarFrame[]
  refreshIntervalSeconds: number
  legend: RadarLegendBand[]
  selectionReason: string
  coverageRegion: RadarCoverageRegion
  rainviewer: RainViewerMetadataConfig
}
