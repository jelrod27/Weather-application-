export const CARTO_DARK_MATTER_URL = 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'

export const TILE_TRANSITION_MS = 500
export const BASE_ANIMATION_INTERVAL_MS = 500
export const LIVE_PAUSE_MS = 1500
export const URL_SYNC_DEBOUNCE_MS = 300
export const MANIFEST_REFRESH_MS = 5 * 60 * 1000

export const RAINVIEWER_LEGEND = [
  { color: '#93e4dd', label: 'Light', value: '5-20 dBZ' },
  { color: '#00c800', label: 'Moderate', value: '20-35 dBZ' },
  { color: '#ffff00', label: 'Heavy', value: '35-50 dBZ' },
  { color: '#ff8c00', label: 'Very Heavy', value: '50-65 dBZ' },
  { color: '#ff0000', label: 'Extreme', value: '65+ dBZ' },
] as const

/** RainViewer tile color scheme IDs (see rainviewer.com/api.html). */
export const RAINVIEWER_COLOR_SCHEMES = [
  { id: 2, label: 'Universal Blue' },
  { id: 1, label: 'Original' },
  { id: 4, label: 'The Weather Channel' },
  { id: 6, label: 'NEXRAD Level-III' },
  { id: 8, label: 'Rainbow' },
] as const
