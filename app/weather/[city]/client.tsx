"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 */


import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWeatherData } from '@/lib/weather'
import { useAuth } from '@/lib/auth'
import { WeatherData } from '@/lib/types'
import PageWrapper from '@/components/page-wrapper'
import WeatherSearch from '@/components/weather-search'
import { useTheme } from '@/components/theme-provider'
import { Loader2 } from 'lucide-react'
import { ResponsiveContainer } from '@/components/responsive-container'
import { useLocationContext } from '@/components/location-context'
import { WeatherDisplay } from '@/components/weather-display'

interface CityWeatherClientProps {
  city: {
    name: string
    state: string
    searchTerm: string
    title: string
    description: string
    content: {
      intro: string
      climate: string
      patterns: string
    }
  }
  citySlug: string
  /** Kept for API compatibility with `page.tsx`. No longer used in rendering. */
  isPredefinedCity?: boolean
}

export default function CityWeatherClient({ city, citySlug }: CityWeatherClientProps): JSX.Element {
  const router = useRouter()
  const { theme } = useTheme()
  const { preferences } = useAuth()
  const {
    setLocationInput,
    setCurrentLocation,
    clearLocationState,
    setShouldClearOnRouteChange
  } = useLocationContext()

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [precipitation, setPrecipitation] = useState<{rain24h: number; snow24h: number} | null>(null)
  const weatherRequestRef = useRef(0)
  const weatherLatitude = weather?.coordinates?.lat
  const weatherLongitude = weather?.coordinates?.lon

  // Fetch 24h precipitation data when weather loads
  useEffect(() => {
    if (weatherLatitude == null || weatherLongitude == null) return

    // Clear stale data immediately on city transition
    setPrecipitation(null)

    // AbortController to prevent race conditions when switching cities quickly
    const controller = new AbortController()

    fetch(`/api/weather/precipitation-history?lat=${weatherLatitude}&lon=${weatherLongitude}`, {
      signal: controller.signal
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!controller.signal.aborted) {
          data?.dataAvailable ? setPrecipitation({rain24h: data.rain24h, snow24h: data.snow24h}) : setPrecipitation(null)
        }
      })
      .catch((err) => {
        // Ignore abort errors, only handle real failures
        if (err.name !== 'AbortError') {
          setPrecipitation(null)
        }
      })

    return () => controller.abort()
  }, [weatherLatitude, weatherLongitude])

  // Helper: normalize "San Ramon, CA" -> "san-ramon-ca"
  const toSlug = (input: string) =>
    input
      .trim()
      .toLowerCase()
      .replace(/,/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

  // Load weather data for the specific city
  const loadCityWeather = useCallback(async () => {
    const requestId = weatherRequestRef.current + 1
    weatherRequestRef.current = requestId

    try {
      setLoading(true)
      setError("")

      const unitSystem: 'metric' | 'imperial' = preferences?.temperature_unit === 'celsius' ? 'metric' : 'imperial'
      const weatherData = await fetchWeatherData(city.searchTerm, unitSystem)

      if (requestId !== weatherRequestRef.current) return

      setWeather(weatherData)

      // Update location context with city data
      setLocationInput(city.searchTerm)
      setCurrentLocation(weatherData.location || city.searchTerm)
    } catch (err) {
      if (requestId !== weatherRequestRef.current) return
      console.error('Error loading city weather:', err)
      setError(err instanceof Error ? err.message : 'Failed to load weather data')
    } finally {
      if (requestId === weatherRequestRef.current) {
        setLoading(false)
      }
    }
  }, [city.searchTerm, preferences?.temperature_unit, setCurrentLocation, setLocationInput])

  // CLEAR local state whenever the route/citySlug changes (prevents ghost data)
  useEffect(() => {
    setWeather(null)
    setSelectedDay(null)
    setError("")
    // Clear the location context completely to prevent history from carrying over
    clearLocationState()
    // Then set the current city as the location
    setLocationInput(city.searchTerm)
    setCurrentLocation(city.searchTerm)
  }, [city.searchTerm, citySlug, clearLocationState, setCurrentLocation, setLocationInput])

  // Existing effect: load weather for this page's city (runs after reset above)
  useEffect(() => {
    setShouldClearOnRouteChange(false)

    // Load city-specific weather data first (city pages should show city data, not user location)
    loadCityWeather()

    // Cleanup: enable route change clearing when leaving city pages
    return () => {
      setShouldClearOnRouteChange(true)
    }
  }, [loadCityWeather, setShouldClearOnRouteChange])

  // REPLACE handleSearch to navigate instead of only setting local weather
  const handleSearch = async (locationInput: string) => {
    if (!locationInput?.trim()) return
    const slug = toSlug(locationInput)
    // optional: optimistic UI clear before navigating
    setWeather(null)
    setSelectedDay(null)
    setError("")
    setLocationInput('') // clear search field in context
    router.push(`/weather/${slug}`)
  }

  const handleLocationSearch = async () => {
    // Geolocation functionality - same as main page
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }

    setLoading(true)
    setError("")

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        })
      })

      const { latitude, longitude } = position.coords
      // API key is now handled by internal API routes

      const { fetchWeatherByLocation } = await import('@/lib/weather')
      const unitSystem: 'metric' | 'imperial' = preferences?.temperature_unit === 'celsius' ? 'metric' : 'imperial'
      const weatherData = await fetchWeatherByLocation(`${latitude},${longitude}`, unitSystem)
      setWeather(weatherData)
    } catch (err) {
      console.error("Location error:", err)
      setError(err instanceof Error ? err.message : "Failed to get your location")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper
      weatherLocation={weather?.location}
      weatherTemperature={weather?.temperature}
      weatherUnit={weather?.unit}
    >
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-weather-bg">
        <ResponsiveContainer maxWidth="xl" padding="md">

          {/* Weather Search Component */}
          <WeatherSearch
            key={citySlug}
            onSearch={handleSearch}
            onLocationSearch={handleLocationSearch}
            isLoading={loading}
            error={error}
            rateLimitError=""
            isDisabled={false}
            hideLocationButton={true}
          />

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center mt-8">
              <Loader2 className="h-8 w-8 animate-spin text-weather-primary" />
              <span className="ml-2 text-weather-text">Loading weather data...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-weather-danger text-center mt-4">
              {error}
            </div>
          )}

          {/* Weather Display - Unified with homepage */}
          {weather && !loading && !error && (
            <WeatherDisplay
              weather={weather}
              theme={theme || 'nord'}
              selectedDay={selectedDay}
              onDayClick={(index) => setSelectedDay(selectedDay === index ? null : index)}
              precipitation={precipitation}
              showRadar={true}
            />
          )}

          {/*
            Note: SEO content (H1, climate overview, seasonal breakdown, FAQ,
            nearby cities) is now server-rendered by `page.tsx` so it lands in
            the initial HTML for Googlebot. This client component is purely
            for the interactive weather widget.
          */}
        </ResponsiveContainer>
      </div>
    </PageWrapper>
  )
}
