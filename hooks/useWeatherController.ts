/**
 * Home weather bootstrap: shared session + auto-locate + last-displayed restore.
 */
import { useEffect, useRef, useState } from 'react'
import type { LocationData } from '@/lib/location-service'
import { locationService } from '@/lib/location-service'
import { userCacheService } from '@/lib/user-cache-service'
import { useLocationContext } from '@/components/location-context'
import { useAuth } from '@/lib/auth'
import { LAST_LOCATION_KEY, weatherSessionCache } from '@/lib/weather-session-cache'
import { resolveAutoLocation, resolveUnitSystem } from '@/lib/preferences/resolve'
import { fetchWeatherData } from '@/lib/weather'
import { pickHomeBootstrapSource } from '@/lib/weather/home-bootstrap'
import { safeStorage } from '@/lib/safe-storage'
import { useWeatherSession } from '@/hooks/useWeatherSession'

const GEOLOCATION_TIMEOUT_MS = 5000

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
}

async function detectWithTimeout(): Promise<LocationData> {
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

export function useWeatherController(): UseWeatherControllerResult {
  const {
    weather,
    loading,
    error,
    hasSearched,
    remainingSearches,
    handleSearch,
    handleLocationSearch,
    loadFromLocation,
    beginLoad,
    isStale,
    setWeather,
    setHasSearched,
    isClient,
  } = useWeatherSession({ enforceRateLimit: true })

  const { setLocationInput, setShouldClearOnRouteChange } = useLocationContext()
  const { profile, preferences, loading: authLoading } = useAuth()

  const [autoLocationAttempted, setAutoLocationAttempted] = useState(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const autoLocationStartedRef = useRef(false)
  const manualLocationStartedRef = useRef(false)

  const handleChosenLocationSearch = async () => {
    manualLocationStartedRef.current = true
    setAutoLocationAttempted(true)
    await handleLocationSearch()
  }

  useEffect(() => {
    setShouldClearOnRouteChange(true)
  }, [setShouldClearOnRouteChange])

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

        let geolocationGranted = false
        if (navigator.permissions?.query) {
          const permission = await navigator.permissions
            .query({ name: 'geolocation' })
            .catch(() => null)
          geolocationGranted = permission?.state === 'granted'
        }

        if (manualLocationStartedRef.current) return

        // A fresh visitor chooses when to request device location. In particular,
        // do not hide the start options behind a silent network-based IP lookup.
        if (!geolocationGranted) {
          setAutoLocationAttempted(true)
          return
        }

        setIsAutoDetecting(true)
        try {
          await loadFromLocation(await detectWithTimeout())
        } catch {
          try {
            const ipLocation = await locationService.getLocationByIP()
            await loadFromLocation(ipLocation)
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
    isClient,
    autoLocationAttempted,
    authLoading,
    profile,
    preferences,
    handleSearch,
    loadFromLocation,
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
  }
}
