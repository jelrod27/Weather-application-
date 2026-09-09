export const RAINVIEWER_MANIFEST_URL = 'https://api.rainviewer.com/public/weather-maps.json'

export const RAINVIEWER_MAX_NATIVE_ZOOM = 7
export const RAINVIEWER_MAX_ZOOM = 12
export const RAINVIEWER_PAST_MINUTES = 120
export const RAINVIEWER_FRAME_STEP_MINUTES = 10
export const RAINVIEWER_ATTRIBUTION = 'RainViewer'
/** Universal Blue, the single palette rendered by the current RainViewer tile endpoint. */
export const RAINVIEWER_TILE_COLOR_PARAM = 2

/** Representative rain colors sampled from RainViewer's published Universal Blue dBZ table. */
export const RAINVIEWER_UNIVERSAL_BLUE_LEGEND = [
  { color: '#88ddee', label: 'Light', value: '10-20 dBZ' },
  { color: '#0077aa', label: 'Moderate', value: '20-35 dBZ' },
  { color: '#ffaa00', label: 'Heavy', value: '35-45 dBZ' },
  { color: '#c10000', label: 'Very Heavy', value: '45-55 dBZ' },
  { color: '#ff77ff', label: 'Intense', value: '55-65 dBZ' },
  { color: '#ffffff', label: 'Extreme', value: '65+ dBZ' },
] as const
