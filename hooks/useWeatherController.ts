/**
 * Home weather bootstrap: shared session + auto-locate + last-displayed restore.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { userCacheService } from '@/lib/user-cache-service'
import { useLocationContext } from '@/components/location-context'
import { useAuth } from '@/lib/auth'
import { LAST_LOCATION_KEY, weatherSessionCache } from '@/lib/weather-session-cache'
import { resolveAutoLocation, resolveUnitSystem } from '@/lib/preferences/resolve'
import { fetchWeatherData } from '@/lib/weather'
import { pickHomeBootstrapSource } from '@/lib/weather/home-bootstrap'
import { safeStorage } from '@/lib/safe-storage'
import { useWeatherSession } from '@/hooks/useWeatherSession'

export type UseWeatherControllerResult = {
  weather: ReturnType<typeof useWeatherSession>['weather']
  loading: boolean
  error: string
  hasSearched: boolean
  remainingSearches: number
  handleSearch: ReturnType<typeof useWeatherSession>['handleSearch']
  handleLocationSearch: ReturnType<typeof useWeatherSession>['handleLocationSearch']
  isAutoDetecting: boolean
  autoLocationAttempted: boolean
  cancelLocationDetection: () => void
}

export function useWeatherController(): UseWeatherControllerResult {
  const {
    weather,
    loading,
    error,
    hasSearched,
    remainingSearches,
    handleSearch,
    handleLocationSearch,
    beginLoad,
    isStale,
    setWeather,
    setHasSearched,
    isClient,
  } = useWeatherSession({ enforceRateLimit: true, locationTimeoutMs: 15_000 })

  const { setLocationInput, setShouldClearOnRouteChange } = useLocationContext()
  const { profile, preferences, loading: authLoading } = useAuth()

  const [autoLocationAttempted, setAutoLocationAttempted] = useState(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const autoLocationStartedRef = useRef(false)
  const manualLocationStartedRef = useRef(false)
  const locationRequestRef = useRef(0)

  const runLocationDetection = useCallback(async () => {
    const requestId = ++locationRequestRef.current
    setIsAutoDetecting(true)
    try {
      await handleLocationSearch()
    } finally {
      if (requestId === locationRequestRef.current) setIsAutoDetecting(false)
    }
  }, [handleLocationSearch])

  const cancelLocationDetection = () => {
    manualLocationStartedRef.current = true
    locationRequestRef.current += 1
    beginLoad()
    setAutoLocationAttempted(true)
    setIsAutoDetecting(false)
  }

  const handleChosenLocationSearch = async () => {
    manualLocationStartedRef.current = true
    setAutoLocationAttempted(true)
    await runLocationDetection()
  }

  useEffect(() => {
    setShouldClearOnRouteChange(true)
  }, [setShouldClearOnRouteChange])

  // A late device response must not replace the city chosen on another route.
  useEffect(() => () => {
    locationRequestRef.current += 1
    beginLoad()
  }, [beginLoad])

  useEffect(() => {
    if (!isClient || autoLocationAttempted) return
    if (authLoading) return

    const tryAutoLocation = async () => {
      if (autoLocationStartedRef.current) return
      autoLocationStartedRef.current = true
      if (manualLocationStartedRef.current) return
      try {
        const shouldAutoLocate = resolveAutoLocation(
          preferences,
          userCacheService.getAutoLocationEnabled(),
        )

        const source = pickHomeBootstrapSource({
          shouldAutoLocate,
          profileDefault: profile?.default_location,
          lastDisplayedCity: safeStorage.getItem(LAST_LOCATION_KEY),
          cachedDisplayName: userCacheService.getLastLocation()?.displayName,
        })

        if (source.kind === 'search') {
          await handleSearch(source.query, true)
          setAutoLocationAttempted(true)
          return
        }

        if (source.kind === 'none') {
          setAutoLocationAttempted(true)
          return
        }

        // Ask the browser once on arrival. City search stays available while
        // permission is pending; blocked requests can be retried with a click.
        await runLocationDetection()
        setAutoLocationAttempted(true)
      } catch {
        setIsAutoDetecting(false)
        setAutoLocationAttempted(true)
      }
    }

    const timer = setTimeout(tryAutoLocation, 50)
    return () => clearTimeout(timer)
  }, [
    isClient,
    autoLocationAttempted,
    authLoading,
    profile,
    preferences,
    handleSearch,
    runLocationDetection,
  ])

  useEffect(() => {
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
      const loadId = beginLoad()
      const unitSystem = resolveUnitSystem(
        preferences,
        userCacheService.getUnitSystem(),
      )
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
    isClient,
    isAutoDetecting,
    autoLocationAttempted,
    hasSearched,
    preferences,
    setLocationInput,
    setWeather,
    setHasSearched,
    beginLoad,
    isStale,
  ])

  return {
    weather,
    loading,
    error,
    hasSearched,
    remainingSearches,
    handleSearch,
    handleLocationSearch: handleChosenLocationSearch,
    isAutoDetecting,
    autoLocationAttempted,
    cancelLocationDetection,
  }
}
