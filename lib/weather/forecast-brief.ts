import type { EnhancedHourlyForecast } from '@/lib/types'

const HOUR_SECONDS = 3600

export interface ForecastBrief {
  hours: EnhancedHourlyForecast[]
  temperature: { low: number; high: number } | null
  precipitation: { low: number; high: number; trend: 'rising' | 'easing' | 'steady' } | null
  windHigh: number | null
}

/** Only summarize the current hour and the next five; old or distant data is not a local briefing. */
export function getForecastBrief(hourly: EnhancedHourlyForecast[], now: number): ForecastBrief | null {
  const seconds = now / 1000
  const seen = new Set<number>()
  const hours = hourly.filter(hour => {
    if (!Number.isFinite(hour.dt) || hour.dt + HOUR_SECONDS <= seconds || hour.dt > seconds + 5 * HOUR_SECONDS || seen.has(hour.dt)) return false
    seen.add(hour.dt)
    return true
  }).sort((a, b) => a.dt - b.dt).slice(0, 6)
  if (!hours.length || hours[0].dt > seconds + HOUR_SECONDS) return null

  const temperatures = hours.map(hour => hour.temp)
  const chances = hours.map(hour => hour.precipChance)
  const winds = hours.map(hour => hour.windSpeed)
  // A range over incomplete readings could understate the forecast. Omit that metric instead.
  const temperature = temperatures.every(Number.isFinite)
    ? { low: Math.min(...temperatures), high: Math.max(...temperatures) } : null
  const precipitation = chances.every(value => Number.isFinite(value) && value >= 0 && value <= 100)
    ? {
      low: Math.min(...chances), high: Math.max(...chances),
      trend: chances[chances.length - 1] - chances[0] >= 20 ? 'rising' as const
        : chances[chances.length - 1] - chances[0] <= -20 ? 'easing' as const : 'steady' as const,
    } : null
  const validWinds = winds.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)
  return { hours, temperature, precipitation, windHigh: validWinds.length === hours.length ? Math.max(...validWinds) : null }
}
