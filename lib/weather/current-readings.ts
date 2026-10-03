import type { WeatherData } from '@/lib/types'

/** Apparent temperature is unavailable when absent; actual temperature is not a substitute. */
export function getFeelsLike(weather: Pick<WeatherData, 'hourlyForecast' | 'temperature'>): { feelsLike: number | null; feelsLikeDelta: number | null } {
  const reading = weather.hourlyForecast?.[0]?.feelsLike
  const feelsLike = reading != null && Number.isFinite(reading) ? Math.round(reading) : null
  const feelsLikeDelta = feelsLike != null && Number.isFinite(weather.temperature)
    ? Math.round((feelsLike - weather.temperature) * 10) / 10 : null
  return { feelsLike, feelsLikeDelta }
}
