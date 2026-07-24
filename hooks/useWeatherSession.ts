import { useState, useEffect, useCallback, useRef } from 'react'
import type { WeatherData } from '@/lib/types'
import { fetchWeatherData, fetchWeatherByLocation } from '@/lib/weather'
import type { LocationData } from '@/lib/location-service'
import { locationService } from '@/lib/location-service'
import { userCacheService } from '@/lib/user-cache-service'
import { toastService } from '@/lib/toast-service'
import { useLocationContext } from '@/components/location-context'
import { useAuth } from '@/lib/auth'
import { checkRateLimit, recordRateLimitedRequest } from '@/lib/weather-rate-limit'
import { weatherSessionCache } from '@/lib/weather-session-cache'
import { resolveUnitSystem } from '@/lib/preferences/resolve'

export type UseWeatherSessionOptions = {
  /** When true, searches enforce the client rate limit and decrement remaining. */
  enforceRateLimit?: boolean
  /** Initial loading flag (city pages start loading until the seed resolves). */
  initiallyLoading?: boolean
}

export type UseWeatherSessionResult = {
  weather: WeatherData | null
  loading: boolean
  error: string
  hasSearched: boolean
  remainingSearches: number
  /** @param bypassRateLimit Skip rate limit (home bootstrap / seeded loads). */
  handleSearch: (input: string, bypassRateLimit?: boolean) => Promise<void>
  /** Query loader used by city seed and other quiet loads. */
  loadQuery: (
    input: string,
    options?: {
      bypassRateLimit?: boolean
      toastOnError?: boolean
      preferResolvedLocation?: boolean
    },
  ) => Promise<void>
  handleLocationSearch: () => Promise<void>
  /** Shared by home auto-locate after GPS/IP resolve. */
  loadFromLocation: (location: LocationData, existingLoadId?: number) => Promise<void>
  beginLoad: () => number
  isStale: (loadId: number) => boolean
  /** Clear in-memory weather state (city route transitions). */
  resetWeatherState: () => void
  setWeather: (weather: WeatherData | null) => void
  setHasSearched: (value: boolean) => void
  isClient: boolean
}

function unitScopedLocationKey(baseKey: string, unitSystem: string): string {
  return `${baseKey}_${unitSystem}`
}

function hasUsableForecast(
  weather: WeatherData | null | undefined,
): weather is WeatherData {
  return Boolean(weather?.forecast && weather.forecast.length > 0)
}

function hasFiniteCoords(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  )
}

/**
 * Core weather load/cache/generation session.
 * Home and city compose bootstrap on top — this hook has no product mode flag.
 */
export function useWeatherSession({
  enforceRateLimit = false,
  initiallyLoading = false,
}: UseWeatherSessionOptions = {}): UseWeatherSessionResult {
  const { setLocationInput, setCurrentLocation } = useLocationContext()

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const didInitRemainingSearches = useRef(false)
  const [loading, setLoading] = useState(initiallyLoading)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [remainingSearches, setRemainingSearches] = useState(10)
  const [isClient, setIsClient] = useState(false)
  const latestLoadId = useRef(0)

  const { preferences } = useAuth()

  const isStale = useCallback(
    (loadId: number): boolean => loadId !== latestLoadId.current,
    [],
  )

  const beginLoad = useCallback((): number => {
    latestLoadId.current += 1
    return latestLoadId.current
  }, [])

  const resolveUnits = useCallback(
    () => resolveUnitSystem(preferences, userCacheService.getUnitSystem()),
    [preferences?.temperature_unit],
  )

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || didInitRemainingSearches.current) return
    didInitRemainingSearches.current = true
    setRemainingSearches(checkRateLimit().remaining)
  }, [isClient])

  const applyWeather = useCallback(
    (weatherData: WeatherData, displayName: string) => {
      setWeather(weatherData)
      setLocationInput(displayName)
      setCurrentLocation(displayName)
      setHasSearched(true)
      setError('')
    },
    [setLocationInput, setCurrentLocation],
  )

  const persistWeather = useCallback(
    (
      displayName: string,
      weatherData: WeatherData,
      unitSystem: string,
      options?: { locationKey?: string; searchTerm?: string },
    ) => {
      const locationKey =
        options?.locationKey ??
        unitScopedLocationKey(displayName.trim().toLowerCase(), unitSystem)
      weatherSessionCache.persistAfterFetch({
        displayName,
        locationKey,
        weather: weatherData,
        unitSystem,
        searchTerm: options?.searchTerm,
      })
    },
    [],
  )

  const loadFromLocation = useCallback(
    async (location: LocationData, existingLoadId?: number) => {
      const loadId = existingLoadId ?? beginLoad()
      try {
        userCacheService.saveLastLocation(location)
        const unitSystem = resolveUnits()
        const locationKey = unitScopedLocationKey(
          userCacheService.getLocationKey(location),
          unitSystem,
        )
        const cachedWeather = weatherSessionCache.getByLocation(locationKey)
        const locationHasCoords = hasFiniteCoords(location.latitude, location.longitude)

        if (hasUsableForecast(cachedWeather)) {
          const cachedHasCoords = hasFiniteCoords(
            cachedWeather.coordinates?.lat,
            cachedWeather.coordinates?.lon,
          )
          const weatherWithCoords =
            cachedHasCoords || !locationHasCoords
              ? cachedWeather
              : {
                  ...cachedWeather,
                  coordinates: {
                    lat: location.latitude,
                    lon: location.longitude,
                  },
                }
          applyWeather(weatherWithCoords, location.displayName)
          persistWeather(location.displayName, weatherWithCoords, unitSystem, {
            locationKey,
          })
          return
        }

        setLoading(true)
        setError('')

        if (!locationHasCoords) {
          const fallbackQuery = location.displayName?.trim()
          if (!fallbackQuery) {
            throw new Error('Location missing coordinates and displayName')
          }

          const fallbackWeather = await fetchWeatherData(fallbackQuery, unitSystem)
          if (isStale(loadId)) return

          if (fallbackWeather) {
            applyWeather(fallbackWeather, fallbackQuery)
            persistWeather(fallbackQuery, fallbackWeather, unitSystem, {
              locationKey,
              searchTerm: fallbackQuery,
            })
          }
          return
        }

        const coords = `${location.latitude},${location.longitude}`
        const weatherData = await fetchWeatherByLocation(
          coords,
          unitSystem,
          location.displayName,
        )
        if (isStale(loadId)) return

        if (weatherData) {
          applyWeather(weatherData, location.displayName)
          persistWeather(location.displayName, weatherData, unitSystem, {
            locationKey,
          })
        }
      } catch (err: unknown) {
        if (isStale(loadId)) return
        console.warn('[auto-location] Failed to load weather for detected location:', err)
        setError('Failed to load weather data for your location')
      } finally {
        if (!isStale(loadId)) {
          setLoading(false)
        }
      }
    },
    [applyWeather, beginLoad, isStale, persistWeather, resolveUnits],
  )

  const loadQuery = useCallback(
    async (
      input: string,
      options: {
        bypassRateLimit?: boolean
        toastOnError?: boolean
        /** Prefer API-resolved location label over the search input. */
        preferResolvedLocation?: boolean
      } = {},
    ) => {
      const {
        bypassRateLimit = false,
        toastOnError = true,
        preferResolvedLocation = false,
      } = options
      const trimmed = input.trim()
      if (!trimmed) {
        const msg = 'Please enter a location'
        setError(msg)
        if (toastOnError) toastService.error(msg)
        return
      }

      if (trimmed.length < 3) {
        const msg = 'Please enter at least 3 characters'
        setError(msg)
        if (toastOnError) toastService.error(msg)
        return
      }

      if (enforceRateLimit && !bypassRateLimit) {
        const { allowed, message } = checkRateLimit()
        if (!allowed) {
          const msg = message || 'Rate limit exceeded'
          setError(msg)
          toastService.warning(msg)
          return
        }
      }

      setLoading(true)
      setError('')
      const loadId = beginLoad()

      try {
        const unitSystem = resolveUnits()
        const cachedWeather = weatherSessionCache.getSearch(input, unitSystem)
        if (hasUsableForecast(cachedWeather)) {
          const label = preferResolvedLocation
            ? cachedWeather.location || input
            : input
          applyWeather(cachedWeather, label)
          persistWeather(label, cachedWeather, unitSystem, { searchTerm: input })
          return
        }

        const weatherData = await fetchWeatherData(input, unitSystem)
        if (isStale(loadId)) return

        if (!weatherData) throw new Error('City not found')
        if (!weatherData.forecast?.length) throw new Error('Incomplete weather data')

        const label = preferResolvedLocation
          ? weatherData.location || input
          : input
        applyWeather(weatherData, label)
        persistWeather(label, weatherData, unitSystem, { searchTerm: input })

        if (enforceRateLimit) {
          setRemainingSearches(recordRateLimitedRequest().remaining)
        }
      } catch (err: unknown) {
        if (isStale(loadId)) return
        console.error('Search error:', err)
        const msg = err instanceof Error ? err.message : 'Failed to load weather data'
        setError(msg)
        setWeather(null)
        if (toastOnError) toastService.error(msg)
      } finally {
        if (!isStale(loadId)) {
          setLoading(false)
        }
      }
    },
    [
      applyWeather,
      beginLoad,
      enforceRateLimit,
      isStale,
      persistWeather,
      resolveUnits,
    ],
  )

  const handleSearch = useCallback(
    async (input: string, bypassRateLimit = false) => {
      await loadQuery(input, { bypassRateLimit, toastOnError: true })
    },
    [loadQuery],
  )

  const handleLocationSearch = useCallback(async () => {
    if (!locationService.isGeolocationSupported()) {
      setError('Geolocation is not supported by your browser')
      return
    }

    if (isClient) {
      weatherSessionCache.clearLastDisplayed()
    }

    setLoading(true)
    setError('')
    const loadId = beginLoad()

    try {
      const location = await locationService.getCurrentLocation()
      if (isStale(loadId)) return
      await loadFromLocation(location, loadId)
      if (isStale(loadId)) return
      if (enforceRateLimit) {
        setRemainingSearches(recordRateLimitedRequest().remaining)
      }
    } catch (err: unknown) {
      if (isStale(loadId)) return
      console.error('Location error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get your location')
    } finally {
      if (!isStale(loadId)) {
        setLoading(false)
      }
    }
  }, [beginLoad, enforceRateLimit, isClient, isStale, loadFromLocation])

  const resetWeatherState = useCallback(() => {
    setWeather(null)
    setHasSearched(false)
    setError('')
  }, [])

  return {
    weather,
    loading,
    error,
    hasSearched,
    remainingSearches,
    handleSearch,
    loadQuery,
    handleLocationSearch,
    loadFromLocation,
    beginLoad,
    isStale,
    resetWeatherState,
    setWeather,
    setHasSearched,
    isClient,
  }
}
