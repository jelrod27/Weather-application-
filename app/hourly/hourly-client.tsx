"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useLocationContext } from "@/components/location-context"
import WeatherSearch from "@/components/weather-search"
import { useAuth } from "@/lib/auth"
import { fetchWeatherData } from "@/lib/weather"
import HourlyForecast from "@/components/hourly-forecast"
import { resolveUnitSystem } from "@/lib/preferences/resolve"
import { userCacheService } from "@/lib/user-cache-service"
import { weatherSessionCache } from "@/lib/weather-session-cache"
import { locationInputToSlug } from "@/lib/city-slug"
import type { WeatherData } from "@/lib/types"

export default function HourlyClient(): React.JSX.Element {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { theme } = useTheme()
  const { preferences } = useAuth()
  const { currentLocation, locationInput } = useLocationContext()
  const [viewedLocation] = useState(() => currentLocation || locationInput)
  const [savedLocation, setSavedLocation] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const city = searchParams.get('city')?.trim()
  const hasCoordinates = lat !== null || lon !== null
  const validCoordinates = Boolean(lat?.trim() && lon?.trim()) &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) &&
    Math.abs(Number(lat)) <= 90 && Math.abs(Number(lon)) <= 180
  const query = hasCoordinates
    ? validCoordinates ? `${Number(lat)},${Number(lon)}` : ''
    : city || viewedLocation || savedLocation || ''
  const unitSystem = resolveUnitSystem(preferences, userCacheService.getUnitSystem())
  const locationReady = Boolean(query) || savedLocation !== null || hasCoordinates

  useEffect(() => {
    setSavedLocation(weatherSessionCache.getLastDisplayed()?.location ?? '')
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!locationReady) return
    if (!query) {
      setWeather(null)
      setError(hasCoordinates ? 'These coordinates are invalid. Search for a location below.' : null)
      setLoading(false)
      return
    }
    setLoading(true)
    setWeather(null)
    setError(null)
    void fetchWeatherData(query, unitSystem).then((data) => {
      if (!cancelled) setWeather(data)
    }).catch((err) => {
      if (!cancelled) {
        console.error('[Hourly]', err)
        setWeather(null)
        setError('Hourly forecast unavailable. Retry or search for another location.')
      }
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [query, unitSystem, retry, locationReady, hasCoordinates])

  const forecastName = city || (!hasCoordinates ? query : '') || weather?.location
  const coordinates = weather?.coordinates
  const returnQuery = coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon)
    ? `${coordinates.lat},${coordinates.lon}` : query
  const forecastHref = forecastName
    ? `/weather/${locationInputToSlug(forecastName)}?${new URLSearchParams({ location: returnQuery })}` : '/'

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Link href={forecastHref} className="font-mono text-sm underline text-primary">Back to forecast</Link>
      <h1 className="text-3xl font-bold font-mono">48-Hour Forecast</h1>
      <WeatherSearch
        onSearch={(value) => {
          const name = value.trim()
          if (name) router.push(`/hourly?${new URLSearchParams({ city: name })}`)
        }}
        isLoading={loading}
        hideLocationButton
      />
      {loading ? (
        <p role="status" className="flex items-center gap-3 font-mono"><Loader2 className="animate-spin" />Loading hourly forecast...</p>
      ) : error ? (
        <div role="alert" className="space-y-3 font-mono">
          <p>{error}</p>
          {query && <button className="underline text-primary" onClick={() => setRetry((value) => value + 1)}>Retry hourly forecast</button>}
        </div>
      ) : !query ? (
        <p className="font-mono">Choose a location to see its hourly forecast.</p>
      ) : !weather?.hourlyForecast?.length ? (
        <div className="space-y-3 font-mono">
          <p>Hourly forecast data is unavailable for this location.</p>
          <button className="underline text-primary" onClick={() => setRetry((value) => value + 1)}>Retry hourly forecast</button>
        </div>
      ) : (
        <>
          <p className="font-mono text-lg">{weather.location}</p>
          <HourlyForecast hourly={weather.hourlyForecast} theme={theme} tempUnit={weather.unit} timezone={weather.timezone} />
          <p className="font-mono text-sm text-muted-foreground">Scroll horizontally to explore available hours. Times use the forecast location’s time zone.</p>
        </>
      )}
    </div>
  )
}
