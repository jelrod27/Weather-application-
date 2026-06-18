import { buildRadarFrames } from '@/lib/radar/radar-timestamps'
import { getRadarCoverageRegion } from '@/lib/radar/providers/coverage'
import type {
  RadarLegendBand,
  RadarMetadata,
  RadarProvider,
  RadarProviderId,
  RadarProviderSelection,
} from '@/lib/radar/providers/types'

export const REFLECTIVITY_LEGEND: RadarLegendBand[] = [
  { color: '#00ffc8', label: 'Light', value: '5-20 dBZ' },
  { color: '#00c800', label: 'Moderate', value: '20-35 dBZ' },
  { color: '#ffff00', label: 'Heavy', value: '35-50 dBZ' },
  { color: '#ff8c00', label: 'Very Heavy', value: '50-65 dBZ' },
  { color: '#ff0000', label: 'Extreme', value: '65+ dBZ' },
]

export const RADAR_PROVIDERS: Record<RadarProviderId, RadarProvider> = {
  'noaa-mrms': {
    id: 'noaa-mrms',
    displayName: 'NOAA MRMS Radar',
    shortName: 'MRMS',
    coverage: 'us',
    protocol: 'wms',
    attribution: 'NOAA/NWS MRMS',
    refreshIntervalSeconds: 300,
    frameStepMinutes: 5,
    pastMinutes: 240,
    supportsAnimation: true,
    qualityTier: 'official',
    fallbackProviderId: 'iowa-nexrad',
    wms: {
      url: '/api/weather/noaa-wms',
      params: {
        LAYERS: '1',
        FORMAT: 'image/png',
        TRANSPARENT: 'true',
        VERSION: '1.3.0',
        STYLES: '',
      },
      serverType: 'mapserver',
      timeParam: 'TIME',
      direct: false,
    },
    notes: [
      'Official US radar mosaic via the existing NOAA WMS proxy.',
      'Falls back to Iowa NEXRAD if the proxy or upstream service is unhealthy.',
    ],
  },
  'iowa-nexrad': {
    id: 'iowa-nexrad',
    displayName: 'Iowa State NEXRAD Radar',
    shortName: 'NEXRAD',
    coverage: 'us',
    protocol: 'wms',
    attribution: 'Iowa Environmental Mesonet / NOAA NEXRAD',
    refreshIntervalSeconds: 300,
    frameStepMinutes: 5,
    pastMinutes: 240,
    supportsAnimation: true,
    qualityTier: 'community',
    wms: {
      url: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi',
      params: {
        LAYERS: 'nexrad-n0q-wmst',
        FORMAT: 'image/png',
        TRANSPARENT: 'true',
        VERSION: '1.1.1',
      },
      serverType: 'mapserver',
      timeParam: 'TIME',
      direct: true,
    },
    notes: ['Reliable public WMS-T fallback for US reflectivity loops.'],
  },
  'canada-geomet': {
    id: 'canada-geomet',
    displayName: 'Canada MSC GeoMet Radar',
    shortName: 'GeoMet',
    coverage: 'canada',
    protocol: 'wms',
    attribution: 'Environment and Climate Change Canada MSC GeoMet',
    refreshIntervalSeconds: 360,
    frameStepMinutes: 6,
    pastMinutes: 180,
    supportsAnimation: true,
    qualityTier: 'official',
    fallbackProviderId: 'rainviewer',
    wms: {
      url: 'https://geo.weather.gc.ca/geomet/',
      params: {
        LAYERS: 'RADAR_1KM_RRAI',
        FORMAT: 'image/png',
        TRANSPARENT: 'true',
        VERSION: '1.3.0',
        TILED: 'true',
      },
      serverType: 'geoserver',
      timeParam: 'TIME',
      direct: true,
    },
    notes: ['Official Canadian radar via time-enabled MSC GeoMet WMS.'],
  },
  rainviewer: {
    id: 'rainviewer',
    displayName: 'RainViewer Radar',
    shortName: 'RainViewer',
    coverage: 'north-america-fallback',
    protocol: 'xyz',
    attribution: 'RainViewer',
    refreshIntervalSeconds: 300,
    frameStepMinutes: 10,
    pastMinutes: 120,
    supportsAnimation: true,
    qualityTier: 'fallback',
    xyz: {
      urlTemplate: 'https://tilecache.rainviewer.com/v2/radar/{epochSeconds}/256/{z}/{x}/{y}/2/1_1.png',
      direct: true,
    },
    notes: [
      'Fallback radar tile source for Mexico and general North America coverage.',
      'Use requires attribution and commercial-term review before high-volume production use.',
    ],
  },
}

export function getRadarProvider(id: RadarProviderId): RadarProvider {
  return RADAR_PROVIDERS[id]
}

export function selectRadarProvider(latitude: number, longitude: number): RadarProviderSelection {
  const region = getRadarCoverageRegion(latitude, longitude)

  if (region === 'us') {
    return {
      selectedProvider: RADAR_PROVIDERS['noaa-mrms'],
      fallbackProvider: RADAR_PROVIDERS['iowa-nexrad'],
      reason: 'US location selected official NOAA MRMS radar with Iowa NEXRAD fallback.',
    }
  }

  if (region === 'canada') {
    return {
      selectedProvider: RADAR_PROVIDERS['canada-geomet'],
      fallbackProvider: RADAR_PROVIDERS.rainviewer,
      reason: 'Canada location selected official MSC GeoMet radar with RainViewer fallback.',
    }
  }

  return {
    selectedProvider: RADAR_PROVIDERS.rainviewer,
    reason: 'Location outside official US/Canada radar coverage selected RainViewer fallback.',
  }
}

export function buildRadarMetadata(
  latitude: number,
  longitude: number,
  now = Date.now()
): RadarMetadata {
  const selection = selectRadarProvider(latitude, longitude)
  const provider = selection.selectedProvider
  const frames = buildRadarFrames({
    now,
    stepMinutes: provider.frameStepMinutes,
    pastMinutes: provider.pastMinutes,
  })

  return {
    location: { lat: latitude, lon: longitude },
    generatedAt: new Date(now).toISOString(),
    selectedProvider: provider,
    fallbackProvider: selection.fallbackProvider,
    frames,
    refreshIntervalSeconds: provider.refreshIntervalSeconds,
    legend: REFLECTIVITY_LEGEND,
    selectionReason: selection.reason,
  }
}
