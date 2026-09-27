// Dashboard-specific weather data fetching
// Simplified version of weather-api.ts for location cards

export interface DashboardWeatherData {
  temperature: number
  description: string
  humidity: number | null
  windSpeed: number | null
  icon: string
  feelsLike: number | null
  pressure: number | null
  visibility: number | null
  units: 'metric' | 'imperial'
  windUnit: 'mph' | 'kmh' | 'ms'
  fetchedAt: string
  observedAt: string | null
  stale: boolean
}

export const DASHBOARD_WEATHER_MAX_AGE_MS = 30 * 60_000

export async function getDashboardWeather(
  latitude: number,
  longitude: number,
  units: 'metric' | 'imperial' = 'imperial',
  options: { signal?: AbortSignal; refresh?: boolean; windUnit?: 'mph' | 'kmh' | 'ms' } = {},
): Promise<DashboardWeatherData> {
  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), units })
  if (options.windUnit) params.set('wind_unit', options.windUnit)
  if (options.refresh) params.set('refresh', '1')
  const response = await fetch(`/api/dashboard-weather?${params}`, { signal: options.signal, cache: 'no-store' })
  if (!response.ok) throw new Error('Weather is temporarily unavailable. Please retry.')
  return response.json()
}

export function getWeatherIcon(iconCode: string): string {
  const iconMap: { [key: string]: string } = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '⛅', // few clouds day
    '02n': '☁️', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️',
    '04d': '☁️', // broken clouds
    '04n': '☁️',
    '09d': '🌧️', // shower rain
    '09n': '🌧️',
    '10d': '🌦️', // rain day
    '10n': '🌧️', // rain night
    '11d': '⛈️', // thunderstorm
    '11n': '⛈️',
    '13d': '❄️', // snow
    '13n': '❄️',
    '50d': '🌫️', // mist
    '50n': '🌫️'
  }

  return iconMap[iconCode] || '🌤️'
}

export function getTemperatureColor(temp: number): string {
  // Use terminal weather semantic colors for hot/cold extremes
  // and semantic accent colors for mid-range temperatures
  if (temp >= 100) return 'text-terminal-weather-hot'
  if (temp >= 90) return 'text-terminal-accent-danger'
  if (temp >= 80) return 'text-orange-500'
  if (temp >= 70) return 'text-terminal-accent-warning'
  if (temp >= 60) return 'text-terminal-accent-success'
  if (temp >= 50) return 'text-terminal-accent-info'
  if (temp >= 40) return 'text-terminal-weather-cold'
  if (temp >= 32) return 'text-terminal-weather-cold'
  return 'text-terminal-weather-cold'
}