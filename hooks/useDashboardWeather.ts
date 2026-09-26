'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DASHBOARD_WEATHER_MAX_AGE_MS, getDashboardWeather } from '@/lib/dashboard-weather'
import type { DashboardWeatherData } from '@/lib/dashboard-weather'

interface DashboardWeatherInput {
  latitude: number
  longitude: number
  units: 'metric' | 'imperial'
  windUnit: 'mph' | 'kmh' | 'ms'
  enabled: boolean
}
interface DashboardWeatherState {
  key: string
  weather: DashboardWeatherData | null
  loading: boolean
  error: string | null
}

export function useDashboardWeather({ latitude, longitude, units, windUnit, enabled }: DashboardWeatherInput): {
  weather: DashboardWeatherData | null; loading: boolean; error: string | null; refresh: () => Promise<void>
} {
  const key = JSON.stringify([latitude, longitude, units, windUnit])
  const request = useRef<AbortController | null>(null)
  const [state, setState] = useState<DashboardWeatherState>({ key: '', weather: null, loading: false, error: null })
  const [now, setNow] = useState(Date.now)
  const load = useCallback(async (refresh: boolean) => {
    if (!enabled) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState(previous => ({ key, weather: previous.key === key ? previous.weather : null, loading: true, error: null }))
    try {
      const weather = await getDashboardWeather(latitude, longitude, units, { windUnit, refresh, signal: controller.signal })
      if (controller.signal.aborted) return
      if (!weather || !Number.isFinite(Date.parse(weather.fetchedAt)) || Date.now() - Date.parse(weather.fetchedAt) > DASHBOARD_WEATHER_MAX_AGE_MS) {
        throw new Error('Weather unavailable')
      }
      setState({ key, weather, loading: false, error: weather.stale ? 'Refresh failed. Showing recent weather.' : null })
      setNow(Date.now())
    } catch {
      if (controller.signal.aborted) return
      setState(previous => ({ key, weather: previous.key === key && previous.weather ? { ...previous.weather, stale: true } : null, loading: false, error: 'Weather is temporarily unavailable. Please retry.' }))
    }
  }, [enabled, key, latitude, longitude, units, windUnit])

  useEffect(() => {
    void load(false)
    return () => request.current?.abort()
  }, [load])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!state.weather) return
    const remaining = Date.parse(state.weather.fetchedAt) + DASHBOARD_WEATHER_MAX_AGE_MS - Date.now() + 1
    if (remaining <= 0) return
    const timer = setTimeout(() => setNow(Date.now()), remaining)
    return () => clearTimeout(timer)
  }, [state.weather])

  const current = enabled && state.key === key ? state : null
  const expired = !!current?.weather && Math.max(now, Date.now()) - Date.parse(current.weather.fetchedAt) > DASHBOARD_WEATHER_MAX_AGE_MS
  const weather = expired ? null : current?.weather ?? null
  const stale = weather && now - Date.parse(weather.fetchedAt) >= 5 * 60_000
  const refresh = useCallback(() => load(true), [load])
  return {
    weather: weather && stale ? { ...weather, stale: true } : weather,
    loading: !enabled || !current || current.loading,
    error: expired ? 'Previous weather has expired. Please retry.' : current?.error ?? null,
    refresh,
  }
}
