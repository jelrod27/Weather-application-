"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */


import React, { memo } from "react"
import { LoadingSpinner } from "@/components/ui/loading-state"
import { useTheme } from '@/components/theme-provider'
import { type ThemeType } from '@/lib/theme-utils'
import PageWrapper from "@/components/page-wrapper"
import WeatherSearch from "@/components/weather-search"
import dynamic from 'next/dynamic'

// PERFORMANCE: Lazy load below-the-fold and conditional components
const RandomCityLinks = dynamic(() => import('@/components/random-city-links'), {
  ssr: false,
  loading: () => <div className="mt-16 pt-8 h-48 animate-pulse bg-gray-800/30 rounded-lg" />
})

// PERFORMANCE: WeatherDisplay only shown when weather data exists
const WeatherDisplay = dynamic(() => import('@/components/weather-display').then(mod => ({ default: mod.WeatherDisplay })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-800/30 rounded-lg h-96" />
})

import { ResponsiveContainer } from "@/components/responsive-container"
import { ErrorBoundary } from "@/components/error-boundary"
import { WeatherSkeleton } from '@/components/weather-skeleton'
import { useWeatherController } from "@/hooks/useWeatherController"

// Note: UV Index data is now only available in One Call API 3.0 (paid subscription required)
// The main weather API handles UV index estimation for free accounts

// API keys are now handled by internal API routes

function WeatherApp() {
  const { theme } = useTheme()

  // Use the new controller hook
  const {
    weather,
    loading,
    error,
    remainingSearches,
    handleSearch,
    handleLocationSearch,
    isAutoDetecting
  } = useWeatherController()

  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [precipitation, setPrecipitation] = React.useState<{rain24h: number; snow24h: number} | null>(null)

  // Fetch 24h precipitation data when weather loads
  React.useEffect(() => {
    if (!weather?.coordinates) return

    // Clear stale data immediately on city transition
    setPrecipitation(null)

    // AbortController to prevent race conditions when switching cities quickly
    const controller = new AbortController()

    fetch(`/api/weather/precipitation-history?lat=${weather.coordinates.lat}&lon=${weather.coordinates.lon}`, {
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
  }, [weather?.coordinates?.lat, weather?.coordinates?.lon])

  const handleSearchWrapper = (locationInput: string) => {
    handleSearch(locationInput)
  }

  return (
    <PageWrapper
      weatherLocation={weather?.location}
      weatherTemperature={weather?.temperature}
      weatherUnit={weather?.unit}
    >
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--card))]">
        <ResponsiveContainer maxWidth="2xl" padding="md">
          <ErrorBoundary componentName="Weather Search">
            <WeatherSearch
              onSearch={handleSearchWrapper}
              onLocationSearch={handleLocationSearch}
              isLoading={loading || isAutoDetecting}
              error={error}
              rateLimitError=""
              isDisabled={remainingSearches <= 0}
              hideLocationButton={true}
            />
          </ErrorBoundary>


          {/* Welcome Message — START is a clickable affordance that triggers geolocation. */}
          {!weather && !loading && !error && (
            <div className="text-center mt-8 mb-8 px-2 sm:px-0">
              <div className="w-full max-w-xl mx-auto">
                <div className="p-2 sm:p-3 border-0 shadow-lg bg-weather-bg-elev border-weather-primary shadow-weather-primary/20">
                  <p className="text-sm font-bold uppercase tracking-wider text-white" style={{
                    fontSize: "clamp(10px, 2.4vw, 14px)"
                  }}>
                    ══ PRESS{' '}
                    <button
                      type="button"
                      onClick={handleLocationSearch}
                      disabled={isAutoDetecting || loading}
                      aria-label="Use my location to load weather"
                      className="inline align-baseline font-bold uppercase tracking-wider text-weather-primary underline-offset-4 underline decoration-weather-primary/70 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-weather-primary focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer animate-pulse hover:animate-none"
                    >
                      START
                    </button>
                    {' '}TO INITIALIZE WEATHER DATA ══
                  </p>
                </div>
              </div>
            </div>
          )}

          {(loading || isAutoDetecting) && !weather && (
            <div className="mt-8">
              <WeatherSkeleton theme={theme as ThemeType} />
            </div>
          )}

          {(loading || isAutoDetecting) && weather && (
            <div className="flex justify-center items-center mt-4">
              <LoadingSpinner size="md" label="Updating weather data" className="text-weather-primary" />
              <span className="ml-2 text-weather-text">
                Updating weather data...
              </span>
            </div>
          )}

          {error && (
            <div className="max-w-2xl mx-auto mt-4 px-2">
              <div data-testid="global-error">
                <div role="alert" className="relative w-full rounded-lg border border-red-500/50 p-4 text-red-500">
                  <div className="mb-1 font-medium leading-none tracking-tight">Error</div>
                  <div className="text-sm">{error}</div>
                </div>
              </div>
            </div>
          )}

          {weather && !loading && !error && (
            <ErrorBoundary componentName="Weather Display">
              <WeatherDisplay
                weather={weather}
                theme={theme || 'nord'}
                selectedDay={selectedDay}
                onDayClick={(index) => setSelectedDay(selectedDay === index ? null : index)}
                precipitation={precipitation}
                showRadar={true}
              />
            </ErrorBoundary>
          )}

          {/* SEO City Links Section with Random Display */}
          <RandomCityLinks theme={theme || 'nord'} />
        </ResponsiveContainer>
      </div>
    </PageWrapper>
  )
}

// PERFORMANCE: Memoize the component to prevent unnecessary re-renders
const MemoizedWeatherApp = memo(WeatherApp)
export default MemoizedWeatherApp
export { WeatherApp }