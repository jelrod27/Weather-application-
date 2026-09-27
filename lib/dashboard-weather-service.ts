import { createTtlCache } from '@/lib/cache/ttl-cache'
import { fetchOpenMeteoForecast } from '@/lib/open-meteo'
import type { OpenMeteoForecastResponse } from '@/lib/open-meteo-types'

import { DASHBOARD_WEATHER_MAX_AGE_MS } from '@/lib/dashboard-weather'
const FRESH_MS = 5 * 60_000

export interface DashboardForecastInput {
  latitude: number
  longitude: number
  units: 'metric' | 'imperial'
  windUnit?: 'mph' | 'kmh' | 'ms'
  detail: boolean
  refresh?: boolean
}

interface DashboardForecastSnapshot {
  forecast: OpenMeteoForecastResponse
  fetchedAt: string
}

export interface DashboardForecastResult extends DashboardForecastSnapshot {
  stale: boolean
}

/** Successful snapshots are bounded per server instance; cold starts have no fallback. */
export function createDashboardWeatherService({
  now = Date.now,
  fetchForecast = fetchOpenMeteoForecast,
}: {
  now?: () => number
  fetchForecast?: typeof fetchOpenMeteoForecast
} = {}): { load: (input: DashboardForecastInput) => Promise<DashboardForecastResult> } {
  const cache = createTtlCache<DashboardForecastSnapshot>({
    ttlMs: FRESH_MS,
    staleMs: DASHBOARD_WEATHER_MAX_AGE_MS - FRESH_MS,
    maxEntries: 100,
    now,
  })

  return {
    async load(input) {
      const { latitude, longitude, units, detail, refresh } = input
      const windUnit = input.windUnit ?? (units === 'metric' ? 'kmh' : 'mph')
      const key = JSON.stringify([latitude, longitude, units, windUnit, detail])
      try {
        const snapshot = await cache.load(key, async () => {
          const forecast = await fetchForecast(latitude, longitude, {
            forecastDays: detail ? 7 : 1,
            temperatureUnit: units === 'metric' ? 'celsius' : 'fahrenheit',
            windSpeedUnit: windUnit,
            precipitationUnit: units === 'metric' ? 'mm' : 'inch',
          })
          if (typeof forecast.current?.temperature_2m !== 'number' ||
              !Number.isFinite(forecast.current.temperature_2m) ||
              typeof forecast.current.weather_code !== 'number' ||
              !Number.isFinite(forecast.current.weather_code)) {
            throw new Error('Current weather unavailable in provider response')
          }
          return { forecast, fetchedAt: new Date(now()).toISOString() }
        }, undefined, refresh)
        return { ...snapshot, stale: false }
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        const status = message.match(/Open-Meteo Forecast API error (\d{3})/)?.[1]
        const reason = status ? 'http' : error instanceof Error && /abort|timeout/i.test(error.name) ? 'timeout' : 'unavailable'
        // Never log the provider body, request URL, coordinates or account details.
        console.warn('[dashboard-weather] upstream failure', { reason, ...(status ? { status: Number(status) } : {}) })
        const previous = cache.getStale(key)
        if (previous) return { ...previous, stale: true }
        throw error
      }
    },
  }
}

export const dashboardWeatherService = createDashboardWeatherService()
