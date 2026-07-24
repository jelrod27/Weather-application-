/**
 * METAR parse + types. Domain logic lives here; the API route is a thin wrapper.
 */

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN'

export interface MetarObservation {
  raw: string
  icao: string
  name?: string
  observationTime: string
  temperature?: number // Celsius
  dewpoint?: number // Celsius
  windDirection?: number // Degrees
  windSpeed?: number // Knots
  windGust?: number // Knots
  visibility?: number // Statute miles
  altimeter?: number // inHg
  flightCategory: FlightCategory
  clouds: Array<{
    cover: string
    base?: number // Feet AGL
  }>
  weather?: string[]
}

export interface MetarResponse {
  station: string
  observation?: MetarObservation
  error?: string
  timestamp: string
}

/** Determine flight category based on ceiling and visibility. */
export function determineFlightCategory(
  visibility: number | undefined,
  clouds: Array<{ cover: string; base?: number }> | undefined,
): FlightCategory {
  let ceiling: number | undefined
  for (const cloud of clouds || []) {
    if ((cloud.cover === 'BKN' || cloud.cover === 'OVC') && cloud.base !== undefined) {
      if (ceiling === undefined || cloud.base < ceiling) {
        ceiling = cloud.base
      }
    }
  }

  if ((ceiling !== undefined && ceiling < 500) || (visibility !== undefined && visibility < 1)) {
    return 'LIFR'
  }
  if ((ceiling !== undefined && ceiling < 1000) || (visibility !== undefined && visibility < 3)) {
    return 'IFR'
  }
  if ((ceiling !== undefined && ceiling < 3000) || (visibility !== undefined && visibility < 5)) {
    return 'MVFR'
  }
  if (visibility === undefined && ceiling === undefined) {
    return 'UNKNOWN'
  }
  return 'VFR'
}

/** Parse METAR raw text into structured data. */
export function parseMetar(raw: string): Partial<MetarObservation> {
  const result: Partial<MetarObservation> = {
    raw,
    clouds: [],
  }

  const parts = raw.split(' ')

  const icaoMatch = raw.match(/\b([A-Z]{4})\b/)
  if (icaoMatch) {
    result.icao = icaoMatch[1]
  }

  const timeMatch = raw.match(/\b(\d{6})Z\b/)
  if (timeMatch) {
    const day = parseInt(timeMatch[1].slice(0, 2))
    const hour = parseInt(timeMatch[1].slice(2, 4))
    const minute = parseInt(timeMatch[1].slice(4, 6))
    const now = new Date()

    let year = now.getUTCFullYear()
    let month = now.getUTCMonth()

    let obsTime = new Date(Date.UTC(year, month, day, hour, minute))

    if (obsTime > now) {
      month -= 1
      if (month < 0) {
        month = 11
        year -= 1
      }
      obsTime = new Date(Date.UTC(year, month, day, hour, minute))
    }

    result.observationTime = obsTime.toISOString()
  }

  const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/)
  if (windMatch) {
    if (windMatch[1] !== 'VRB') {
      result.windDirection = parseInt(windMatch[1])
    }
    result.windSpeed = parseInt(windMatch[2])
    if (windMatch[3]) {
      result.windGust = parseInt(windMatch[3])
    }
  }

  const visMatch = raw.match(/\b([PM])?(\d+)?\s*(\d+\/\d+)?\s*SM\b/)
  if (visMatch) {
    const prefix = visMatch[1]
    const isGreaterThan = prefix === 'P'
    const isLessThan = prefix === 'M'
    const wholePart = visMatch[2] ? parseInt(visMatch[2]) : 0
    const fractionPart = visMatch[3]

    let visibility: number

    if (fractionPart) {
      const [num, denom] = fractionPart.split('/').map(Number)
      visibility = wholePart + num / denom
    } else {
      visibility = wholePart
    }

    if (isGreaterThan) {
      result.visibility = visibility || 6
    } else if (isLessThan) {
      result.visibility = Math.max(0, visibility - 0.01)
    } else {
      result.visibility = visibility
    }
  }

  const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/)
  if (tempMatch) {
    const temp = tempMatch[1].replace('M', '-')
    const dewp = tempMatch[2].replace('M', '-')
    result.temperature = parseInt(temp)
    result.dewpoint = parseInt(dewp)
  }

  const altMatch = raw.match(/\bA(\d{4})\b/)
  if (altMatch) {
    result.altimeter = parseInt(altMatch[1]) / 100
  }

  const cloudPattern = /\b(FEW|SCT|BKN|OVC|CLR|SKC)(\d{3})?\b/g
  let cloudMatch
  while ((cloudMatch = cloudPattern.exec(raw)) !== null) {
    const cover = cloudMatch[1]
    const base = cloudMatch[2] ? parseInt(cloudMatch[2]) * 100 : undefined
    result.clouds?.push({ cover, base })
  }

  result.flightCategory = determineFlightCategory(result.visibility, result.clouds)

  const weatherCodes = [
    'RA', 'SN', 'DZ', 'SH', 'TS', 'FG', 'BR', 'HZ', 'FU', 'DU', 'SA',
    'GR', 'GS', 'IC', 'PL', 'SG', 'UP', 'FC', 'SS', 'DS', 'SQ', 'PO',
  ]
  const descriptors = ['MI', 'PR', 'BC', 'DR', 'BL', 'SH', 'TS', 'FZ', 'VC']

  const weatherRegex = new RegExp(
    `^(?:\\+|-)?(?:${descriptors.join('|')})?(?:${weatherCodes.join('|')})+$`,
  )

  const weather: string[] = []
  for (const part of parts) {
    if (/^[A-Z]{4}$/.test(part)) continue
    if (weatherRegex.test(part)) {
      weather.push(part)
    }
  }
  if (weather.length > 0) {
    result.weather = weather
  }

  return result
}

export function toMetarObservation(
  rawText: string,
  station: string,
): MetarObservation {
  const parsed = parseMetar(rawText.trim())
  return {
    raw: rawText.trim(),
    icao: parsed.icao || station,
    observationTime: parsed.observationTime || new Date().toISOString(),
    temperature: parsed.temperature,
    dewpoint: parsed.dewpoint,
    windDirection: parsed.windDirection,
    windSpeed: parsed.windSpeed,
    windGust: parsed.windGust,
    visibility: parsed.visibility,
    altimeter: parsed.altimeter,
    flightCategory: parsed.flightCategory || 'UNKNOWN',
    clouds: parsed.clouds || [],
    weather: parsed.weather,
  }
}
