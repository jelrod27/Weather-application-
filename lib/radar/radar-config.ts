/** Shared radar animation and provider constants (Phase 1). */

export const RADAR_STEP_MINUTES = 5
export const RADAR_PAST_STEPS = 48 // 4 hours at 5-minute steps
export const RADAR_REFRESH_MS = RADAR_STEP_MINUTES * 60 * 1000
export const STORM_WATCH_HOURS = 2
export const STORM_WATCH_FRAMES = (STORM_WATCH_HOURS * 60) / RADAR_STEP_MINUTES

export const TILE_TRANSITION_MS = 500
export const BASE_ANIMATION_INTERVAL_MS = 500
export const PRELOAD_FRAMES_AHEAD = 3

/** US primary: Iowa IEM NEXRAD WMS-T (direct browser fetch; CSP-allowed). */
export const US_RADAR_SOURCE_ID = 'iowa-wms-t'
export const IOWA_NEXRAD_WMS_URL =
  'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi'
export const IOWA_NEXRAD_LAYER = 'nexrad-n0q-wmst'

/** International: RainViewer via app proxy. */
export const INTL_RADAR_SOURCE_ID = 'rainviewer'

/** Deferred: nowCOAST MRMS WMS returns CloudFront 403; proxy also hits tile rate limits. */
export const MRMS_WMS_PROXY_PATH = '/api/weather/noaa-wms'
export const MRMS_WMS_LAYER = '1'

export const RAINVIEWER_MAPS_API = '/api/weather/rainviewer/maps'

export const CARTO_DARK_MATTER_URL =
  'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'

export type RadarRegion = 'us' | 'international' | 'unavailable'

export const RADAR_LEGEND = [
  { color: '#00ffc8', label: 'Light', dbz: '5-20' },
  { color: '#00c800', label: 'Moderate', dbz: '20-35' },
  { color: '#ffff00', label: 'Heavy', dbz: '35-50' },
  { color: '#ff8c00', label: 'Very Heavy', dbz: '50-65' },
  { color: '#ff0000', label: 'Extreme', dbz: '65+' },
] as const
