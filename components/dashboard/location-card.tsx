'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Trash2, RefreshCw, Thermometer, Droplets, Wind, Eye, Sun } from 'lucide-react'
import type { SavedLocation, UserPreferences } from '@/lib/supabase/types'
import { toggleLocationFavorite, deleteSavedLocation, getUserPreferences } from '@/lib/supabase/database'
import { getWeatherIcon, getTemperatureColor } from '@/lib/dashboard-weather'
import { useDashboardWeather } from '@/hooks/useDashboardWeather'
import { DASHBOARD_WEATHER_MAX_AGE_MS } from '@/lib/dashboard-weather'
import type { DashboardWeatherData } from '@/lib/dashboard-weather'
import { useAuth } from '@/lib/auth'
import { themeTokens } from '@/lib/theme-tokens'

interface LocationCardProps {
  location: SavedLocation
  onUpdate: () => void
}

const tempUnitLabel = (u: DashboardWeatherData['units'] | undefined) =>
  u === 'metric' ? '°C' : '°F'
const windUnitLabel = (u: UserPreferences['wind_unit'] | undefined) =>
  u === 'kmh' ? 'km/h' : u === 'ms' ? 'm/s' : 'mph'
const apiTempUnits = (u: UserPreferences['temperature_unit'] | undefined) =>
  u === 'celsius' ? 'metric' : 'imperial'

interface DetailedWeatherData {
  current: DashboardWeatherData
  forecast: Array<{ day: string; highTemp: number | null; lowTemp: number | null; condition: string; description: string }>
  uvIndex: number | null
  airQuality: { aqi: number | null; category: string }
}

export default function LocationCard({ location, onUpdate }: LocationCardProps) {
  const [actionLoading, setActionLoading] = useState<'favorite' | 'delete' | null>(null)
  const [showDetailedWeather, setShowDetailedWeather] = useState(false)
  const [detailedWeatherData, setDetailedWeatherData] = useState<DetailedWeatherData | null>(null)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const detailRequest = useRef<AbortController | null>(null)
  const [preferenceUser, setPreferenceUser] = useState<string | null>(null)
  const { user } = useAuth()
  const themeClasses = themeTokens.dashboard

  const apiUnits = apiTempUnits(preferences?.temperature_unit)
  const windApiUnit = preferences?.wind_unit ?? 'mph'
  const preferencesReady = preferenceUser === (user?.id ?? '')
  const { weather, loading, error, refresh: fetchWeather } = useDashboardWeather({
    latitude: location.latitude, longitude: location.longitude, units: apiUnits, windUnit: windApiUnit, enabled: preferencesReady,
  })
  const tempUnit = tempUnitLabel(weather?.units)
  const windUnit = windUnitLabel(weather?.windUnit)
  const detailTempUnit = tempUnitLabel(detailedWeatherData?.current.units)
  const detailRequestKey = `${location.latitude},${location.longitude},${apiUnits},${windApiUnit},${preferencesReady}`

  useEffect(() => {
    detailRequest.current?.abort()
    setDetailedWeatherData(null)
    setDetailedLoading(false)
    setShowDetailedWeather(false)
    return () => detailRequest.current?.abort()
  }, [detailRequestKey])

  useEffect(() => {
    let cancelled = false
    const userId = user?.id ?? ''
    setPreferenceUser(null)
    const resolvePreferences = async () => {
      let prefs: UserPreferences | null = null
      try { if (userId) prefs = await getUserPreferences(userId) } catch { /* Use existing default units. */ }
      if (!cancelled) { setPreferences(prefs); setPreferenceUser(userId) }
    }
    void resolvePreferences()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!detailedWeatherData) return
    const remaining = Date.parse(detailedWeatherData.current.fetchedAt) + DASHBOARD_WEATHER_MAX_AGE_MS - Date.now()
    if (!Number.isFinite(remaining) || remaining <= 0) { setDetailedWeatherData(null); return }
    const timer = setTimeout(() => setDetailedWeatherData(null), remaining + 1)
    return () => clearTimeout(timer)
  }, [detailedWeatherData])

  const handleToggleFavorite = async () => {
    if (!user) return
    setActionLoading('favorite')
    try {
      await toggleLocationFavorite(user.id, location.id, !location.is_favorite)
      onUpdate()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    if (!confirm(`Remove ${location.custom_name || location.location_name} from saved locations?`)) {
      return
    }

    setActionLoading('delete')
    try {
      await deleteSavedLocation(user.id, location.id)
      onUpdate()
    } catch (error) {
      console.error('Error deleting location:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const fetchDetailedWeather = async () => {
    if (!preferencesReady) return
    detailRequest.current?.abort()
    const controller = new AbortController()
    detailRequest.current = controller
    setDetailedLoading(true)

    try {
      const base = `lat=${location.latitude}&lon=${location.longitude}`
      const [detailSettled, aqiSettled] = await Promise.allSettled([
        fetch(`/api/dashboard-weather?${base}&units=${apiUnits}&wind_unit=${windApiUnit}&detail=1&refresh=1`, { signal: controller.signal, cache: 'no-store' }),
        fetch(`/api/weather/air-quality?${base}`, { signal: controller.signal }),
      ])

      if (controller.signal.aborted) return

      if (detailSettled.status === 'rejected' || !detailSettled.value.ok) {
        throw new Error('Failed to fetch detailed weather')
      }
      const detail = await detailSettled.value.json()

      let aqi: number | null = null
      let aqiCategory = 'Unavailable'
      try {
        if (aqiSettled.status === 'fulfilled' && aqiSettled.value.ok) {
          const aqiData = await aqiSettled.value.json()
          aqi = typeof aqiData.aqi === 'number' && Number.isFinite(aqiData.aqi) ? aqiData.aqi : null
          aqiCategory = aqi === null ? 'Unavailable' : aqiData.category || 'Unavailable'
        }
      } catch (err) {
        console.warn('Air quality fetch failed:', err)
      }

      if (controller.signal.aborted) return

      const fullWeatherData: DetailedWeatherData = {
        current: detail.current,
        forecast: detail.forecast ?? [],
        uvIndex: detail.uvIndex ?? null,
        airQuality: {
          aqi,
          category: aqiCategory,
        },
      }

      setDetailedWeatherData(fullWeatherData)
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Error fetching detailed weather:', error)
      }
    } finally {
      if (!controller.signal.aborted) {
        setDetailedLoading(false)
      }
    }
  }

  const toggleDetailedView = () => {
    if (!showDetailedWeather && !detailedWeatherData) {
      fetchDetailedWeather()
    }
    setShowDetailedWeather(!showDetailedWeather)
  }

  const citySlug = `${location.city.toLowerCase().replace(/\s+/g, '-')}-${location.state?.toLowerCase().replace(/\s+/g, '-') || location.country.toLowerCase()}`

  return (
    <Card data-testid={`saved-location-${location.id}`} className={`transition-all duration-200 hover:scale-[1.02] container-primary glow-interactive ${themeClasses.background}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <button
              onClick={toggleDetailedView}
              disabled={!preferencesReady}
              className={`block text-left hover:underline transition-all duration-200 ${themeClasses.text}`}
            >
              <CardTitle className="font-mono font-bold text-lg uppercase tracking-wider mb-1">
                {location.custom_name || location.location_name}
              </CardTitle>
              <p className={`text-sm font-mono ${themeClasses.mutedText}`}>
                {location.city}, {location.state || location.country}
              </p>
              <p className={`text-xs font-mono ${themeClasses.mutedText} mt-1 opacity-75`}>
                Click for detailed weather
              </p>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleFavorite}
              disabled={actionLoading === 'favorite'}
              className={`h-8 w-8 border-0 ${location.is_favorite
                  ? `${themeClasses.accentBg} text-black`
                  : `${themeClasses.text} hover:bg-white/10`
                }`}
              aria-label={location.is_favorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={location.is_favorite}
            >
              <Star className={`w-4 h-4 ${location.is_favorite ? 'fill-current' : ''}`} aria-hidden="true" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchWeather}
              disabled={loading}
              className={`h-8 w-8 border-0 ${themeClasses.text} hover:bg-white/10`}
              aria-label="Refresh weather data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              className="h-8 w-8 border-0 text-red-500 hover:bg-red-500 hover:text-white"
              aria-label={`Delete ${location.custom_name || location.location_name}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Weather Data */}
        {(error || weather?.stale) && <p role="status" className="mb-2 text-xs font-mono">{weather ? 'Showing older weather. Refresh to check for an update.' : error}</p>}
        {loading && weather && <p role="status" className="text-xs font-mono">Refreshing weather…</p>}
        {weather && <p className="mb-2 text-xs font-mono">Fetched <time dateTime={weather.fetchedAt}>{new Date(weather.fetchedAt).toLocaleString()}</time>{weather.observedAt && <> · Conditions at <time dateTime={weather.observedAt}>{new Date(weather.observedAt).toLocaleString()}</time></>}</p>}
        {loading && !weather ? (
          <div role="status" aria-label="Loading weather" className="flex items-center justify-center py-6">
            <div className={`animate-spin rounded-full h-6 w-6 border-b-2 border-terminal-accent`}></div>
          </div>
        ) : weather ? (
          <div className={`p-4 container-nested ${themeClasses.background}`}>
            {/* Current Weather */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="text-3xl" aria-hidden="true">
                  {getWeatherIcon(weather.icon)}
                </div>
                <div>
                  <p className={`text-3xl font-bold font-mono ${getTemperatureColor(weather.temperature)}`}>
                    {weather.temperature}{tempUnit}
                  </p>
                  <p className={`text-sm font-mono capitalize ${themeClasses.mutedText}`}>
                    {weather.description}
                  </p>
                  <p className={`text-xs font-mono ${themeClasses.mutedText}`}>
                    Feels like {weather.feelsLike ?? '—'}{tempUnit}
                  </p>
                </div>
              </div>
            </div>

            {/* Weather Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className={`p-3 border-0 rounded-sm`}>
                <Droplets className={`w-4 h-4 mx-auto mb-1 ${themeClasses.mutedText}`} />
                <p className={`text-sm font-mono font-bold ${themeClasses.text}`}>{weather.humidity ?? '—'}%</p>
                <p className={`text-xs font-mono ${themeClasses.mutedText}`}>Humidity</p>
              </div>

              <div className={`p-3 border-0 rounded-sm`}>
                <Wind className={`w-4 h-4 mx-auto mb-1 ${themeClasses.mutedText}`} />
                <p className={`text-sm font-mono font-bold ${themeClasses.text}`}>{weather.windSpeed === null ? '—' : Math.round(weather.windSpeed)} {windUnit}</p>
                <p className={`text-xs font-mono ${themeClasses.mutedText}`}>Wind Speed</p>
              </div>

              <div className={`p-3 border-0 rounded-sm`}>
                <Thermometer className={`w-4 h-4 mx-auto mb-1 ${themeClasses.mutedText}`} />
                <p className={`text-sm font-mono font-bold ${themeClasses.text}`}>{weather.pressure ?? '—'} hPa</p>
                <p className={`text-xs font-mono ${themeClasses.mutedText}`}>Pressure</p>
              </div>

              <div className={`p-3 border-0 rounded-sm`}>
                <MapPin className={`w-4 h-4 mx-auto mb-1 ${themeClasses.mutedText}`} />
                <p className={`text-sm font-mono font-bold ${themeClasses.text}`}>
                  {weather.visibility ?? '—'} {(weather.units ?? apiUnits) === 'metric' ? 'km' : 'mi'}
                </p>
                <p className={`text-xs font-mono ${themeClasses.mutedText}`}>Visibility</p>
              </div>
            </div>

            {/* View Details Button */}
            <div className="mt-4">
              <Button
                onClick={toggleDetailedView}
                disabled={!preferencesReady}
                className={`w-full font-mono uppercase tracking-wider ${themeClasses.accentBg} text-black hover:opacity-90`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                {showDetailedWeather ? 'Hide Details' : 'View Full Weather'}
              </Button>
            </div>
          </div>
        ) : (
          <div className={`p-4 container-nested text-center`}>
            <p className={`text-sm font-mono ${themeClasses.mutedText}`}>
              Weather data unavailable
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWeather}
              className={`mt-2 font-mono uppercase border-0 ${themeClasses.text} hover:bg-white/10`}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Notes */}
        {location.notes && (
          <div className="mt-4 p-3 border-0 rounded-sm bg-white/5">
            <p className={`text-xs font-mono ${themeClasses.mutedText}`}>
              <strong>Notes:</strong> {location.notes}
            </p>
          </div>
        )}

        {/* Detailed Weather - Inline Expansion */}
        {showDetailedWeather && (
          <div className={`mt-4 p-4 container-nested ${themeClasses.background} animate-in slide-in-from-top-2 duration-300`}>
            {detailedLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent`}></div>
              </div>
            ) : detailedWeatherData ? (
              <div className="space-y-4">
                {/* 5-Day Forecast */}
                <div>
                  <h4 className={`font-mono font-bold text-sm uppercase tracking-wider mb-3 ${themeClasses.text}`}>
                    5-Day Forecast
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {detailedWeatherData.forecast.map((day, index) => (
                      <div
                        key={index}
                        className={`p-2 border-0 ${themeClasses.background} text-center rounded-sm`}
                      >
                        <p className={`font-mono text-xs font-bold mb-1 ${themeClasses.text}`}>
                          {day.day}
                        </p>
                        <p className={`font-mono text-sm mb-1 ${getTemperatureColor(day.highTemp ?? 60)}`}>
                          {day.highTemp ?? '—'}{detailTempUnit}
                        </p>
                        <p className={`font-mono text-xs ${themeClasses.mutedText}`}>
                          {day.lowTemp ?? '—'}{detailTempUnit}
                        </p>
                        <p className={`font-mono text-[10px] mt-1 ${themeClasses.mutedText} truncate`}>
                          {day.condition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {detailedWeatherData.current.stale && <p role="status" className="text-xs font-mono">Detailed weather could not refresh. Fetched {new Date(detailedWeatherData.current.fetchedAt).toLocaleString()}.</p>}
                {/* Environmental Data */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 container-nested text-center">
                    <Sun className={`w-5 h-5 mx-auto mb-1 ${themeClasses.mutedText}`} />
                    <p className={`font-mono text-sm font-bold ${themeClasses.text}`}>
                      UV Index: {detailedWeatherData.uvIndex ?? 'Unavailable'}
                    </p>
                    <p className={`font-mono text-xs ${themeClasses.mutedText}`}>
                      {detailedWeatherData.uvIndex === null ? 'Unavailable' : detailedWeatherData.uvIndex < 3 ? 'Low' :
                        detailedWeatherData.uvIndex < 6 ? 'Moderate' :
                          detailedWeatherData.uvIndex < 8 ? 'High' : 'Very High'}
                    </p>
                  </div>

                  <div className="p-3 container-nested text-center">
                    <Wind className={`w-5 h-5 mx-auto mb-1 ${themeClasses.mutedText}`} />
                    <p className={`font-mono text-sm font-bold ${themeClasses.text}`}>
                      AQI: {detailedWeatherData.airQuality.aqi ?? 'Unavailable'}
                    </p>
                    <p className={`font-mono text-xs ${themeClasses.mutedText}`}>
                      {detailedWeatherData.airQuality.category}
                    </p>
                  </div>
                </div>

                {/* Link to Full Weather Page */}
                <Link href={`/weather/${citySlug}`} className="block w-full">
                  <Button variant="outline" className={`w-full font-mono uppercase tracking-wider border-0 ${themeClasses.text} hover:bg-white/10`}>
                    <MapPin className="w-4 h-4 inline mr-2" />
                    View Full Weather Page
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={`text-center py-4 ${themeClasses.text}`}>
                <p className="font-mono text-sm">Failed to load detailed weather</p>
                <Button variant="ghost" onClick={fetchDetailedWeather} className="mt-2 h-auto py-1 px-3 text-xs">
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}