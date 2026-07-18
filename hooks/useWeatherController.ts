import { useState, useEffect, useCallback, useRef } from 'react'
import type { WeatherData } from '@/lib/types'
import { fetchWeatherData, fetchWeatherByLocation } from '@/lib/weather'
import type { LocationData } from '@/lib/location-service';
import { locationService } from '@/lib/location-service'
import { userCacheService } from '@/lib/user-cache-service'
import { toastService } from '@/lib/toast-service'
import { useLocationContext } from '@/components/location-context'
import { useAuth } from '@/lib/auth'
import { checkRateLimit, recordRateLimitedRequest } from '@/lib/weather-rate-limit'
import {
    CACHE_KEY,
    WEATHER_KEY,
    CACHE_TIMESTAMP_KEY,
    saveLocationToCache,
    saveWeatherToCache,
    addToSearchCache,
    getFromSearchCache,
} from '@/lib/weather-search-cache'

export function useWeatherController() {
    const {
        locationInput,
        currentLocation,
        setLocationInput,
        setCurrentLocation,
        setShouldClearOnRouteChange
    } = useLocationContext()

    const [weather, setWeather] = useState<WeatherData | null>(null)
    const didInitRemainingSearches = useRef(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>("")
    const [hasSearched, setHasSearched] = useState(false)
    const [remainingSearches, setRemainingSearches] = useState(10)
    const [isClient, setIsClient] = useState(false)
    const [autoLocationAttempted, setAutoLocationAttempted] = useState(false)
    // Monotonic id for weather loads: a stale slow response (search or
    // location-detect) must not overwrite state written by a newer one.
    const latestLoadId = useRef(0)
    // Synchronous guard for the auto-location effect: the state flag above is
    // only set after awaits complete, so a dependency change mid-flight
    // (profile/preferences arriving) could start a second concurrent run.
    const autoLocationStartedRef = useRef(false)
    const [isAutoDetecting, setIsAutoDetecting] = useState(false)

    const { profile, preferences, loading: authLoading } = useAuth()

    // Initialize client state
    useEffect(() => {
        setIsClient(true)
        setShouldClearOnRouteChange(true)
    }, [setShouldClearOnRouteChange])

    // Update remaining searches on mount
    useEffect(() => {
        if (!isClient || didInitRemainingSearches.current) return
        didInitRemainingSearches.current = true
        setRemainingSearches(checkRateLimit().remaining)
    }, [isClient])

    // Weather handling. Optional existingLoadId lets callers (e.g. "use my
    // location") share one generation so post-detect work is not treated as stale.
    const handleLocationDetected = useCallback(async (
        location: LocationData,
        existingLoadId?: number,
    ) => {
        const loadId = existingLoadId ?? ++latestLoadId.current
        try {
            userCacheService.saveLastLocation(location)
            const unitSystemForKey: 'metric' | 'imperial' = preferences?.temperature_unit === 'celsius' ? 'metric' : 'imperial'
            // Unit-scoped key: cached payloads are unit-baked (see search cache).
            const locationKey = `${userCacheService.getLocationKey(location)}_${unitSystemForKey}`
            const cachedWeather = userCacheService.getCachedWeatherData(locationKey)

            const hasCoords =
                typeof location.latitude === 'number' &&
                Number.isFinite(location.latitude) &&
                typeof location.longitude === 'number' &&
                Number.isFinite(location.longitude)

            if (cachedWeather?.forecast && cachedWeather.forecast.length > 0) {
                const cachedHasCoords =
                    cachedWeather.coordinates?.lat != null &&
                    cachedWeather.coordinates?.lon != null
                const weatherWithCoords =
                    cachedHasCoords || !hasCoords
                        ? cachedWeather
                        : {
                              ...cachedWeather,
                              coordinates: {
                                  lat: location.latitude,
                                  lon: location.longitude,
                              },
                          }
                setWeather(weatherWithCoords)
                setLocationInput(location.displayName)
                setCurrentLocation(location.displayName)
                setHasSearched(true)
                setError('')
                return
            }

            setLoading(true)
            setError('')

            // Guard: some call sites can pass a "location" without coordinates
            // (e.g. privacy-stripped cached lastLocation). Avoid "undefined,undefined".
            if (!hasCoords) {
                const fallbackQuery = location.displayName?.trim()
                if (!fallbackQuery) {
                    throw new Error('Location missing coordinates and displayName')
                }

                // Fall back to the normal search flow (geocoding -> weather) using display name,
                // but do it inline to avoid referencing handleSearch before it's declared.
                const fallbackUnitSystem: 'metric' | 'imperial' =
                    preferences?.temperature_unit === 'celsius' ? 'metric' : 'imperial'
                const fallbackWeather = await fetchWeatherData(fallbackQuery, fallbackUnitSystem)
                if (loadId !== latestLoadId.current) return

                if (fallbackWeather) {
                    setWeather(fallbackWeather)
                    setLocationInput(fallbackQuery)
                    setCurrentLocation(fallbackQuery)
                    setHasSearched(true)
                    userCacheService.cacheWeatherData(locationKey, fallbackWeather)
                    saveLocationToCache(fallbackQuery)
                    saveWeatherToCache(fallbackWeather)
                }
                return
            }

            const coords = `${location.latitude},${location.longitude}`
            const unitSystem: 'metric' | 'imperial' = preferences?.temperature_unit === 'celsius' ? 'metric' : 'imperial'
            const weatherData = await fetchWeatherByLocation(coords, unitSystem, location.displayName)
            if (loadId !== latestLoadId.current) return

            if (weatherData) {
                setWeather(weatherData)
                setLocationInput(location.displayName)
                setCurrentLocation(location.displayName)
                setHasSearched(true)
                userCacheService.cacheWeatherData(locationKey, weatherData)
                saveLocationToCache(location.displayName)
                saveWeatherToCache(weatherData)
            }
        } catch (error: unknown) {
            // Use warn instead of error for auto-detected locations — 404 "Location not found"
            // is expected when IP geolocation returns imprecise coordinates. This prevents
            // noisy red console errors on pages that don't use weather data.
            if (loadId !== latestLoadId.current) return
            console.warn('[auto-location] Failed to load weather for detected location:', error)
            setError('Failed to load weather data for your location')
        } finally {
            if (loadId === latestLoadId.current) {
                setLoading(false)
            }
        }
    }, [preferences?.temperature_unit, setLocationInput, setCurrentLocation])

    const handleSearch = useCallback(async (input: string, fromCache = false, bypassRateLimit = false) => {
        if (!input.trim()) {
            const msg = "Please enter a location"
            setError(msg)
            toastService.error(msg)
            return
        }

        if (input.trim().length < 3) {
            const msg = "Please enter at least 3 characters"
            setError(msg)
            toastService.error(msg)
            return
        }

        if (!bypassRateLimit) {
            const { allowed, message } = checkRateLimit()
            if (!allowed) {
                const msg = message || "Rate limit exceeded"
                setError(msg)
                toastService.warning(msg)
                return
            }
        }

        setLoading(true)
        setError("")

        // Sequence this load: if another search or location-detect starts
        // while we are awaiting, our results are stale and must not be
        // written (previously a slow "Springfield" response could overwrite
        // a newer "Boston" result, or a stale failure could clobber a newer
        // success with setWeather(null)).
        const loadId = ++latestLoadId.current

        try {
            const unitSystem: 'metric' | 'imperial' = preferences?.temperature_unit === 'celsius' ? 'metric' : 'imperial'

            const cachedWeather = getFromSearchCache(input, unitSystem)
            if (cachedWeather?.forecast && cachedWeather.forecast.length > 0) {
                setWeather(cachedWeather)
                setHasSearched(true)
                setCurrentLocation(input)
                return
            }

            const weatherData = await fetchWeatherData(input, unitSystem)
            if (loadId !== latestLoadId.current) return

            if (!weatherData) throw new Error('City not found')
            if (!weatherData.forecast?.length) throw new Error('Incomplete weather data')

            setWeather(weatherData)
            setHasSearched(true)
            setCurrentLocation(input)
            saveLocationToCache(input)
            saveWeatherToCache(weatherData)
            setRemainingSearches(recordRateLimitedRequest().remaining)
            addToSearchCache(input, weatherData, unitSystem)

        } catch (error: any) {
            if (loadId !== latestLoadId.current) return
            console.error('Search error:', error)
            const msg = error.message || 'Failed to load weather data'
            setError(msg)
            setWeather(null)
            toastService.error(msg)
        } finally {
            if (loadId === latestLoadId.current) {
                setLoading(false)
            }
        }
    }, [preferences?.temperature_unit, setCurrentLocation])

    const handleLocationSearch = useCallback(async () => {
        if (!locationService.isGeolocationSupported()) {
            setError("Geolocation is not supported by your browser")
            return
        }

        if (isClient) {
            localStorage.removeItem(CACHE_KEY)
            localStorage.removeItem(WEATHER_KEY)
            localStorage.removeItem(CACHE_TIMESTAMP_KEY)
        }

        setLoading(true)
        setError("")
        const loadId = ++latestLoadId.current

        try {
            const location = await locationService.getCurrentLocation()
            if (loadId !== latestLoadId.current) return
            await handleLocationDetected(location, loadId)
            if (loadId !== latestLoadId.current) return
            setRemainingSearches(recordRateLimitedRequest().remaining)
        } catch (error: any) {
            if (loadId !== latestLoadId.current) return
            console.error("Location error:", error)
            setError(error.message || "Failed to get your location")
        } finally {
            if (loadId === latestLoadId.current) {
                setLoading(false)
            }
        }
    }, [isClient, handleLocationDetected])

    // Auto-location effect
    useEffect(() => {
        if (!isClient || autoLocationAttempted) return

        // (Phase 4 cleanup removed a NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE branch
        // that short-circuited authLoading for E2E. Tests should now stub
        // the Supabase auth response or wait on the loaded UI explicitly.)
        if (authLoading) return

        const tryAutoLocation = async () => {
            // Synchronous re-entry guard: deps (profile/preferences identity)
            // can change while the first run is mid-await, re-running this
            // effect before autoLocationAttempted state is set. Without the
            // ref, run #2 would race IP detection against the profile's
            // default location (non-deterministic displayed city, double
            // rate-limit recording).
            if (autoLocationStartedRef.current) return
            autoLocationStartedRef.current = true
            try {
                const localPrefs = userCacheService.getPreferences()
                const localAutoLocate =
                    (localPrefs as any)?.settings?.auto_location ??
                    (localPrefs as any)?.settings?.autoLocation ??
                    (localPrefs as any)?.auto_location ??
                    (localPrefs as any)?.autoLocation

                const shouldAutoLocate = preferences?.auto_location ?? localAutoLocate ?? true

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
                // Defensive: older sessions could persist a coordinate-string
                // displayName (e.g. "37.7497, -121.9547") if Nominatim reverse
                // geocoding had failed. Forwarding that to handleSearch sends
                // it to direct geocoding as if it were a city name, which 404s.
                // Ignore poisoned cache entries and fall through to fresh
                // geolocation below.
                const COORDS_LIKE = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/
                const cachedName = lastLocation?.displayName?.trim()
                if (cachedName && !COORDS_LIKE.test(cachedName) && cachedName !== 'Current Location') {
                    await handleSearch(cachedName, false, true)
                    setAutoLocationAttempted(true)
                    return
                }

                setIsAutoDetecting(true)
                try {
                    // Fast-path IP location for Lighthouse/unprompted users
                    let hasDbPermission = false
                    if (navigator.permissions && navigator.permissions.query) {
                        const perm = await navigator.permissions.query({ name: 'geolocation' }).catch(() => null)
                        hasDbPermission = perm?.state === 'granted'
                    }

                    if (hasDbPermission) {
                        const locationPromise = locationService.getCurrentLocation()
                        let timeoutId: ReturnType<typeof setTimeout> | undefined
                        const timeoutPromise = new Promise<never>((_, reject) => {
                            timeoutId = setTimeout(
                                () => reject(new Error('Location detection timeout')),
                                5000,
                            )
                        })
                        try {
                            const location = await Promise.race([
                                locationPromise,
                                timeoutPromise,
                            ]) as LocationData
                            await handleLocationDetected(location)
                        } finally {
                            if (timeoutId !== undefined) clearTimeout(timeoutId)
                        }
                    } else {
                        throw new Error('Geolocation requires prompt, using IP fallback for perf')
                    }
                } catch (error) {
                    try {
                        const ipLocation = await locationService.getLocationByIP()
                        await handleLocationDetected(ipLocation)
                    } catch (ipError) {
                        // Silent fail
                    }
                } finally {
                    setIsAutoDetecting(false)
                }
                setAutoLocationAttempted(true)
            } catch (error) {
                setIsAutoDetecting(false)
                setAutoLocationAttempted(true)
            }
        }

        const timer = setTimeout(tryAutoLocation, 50) // Reduced 1000ms delay to 50ms
        return () => clearTimeout(timer)
    }, [isClient, autoLocationAttempted, authLoading, profile, preferences, handleSearch, handleLocationDetected])

    // Initial cache load
    useEffect(() => {
        if (!isClient || isAutoDetecting) return

        // (Phase 4 cleanup removed a NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE escape
        // hatch that bypassed the autoLocationAttempted gate. Tests that
        // depended on the bypass should seed localStorage AND drive the
        // auto-location flow normally.)
        if (!autoLocationAttempted) return

        // CRITICAL: Don't restore cached location if user/AI has already initiated a search
        // This prevents race conditions where cache restoration overrides intentional location changes
        if (hasSearched) return

        const checkCacheAndLoad = async () => {
            try {
                const cachedLocationData = localStorage.getItem(CACHE_KEY)
                const cachedWeatherData = localStorage.getItem(WEATHER_KEY)
                const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

                if (cachedLocationData && cachedWeatherData && cacheTimestamp) {
                    const cacheAge = Date.now() - parseInt(cacheTimestamp)
                    if (cacheAge < 10 * 60 * 1000) {
                        const weather = JSON.parse(cachedWeatherData)

                        if (weather?.forecast && weather.forecast.length > 0) {
                            // Serve the cached copy immediately for fast first
                            // paint. Coordinates are stripped before caching
                            // (privacy) but radar needs them, so refresh in
                            // the background instead of blocking on a full
                            // refetch (which previously ran on every reload,
                            // defeating the cache entirely).
                            setWeather(weather)
                            setLocationInput(cachedLocationData)
                            setHasSearched(true)

                            const hasCoordinates = weather.coordinates?.lat && weather.coordinates?.lon
                            if (!hasCoordinates) {
                                const loadId = ++latestLoadId.current
                                const unitSystem: 'metric' | 'imperial' = preferences?.temperature_unit === 'celsius' ? 'metric' : 'imperial'
                                fetchWeatherData(cachedLocationData, unitSystem)
                                    .then((freshData) => {
                                        // Keep the stripped copy in storage; only
                                        // the in-memory state gets coordinates.
                                        if (loadId !== latestLoadId.current) return
                                        if (freshData) setWeather(freshData)
                                    })
                                    .catch((e) => {
                                        console.warn('[cache-restore] Failed to refresh coordinates:', e)
                                    })
                            }
                            return
                        }
                    }
                }
            } catch (error) {
                console.warn('Cache check failed:', error)
            }
        }

        checkCacheAndLoad()
    }, [isClient, isAutoDetecting, autoLocationAttempted, hasSearched, preferences, setLocationInput])

    return {
        weather,
        loading,
        error,
        hasSearched,
        remainingSearches,
        handleSearch,
        handleLocationSearch,
        isAutoDetecting,
        autoLocationAttempted
    }
}
