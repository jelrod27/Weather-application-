/**
 * Home weather bootstrap: shared session + auto-locate + last-displayed restore.
 */
import { useEffect, useRef, useState } from 'react'
import type { LocationData } from '@/lib/location-service'
import { locationService } from '@/lib/location-service'
import { userCacheService } from '@/lib/user-cache-service'
import { useLocationContext } from '@/components/location-context'
import { useAuth } from '@/lib/auth'
import { weatherSessionCache } from '@/lib/weather-session-cache'
import { resolveAutoLocation, resolveUnitSystem } from '@/lib/preferences/resolve'
import { fetchWeatherData } from '@/lib/weather'
import { useWeatherSession } from '@/hooks/useWeatherSession'

const COORDS_LIKE = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/
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

  useEffect(() => {
    setShouldClearOnRouteChange(true)
  }, [setShouldClearOnRouteChange])

  useEffect(() => {
    if (!isClient || autoLocationAttempted) return
    if (authLoading) return

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
            await handleSearch(profile.default_location, true)
          }
          setAutoLocationAttempted(true)
          return
        }

        if (profile?.default_location) {
          await handleSearch(profile.default_location, true)
          setAutoLocationAttempted(true)
          return
        }

        const lastLocation = userCacheService.getLastLocation()
        const cachedName = lastLocation?.displayName?.trim()
        if (cachedName && !COORDS_LIKE.test(cachedName) && cachedName !== 'Current Location') {
          await handleSearch(cachedName, true)
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
            await loadFromLocation(await detectWithTimeout())
          } else {
            throw new Error('Geolocation requires prompt, using IP fallback for perf')
          }
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
    handleLocationSearch,
    isAutoDetecting,
    autoLocationAttempted,
  }
}
