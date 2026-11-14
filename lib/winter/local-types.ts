/** Source periods are retained intact; amounts are never prorated or hourly rates. */
export interface WinterAccumulationBlock {
  startTime: string
  endTime: string
  inches: number | null
  ongoing: boolean
}

export interface WinterAccumulation {
  status: 'available' | 'partial' | 'unavailable'
  blocks: WinterAccumulationBlock[]
  total: {
    inches: number | null
    startTime: string | null
    endTime: string | null
    includedPeriods: number
    complete: boolean
  }
  issues: string[]
}

export interface WinterHourlyPeriod {
  startTime: string
  endTime: string
  shortForecast: string
  temperatureF: number | null
  windSpeed: string | null
  windDirection: string | null
  precipitationProbability: number | null
  ongoing: boolean
}

export interface WinterNarrativePeriod extends WinterHourlyPeriod {
  name: string
  detailedForecast: string
}

export interface LocalWinterForecast {
  status: 'available' | 'partial' | 'stale' | 'unavailable' | 'outside_coverage'
  coverage: 'conus' | 'unsupported'
  place: { name: string; lat: number; lon: number; timeZone: string | null }
  fetchedAt: string
  gridUpdatedAt: string | null
  hourlyUpdatedAt: string | null
  narrativeUpdatedAt: string | null
  windowStart: string
  windowEnd: string
  sourceUrl: string
  message: string | null
  snow: WinterAccumulation
  ice: WinterAccumulation
  hourly: WinterHourlyPeriod[]
  narrative: WinterNarrativePeriod[]
}
