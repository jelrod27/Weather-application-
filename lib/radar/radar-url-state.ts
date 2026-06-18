export const DEFAULT_RADAR_ZOOM = 10

export type RadarLayerParam = 'precip' | 'alerts' | 'spc' | 'stormReports' | 'satellite'

export interface RadarShareLayerState {
  precipitation: boolean
  alerts: boolean
  spc: boolean
  stormReports: boolean
  satellite: boolean
}

export const DEFAULT_RADAR_LAYERS: RadarShareLayerState = {
  precipitation: true,
  alerts: true,
  spc: false,
  stormReports: false,
  satellite: false,
}

export interface ParsedRadarUrlState {
  layers: RadarShareLayerState
  frameIndex: number | null
  zoom: number | null
}

const LAYER_PARAM_TO_STATE: Record<RadarLayerParam, keyof RadarShareLayerState> = {
  precip: 'precipitation',
  alerts: 'alerts',
  spc: 'spc',
  stormReports: 'stormReports',
  satellite: 'satellite',
}

const STATE_TO_LAYER_PARAM: Record<keyof RadarShareLayerState, RadarLayerParam> = {
  precipitation: 'precip',
  alerts: 'alerts',
  spc: 'spc',
  stormReports: 'stormReports',
  satellite: 'satellite',
}

function normalizeLayerToken(token: string): RadarLayerParam | null {
  const normalized = token.trim().toLowerCase()
  if (normalized === 'precip' || normalized === 'precipitation') return 'precip'
  if (normalized === 'alerts' || normalized === 'nws') return 'alerts'
  if (normalized === 'spc' || normalized === 'outlook') return 'spc'
  if (normalized === 'stormreports' || normalized === 'storm' || normalized === 'reports') {
    return 'stormReports'
  }
  if (normalized === 'satellite' || normalized === 'goes' || normalized === 'ir') return 'satellite'
  return null
}

export function parseRadarUrlState(searchParams: URLSearchParams): ParsedRadarUrlState {
  const layers = { ...DEFAULT_RADAR_LAYERS }
  const layersParam = searchParams.get('layers')

  if (layersParam === 'none') {
    layers.precipitation = false
    layers.alerts = false
    layers.spc = false
    layers.stormReports = false
    layers.satellite = false
  } else if (layersParam) {
    layers.precipitation = false
    layers.alerts = false
    layers.spc = false
    layers.stormReports = false
    layers.satellite = false

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

  return { layers, frameIndex, zoom }
}

export function layersMatchDefault(layers: RadarShareLayerState): boolean {
  return (
    layers.precipitation === DEFAULT_RADAR_LAYERS.precipitation
    && layers.alerts === DEFAULT_RADAR_LAYERS.alerts
    && layers.spc === DEFAULT_RADAR_LAYERS.spc
    && layers.stormReports === DEFAULT_RADAR_LAYERS.stormReports
    && layers.satellite === DEFAULT_RADAR_LAYERS.satellite
  )
}

export function serializeRadarUrlParams(state: {
  layers: RadarShareLayerState
  frameIndex: number
  zoom: number | null
  frameCount: number
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

  for (const [key, value] of radarParams.entries()) {
    merged.set(key, value)
  }

  return merged
}
