export const DEFAULT_RADAR_ZOOM = 10

export type RadarLayerParam = 'precip' | 'alerts' | 'spc' | 'stormReports'

export type RadarPreset = 'radar' | 'severe' | 'outlook'

export interface RadarShareLayerState {
  precipitation: boolean
  alerts: boolean
  spc: boolean
  stormReports: boolean
}

export const DEFAULT_RADAR_LAYERS: RadarShareLayerState = {
  precipitation: true,
  alerts: false,
  spc: false,
  stormReports: false,
}

export interface RadarTilePreferences {
  colorScheme: number
  smooth: boolean
  snow: boolean
  coverage: boolean
}

export const DEFAULT_RADAR_TILE_PREFERENCES: RadarTilePreferences = {
  colorScheme: 2,
  smooth: true,
  snow: true,
  coverage: false,
}

export interface ParsedRadarUrlState {
  layers: RadarShareLayerState
  frameIndex: number | null
  zoom: number | null
  tilePreferences: RadarTilePreferences
  explicitLayers: boolean
}

const LAYER_PARAM_TO_STATE: Record<RadarLayerParam, keyof RadarShareLayerState> = {
  precip: 'precipitation',
  alerts: 'alerts',
  spc: 'spc',
  stormReports: 'stormReports',
}

const STATE_TO_LAYER_PARAM: Record<keyof RadarShareLayerState, RadarLayerParam> = {
  precipitation: 'precip',
  alerts: 'alerts',
  spc: 'spc',
  stormReports: 'stormReports',
}

function normalizeLayerToken(token: string): RadarLayerParam | null {
  const normalized = token.trim().toLowerCase()
  if (normalized === 'precip' || normalized === 'precipitation') return 'precip'
  if (normalized === 'alerts' || normalized === 'nws') return 'alerts'
  if (normalized === 'spc' || normalized === 'outlook') return 'spc'
  if (normalized === 'stormreports' || normalized === 'storm' || normalized === 'reports') {
    return 'stormReports'
  }
  return null
}

export function parseRadarUrlState(searchParams: URLSearchParams): ParsedRadarUrlState {
  const layers = { ...DEFAULT_RADAR_LAYERS }
  const layersParam = searchParams.get('layers')
  let explicitLayers = false

  if (layersParam === 'none') {
    explicitLayers = true
    layers.precipitation = false
    layers.alerts = false
    layers.spc = false
    layers.stormReports = false
  } else if (layersParam) {
    explicitLayers = true
    layers.precipitation = false
    layers.alerts = false
    layers.spc = false
    layers.stormReports = false

    for (const token of layersParam.split(',')) {
      const key = normalizeLayerToken(token)
      if (key) {
        layers[LAYER_PARAM_TO_STATE[key]] = true
      }
    }
  }

  const frameRaw = searchParams.get('frame')
  const frameParsed = frameRaw != null ? Number.parseInt(frameRaw, 10) : Number.NaN
  const frameIndex = Number.isFinite(frameParsed) && frameParsed >= 0 ? frameParsed : null

  const zoomRaw = searchParams.get('zoom')
  const zoomParsed = zoomRaw != null ? Number.parseInt(zoomRaw, 10) : Number.NaN
  const zoom = Number.isFinite(zoomParsed) && zoomParsed >= 1 && zoomParsed <= 18 ? zoomParsed : null

  const tilePreferences = { ...DEFAULT_RADAR_TILE_PREFERENCES }
  const schemeRaw = searchParams.get('scheme')
  const schemeParsed = schemeRaw != null ? Number.parseInt(schemeRaw, 10) : Number.NaN
  if (Number.isFinite(schemeParsed) && schemeParsed >= 0) {
    tilePreferences.colorScheme = schemeParsed
  }
  if (searchParams.has('smooth')) {
    tilePreferences.smooth = searchParams.get('smooth') !== '0'
  }
  if (searchParams.has('snow')) {
    tilePreferences.snow = searchParams.get('snow') !== '0'
  }
  if (searchParams.has('coverage')) {
    tilePreferences.coverage = searchParams.get('coverage') === '1'
  }

  return { layers, frameIndex, zoom, tilePreferences, explicitLayers }
}

export function layersMatchDefault(layers: RadarShareLayerState): boolean {
  return (
    layers.precipitation === DEFAULT_RADAR_LAYERS.precipitation
    && layers.alerts === DEFAULT_RADAR_LAYERS.alerts
    && layers.spc === DEFAULT_RADAR_LAYERS.spc
    && layers.stormReports === DEFAULT_RADAR_LAYERS.stormReports
  )
}

export function tilePreferencesMatchDefault(preferences: RadarTilePreferences): boolean {
  return (
    preferences.colorScheme === DEFAULT_RADAR_TILE_PREFERENCES.colorScheme
    && preferences.smooth === DEFAULT_RADAR_TILE_PREFERENCES.smooth
    && preferences.snow === DEFAULT_RADAR_TILE_PREFERENCES.snow
    && preferences.coverage === DEFAULT_RADAR_TILE_PREFERENCES.coverage
  )
}

export function getPresetLayers(preset: RadarPreset): RadarShareLayerState {
  switch (preset) {
    case 'severe':
      return {
        precipitation: true,
        alerts: true,
        spc: false,
        stormReports: true,
      }
    case 'outlook':
      return {
        precipitation: true,
        alerts: false,
        spc: true,
        stormReports: false,
      }
    case 'radar':
    default:
      return {
        precipitation: true,
        alerts: false,
        spc: false,
        stormReports: false,
      }
  }
}

export function getDefaultLayersForRegion(region: 'us' | 'canada' | 'north-america-fallback' | 'global'): RadarShareLayerState {
  if (region === 'us') {
    return getPresetLayers('severe')
  }
  return getPresetLayers('radar')
}

export function serializeRadarUrlParams(state: {
  layers: RadarShareLayerState
  frameIndex: number
  zoom: number | null
  frameCount: number
  tilePreferences?: RadarTilePreferences
}): URLSearchParams {
  const params = new URLSearchParams()

  if (!layersMatchDefault(state.layers)) {
    const enabled = (Object.keys(STATE_TO_LAYER_PARAM) as Array<keyof RadarShareLayerState>)
      .filter((layerKey) => state.layers[layerKey])
      .map((layerKey) => STATE_TO_LAYER_PARAM[layerKey])

    params.set('layers', enabled.length > 0 ? enabled.join(',') : 'none')
  }

  if (state.zoom != null && Math.round(state.zoom) !== DEFAULT_RADAR_ZOOM) {
    params.set('zoom', String(Math.round(state.zoom)))
  }

  const liveIndex = Math.max(0, state.frameCount - 1)
  if (state.frameCount > 0 && state.frameIndex >= 0 && state.frameIndex < liveIndex) {
    params.set('frame', String(state.frameIndex))
  }

  const tilePreferences = state.tilePreferences ?? DEFAULT_RADAR_TILE_PREFERENCES
  if (!tilePreferencesMatchDefault(tilePreferences)) {
    if (tilePreferences.colorScheme !== DEFAULT_RADAR_TILE_PREFERENCES.colorScheme) {
      params.set('scheme', String(tilePreferences.colorScheme))
    }
    if (tilePreferences.smooth !== DEFAULT_RADAR_TILE_PREFERENCES.smooth) {
      params.set('smooth', tilePreferences.smooth ? '1' : '0')
    }
    if (tilePreferences.snow !== DEFAULT_RADAR_TILE_PREFERENCES.snow) {
      params.set('snow', tilePreferences.snow ? '1' : '0')
    }
    if (tilePreferences.coverage) {
      params.set('coverage', '1')
    }
  }

  return params
}

export function mergeRadarUrlParams(
  existing: URLSearchParams,
  radarParams: URLSearchParams,
): URLSearchParams {
  const merged = new URLSearchParams(existing.toString())
  merged.delete('layers')
  merged.delete('zoom')
  merged.delete('frame')
  merged.delete('scheme')
  merged.delete('smooth')
  merged.delete('snow')
  merged.delete('coverage')

  for (const [key, value] of radarParams.entries()) {
    merged.set(key, value)
  }

  return merged
}
