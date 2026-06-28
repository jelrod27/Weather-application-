export const CARTO_VOYAGER_URL = 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'

export const BASE_ANIMATION_INTERVAL_MS = 500
export const URL_SYNC_DEBOUNCE_MS = 300
export const MANIFEST_REFRESH_MS = 5 * 60 * 1000

export const RAINVIEWER_LEGEND = [
  { color: '#93e4dd', label: 'Light', value: '5-20 dBZ' },
  { color: '#00c800', label: 'Moderate', value: '20-35 dBZ' },
  { color: '#ffff00', label: 'Heavy', value: '35-50 dBZ' },
  { color: '#ff8c00', label: 'Very Heavy', value: '50-65 dBZ' },
  { color: '#ff0000', label: 'Extreme', value: '65+ dBZ' },
] as const

/** Display presets for RainViewer tiles (applied client-side; see color-schemes.ts). */
export { RAINVIEWER_DISPLAY_SCHEMES as RAINVIEWER_COLOR_SCHEMES } from '@/lib/radar/rainviewer/color-schemes'
