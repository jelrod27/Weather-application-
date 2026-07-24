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
import { resolveAutoLocation, resolveUnitSystem } from '@/lib/preferences/resolve'

export type WeatherSessionMode = 'home' | 'city'

export type UseWeatherSessionOptions = {
  mode: WeatherSessionMode
  /** City page search term. Required when mode is `city`. */
  seed?: string
}

export type UseWeatherSessionResult = {
  weather: WeatherData | null
  loading: boolean
  error: string
  hasSearched: boolean
  remainingSearches: number
  handleSearch: (input: string, fromCache?: boolean, bypassRateLimit?: boolean) => Promise<void>
  handleLocationSearch: () => Promise<void>
  isAutoDetecting: boolean
  autoLocationAttempted: boolean
}

const COORDS_LIKE = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/
const GEOLOCATION_TIMEOUT_MS = 5000

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
 * Shared weather session for home bootstrap and city pages.
 * Owns load generations, cache restore/persist, units, and location detect.
 */
export function useWeatherSession({
  mode,
  seed,
}: UseWeatherSessionOptions): UseWeatherSessionResult {
  const {
    setLocationInput,
    setCurrentLocation,
    setShouldClearOnRouteChange,
    clearLocationState,
  } = useLocationContext()

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const didInitRemainingSearches = useRef(false)
  const [loading, setLoading] = useState(mode === 'city')
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [remainingSearches, setRemainingSearches] = useState(10)
  const [isClient, setIsClient] = useState(false)
  const [autoLocationAttempted, setAutoLocationAttempted] = useState(mode === 'city')
  const latestLoadId = useRef(0)
  const autoLocationStartedRef = useRef(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)

  const { profile, preferences, loading: authLoading } = useAuth()

  const isStale = (loadId: number): boolean => loadId !== latestLoadId.current

  const resolveUnits = useCallback(
    () => resolveUnitSystem(preferences, userCacheService.getUnitSystem()),
    [preferences?.temperature_unit],
  )

  useEffect(() => {
    setIsClient(true)
    if (mode === 'home') {
      setShouldClearOnRouteChange(true)
    }
  }, [mode, setShouldClearOnRouteChange])

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

  const handleLocationDetected = useCallback(
    async (location: LocationData, existingLoadId?: number) => {
      const loadId = existingLoadId ?? ++latestLoadId.current
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
          weatherSessionCache.persistAfterFetch({
            displayName: location.displayName,
            locationKey,
            weather: weatherWithCoords,
            unitSystem,
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
            weatherSessionCache.persistAfterFetch({
              displayName: fallbackQuery,
              locationKey,
              weather: fallbackWeather,
              unitSystem,
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
          weatherSessionCache.persistAfterFetch({
            displayName: location.displayName,
            locationKey,
            weather: weatherData,
            unitSystem,
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
    [applyWeather, resolveUnits],
  )

  const handleSearch = useCallback(
    async (input: string, _fromCache = false, bypassRateLimit = false) => {
      const trimmed = input.trim()
      if (!trimmed) {
        const msg = 'Please enter a location'
        setError(msg)
        toastService.error(msg)
        return
      }

      if (trimmed.length < 3) {
        const msg = 'Please enter at least 3 characters'
        setError(msg)
        toastService.error(msg)
        return
      }

      if (mode === 'home' && !bypassRateLimit) {
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

      const loadId = ++latestLoadId.current

      try {
        const unitSystem = resolveUnits()
        const cachedWeather = weatherSessionCache.getSearch(input, unitSystem)
        if (hasUsableForecast(cachedWeather)) {
          applyWeather(cachedWeather, input)
          weatherSessionCache.persistAfterFetch({
            displayName: input,
            locationKey: unitScopedLocationKey(trimmed.toLowerCase(), unitSystem),
            weather: cachedWeather,
            unitSystem,
            searchTerm: input,
          })
          return
        }

        const weatherData = await fetchWeatherData(input, unitSystem)
        if (isStale(loadId)) return

        if (!weatherData) throw new Error('City not found')
        if (!weatherData.forecast?.length) throw new Error('Incomplete weather data')

        applyWeather(weatherData, input)
        weatherSessionCache.persistAfterFetch({
          displayName: input,
          locationKey: unitScopedLocationKey(trimmed.toLowerCase(), unitSystem),
          weather: weatherData,
          unitSystem,
          searchTerm: input,
        })

        if (mode === 'home') {
          setRemainingSearches(recordRateLimitedRequest().remaining)
        }
      } catch (err: unknown) {
        if (isStale(loadId)) return
        console.error('Search error:', err)
        const msg = err instanceof Error ? err.message : 'Failed to load weather data'
        setError(msg)
        setWeather(null)
        toastService.error(msg)
      } finally {
        if (!isStale(loadId)) {
          setLoading(false)
        }
      }
    },
    [applyWeather, mode, resolveUnits],
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
    const loadId = ++latestLoadId.current

    try {
      const location = await locationService.getCurrentLocation()
      if (isStale(loadId)) return
      await handleLocationDetected(location, loadId)
      if (isStale(loadId)) return
      if (mode === 'home') {
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
  }, [handleLocationDetected, isClient, mode])

  // City mode: reset location context when the route seed changes
  useEffect(() => {
    if (mode !== 'city' || !seed?.trim()) return

    clearLocationState()
    setLocationInput(seed)
    setCurrentLocation(seed)
    setWeather(null)
    setHasSearched(false)
    setError('')
  }, [mode, seed, clearLocationState, setCurrentLocation, setLocationInput])

  // City mode: load weather for seed (re-runs when units change)
  useEffect(() => {
    if (mode !== 'city' || !seed?.trim()) return

    setShouldClearOnRouteChange(false)
    const loadId = ++latestLoadId.current
    setLoading(true)

    const run = async () => {
      try {
        const unitSystem = resolveUnits()
        const cached = weatherSessionCache.getSearch(seed, unitSystem)
        if (hasUsableForecast(cached)) {
          if (isStale(loadId)) return
          applyWeather(cached, seed)
          weatherSessionCache.persistAfterFetch({
            displayName: seed,
            locationKey: unitScopedLocationKey(seed.trim().toLowerCase(), unitSystem),
            weather: cached,
            unitSystem,
            searchTerm: seed,
          })
          return
        }

        const weatherData = await fetchWeatherData(seed, unitSystem)
        if (isStale(loadId)) return
        if (!weatherData) throw new Error('City not found')

        applyWeather(weatherData, weatherData.location || seed)
        weatherSessionCache.persistAfterFetch({
          displayName: weatherData.location || seed,
          locationKey: unitScopedLocationKey(seed.trim().toLowerCase(), unitSystem),
          weather: weatherData,
          unitSystem,
          searchTerm: seed,
        })
      } catch (err: unknown) {
        if (isStale(loadId)) return
        console.error('Error loading city weather:', err)
        setError(err instanceof Error ? err.message : 'Failed to load weather data')
        setWeather(null)
      } finally {
        if (!isStale(loadId)) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      setShouldClearOnRouteChange(true)
    }
  }, [
    mode,
    seed,
    applyWeather,
    resolveUnits,
    setShouldClearOnRouteChange,
  ])

  // Home auto-location
  useEffect(() => {
    if (mode !== 'home') return
    if (!isClient || autoLocationAttempted) return
    if (authLoading) return

    const detectWithTimeout = async (): Promise<LocationData> => {
      const locationPromise = locationService.getCurrentLocation()
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Location detection timeout')),
          GEOLOCATION_TIMEOUT_MS,
        )
      })
      try {
        return (await Promise.race([locationPromise, timeoutPromise])) as LocationData
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
      }
    }

    const tryAutoLocation = async () => {
      if (autoLocationStartedRef.current) return
      autoLocationStartedRef.current = true
      try {
        const shouldAutoLocate = resolveAutoLocation(
          preferences,
          userCacheService.getAutoLocationEnabled(),
        )

        if (shouldAutoLocate === false) {
          if (profile?.default_location) {
            await handleSearch(profile.default_location, false, true)
          }
          setAutoLocationAttempted(true)
          return
        }

        if (profile?.default_location) {
          await handleSearch(profile.default_location, false, true)
          setAutoLocationAttempted(true)
          return
        }

        const lastLocation = userCacheService.getLastLocation()
        const cachedName = lastLocation?.displayName?.trim()
        if (cachedName && !COORDS_LIKE.test(cachedName) && cachedName !== 'Current Location') {
          await handleSearch(cachedName, false, true)
          setAutoLocationAttempted(true)
          return
        }

        setIsAutoDetecting(true)
        try {
          let geolocationGranted = false
          if (navigator.permissions?.query) {
            const perm = await navigator.permissions
              .query({ name: 'geolocation' })
              .catch(() => null)
            geolocationGranted = perm?.state === 'granted'
          }

          if (geolocationGranted) {
            await handleLocationDetected(await detectWithTimeout())
          } else {
            throw new Error('Geolocation requires prompt, using IP fallback for perf')
          }
        } catch {
          try {
            const ipLocation = await locationService.getLocationByIP()
            await handleLocationDetected(ipLocation)
          } catch {
            // Silent fail
          }
        } finally {
          setIsAutoDetecting(false)
        }
        setAutoLocationAttempted(true)
      } catch {
        setIsAutoDetecting(false)
        setAutoLocationAttempted(true)
      }
    }

    const timer = setTimeout(tryAutoLocation, 50)
    return () => clearTimeout(timer)
  }, [
    mode,
    isClient,
    autoLocationAttempted,
    authLoading,
    profile,
    preferences,
    handleSearch,
    handleLocationDetected,
  ])

  // Home: restore last-displayed cache after auto-location settles
  useEffect(() => {
    if (mode !== 'home') return
    if (!isClient || isAutoDetecting) return
    if (!autoLocationAttempted) return
    if (hasSearched) return

    const cached = weatherSessionCache.getLastDisplayed()
    if (!cached) return

    setWeather(cached.weather)
    setLocationInput(cached.location)
    setHasSearched(true)

    const hasCoordinates = cached.weather.coordinates?.lat && cached.weather.coordinates?.lon
    if (!hasCoordinates) {
      const loadId = ++latestLoadId.current
      const unitSystem = resolveUnits()
      fetchWeatherData(cached.location, unitSystem)
        .then((freshData) => {
          if (isStale(loadId)) return
          if (freshData) setWeather(freshData)
        })
        .catch((e) => {
          console.warn('[cache-restore] Failed to refresh coordinates:', e)
        })
    }
  }, [
    mode,
    isClient,
    isAutoDetecting,
    autoLocationAttempted,
    hasSearched,
    resolveUnits,
    setLocationInput,
  ])

  return {
    weather,
    loading,
    error,
    hasSearched,
    remainingSearches,
    handleSearch,
    handleLocationSearch,
    isAutoDetecting,
    autoLocationAttempted,
  }
}
