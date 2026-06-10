// Nord-themed severity mappings for weather metrics
// Uses Nord11-15 for semantic color coding

interface SeverityResult {
  label: string
  textColor: string
  bgColor: string
}

// Nord palette colors
const NORD_GREEN = '#A3BE8C'   // Nord14
const NORD_YELLOW = '#EBCB8B'  // Nord13
const NORD_ORANGE = '#D08770'  // Nord12
const NORD_RED = '#BF616A'     // Nord11
const NORD_PURPLE = '#B48EAD'  // Nord15

export function getUVSeverity(uv: number): SeverityResult & { percentage: number } {
  const percentage = Math.min((uv / 11) * 100, 100)
  if (uv <= 2) return { label: 'Low', textColor: NORD_GREEN, bgColor: NORD_GREEN, percentage }
  if (uv <= 5) return { label: 'Moderate', textColor: NORD_YELLOW, bgColor: NORD_YELLOW, percentage }
  if (uv <= 7) return { label: 'High', textColor: NORD_ORANGE, bgColor: NORD_ORANGE, percentage }
  if (uv <= 10) return { label: 'Very High', textColor: NORD_RED, bgColor: NORD_RED, percentage }
  return { label: 'Extreme', textColor: NORD_PURPLE, bgColor: NORD_PURPLE, percentage }
}

export function getHumiditySeverity(humidity: number): SeverityResult {
  if (humidity < 30) return { label: 'Dry', textColor: NORD_ORANGE, bgColor: NORD_ORANGE }
  if (humidity <= 60) return { label: 'Comfortable', textColor: NORD_GREEN, bgColor: NORD_GREEN }
  if (humidity <= 80) return { label: 'Humid', textColor: NORD_YELLOW, bgColor: NORD_YELLOW }
  return { label: 'Very Humid', textColor: NORD_ORANGE, bgColor: NORD_ORANGE }
}

export function getPressureCategory(pressure: number | string): SeverityResult {
  let p = typeof pressure === 'string' ? parseFloat(pressure) : pressure
  if (isNaN(p)) return { label: 'Unknown', textColor: NORD_YELLOW, bgColor: NORD_YELLOW }
  // US/CA pressure strings are inHg ("29.92 in"); the thresholds below are
  // hPa. Sea-level pressure in inHg is ~25-32, in hPa ~870-1085, so any
  // value under 100 is unambiguously inHg — convert before categorizing.
  // Without this, every imperial-format reading parsed to ~30 and showed
  // the "Low" badge regardless of actual pressure.
  if (p < 100) p = p / 0.02953
  if (p < 1009) return { label: 'Low', textColor: NORD_YELLOW, bgColor: NORD_YELLOW }
  if (p <= 1022) return { label: 'Normal', textColor: NORD_GREEN, bgColor: NORD_GREEN }
  return { label: 'High', textColor: NORD_ORANGE, bgColor: NORD_ORANGE }
}

export function getWindSeverity(speed: number): SeverityResult {
  if (speed < 10) return { label: 'Calm', textColor: NORD_GREEN, bgColor: NORD_GREEN }
  if (speed < 25) return { label: 'Breezy', textColor: NORD_YELLOW, bgColor: NORD_YELLOW }
  if (speed < 40) return { label: 'Windy', textColor: NORD_ORANGE, bgColor: NORD_ORANGE }
  return { label: 'High Wind', textColor: NORD_RED, bgColor: NORD_RED }
}

export function getVisibilitySeverity(miles: number): SeverityResult {
  if (miles >= 10) return { label: 'Clear', textColor: NORD_GREEN, bgColor: NORD_GREEN }
  if (miles >= 5) return { label: 'Moderate', textColor: NORD_YELLOW, bgColor: NORD_YELLOW }
  if (miles >= 2) return { label: 'Low', textColor: NORD_ORANGE, bgColor: NORD_ORANGE }
  return { label: 'Poor', textColor: NORD_RED, bgColor: NORD_RED }
}

// Map wind direction string to degrees for compass rotation
export function windDirectionToDegrees(direction: string): number {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  }
  return map[direction?.toUpperCase()] ?? 0
}
