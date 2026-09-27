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
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */


import React, { memo } from "react"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-state"
import { useTheme } from '@/components/theme-provider'
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

const HomeHub = dynamic(() => import('@/components/home/home-hub'), {
  ssr: false,
  loading: () => <div className="mt-4 h-16 animate-pulse rounded-md bg-gray-800/30" aria-hidden />,
})

import { ResponsiveContainer } from "@/components/responsive-container"
import { ErrorBoundary } from "@/components/error-boundary"
import { WeatherSkeleton } from '@/components/weather-skeleton'
import { useWeatherController } from "@/hooks/useWeatherController"
import { usePrecipitationHistory } from "@/hooks/usePrecipitationHistory"
import { locationInputToSlug } from "@/lib/city-slug"
import { useHubLocation } from "@/hooks/use-hub-location"
import { HomeStartIntro } from '@/components/home/home-start-intro'

// Note: UV Index data is now only available in One Call API 3.0 (paid subscription required)
// The main weather API handles UV index estimation for free accounts

// API keys are now handled by internal API routes

function WeatherApp() {
  const { theme } = useTheme()
  const router = useRouter()

  const {
    weather,
    loading,
    error,
    remainingSearches,
    handleLocationSearch,
    isAutoDetecting,
    autoLocationAttempted
  } = useWeatherController()

  const hubLocation = useHubLocation(weather)
  const precipitation = usePrecipitationHistory(
    weather?.coordinates?.lat,
    weather?.coordinates?.lon,
  )

  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)

  // Latch: cities mount once the initial auto-location flow has settled and
  // never unmount again (manual searches must not flicker them; post-input
  // shifts are CLS-exempt anyway). The rAF delays one paint so any lazily
  // loaded WeatherDisplay chunk has time to expand before the cities append.
  const [showCityLinks, setShowCityLinks] = React.useState(false)
  React.useEffect(() => {
    if (autoLocationAttempted && !loading && !isAutoDetecting) {
      const id = requestAnimationFrame(() => setShowCityLinks(true))
      return () => cancelAnimationFrame(id)
    }
  }, [autoLocationAttempted, loading, isAutoDetecting])

  // Manual searches use the same /weather/[city] experience as footer city links.
  const handleSearchWrapper = (locationInput: string) => {
    const trimmed = locationInput.trim()
    if (trimmed.length < 3) return
    router.push(`/weather/${locationInputToSlug(trimmed)}`)
  }

  const focusCitySearch = () => {
    document.querySelector<HTMLInputElement>('[data-testid="location-search-input"]')?.focus()
  }

  return (
    <PageWrapper
      weatherLocation={weather?.location}
      weatherTemperature={weather?.temperature}
      weatherUnit={weather?.unit}
    >
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--card))]">
        <ResponsiveContainer maxWidth="2xl" padding="md">
          {!weather && (
            <HomeStartIntro id="home-get-started">
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleLocationSearch}
                  disabled={loading || isAutoDetecting}
                  className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
                >
                  Use my location
                </button>
                <button
                  type="button"
                  onClick={focusCitySearch}
                  disabled={loading || isAutoDetecting || remainingSearches <= 0}
                  className="rounded-md border border-primary px-5 py-3 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
                >
                  Search for a city
                </button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {remainingSearches <= 0
                  ? 'City search is temporarily unavailable because the search limit was reached.'
                  : loading || isAutoDetecting
                    ? 'Search will be available when the current weather load finishes.'
                    : 'Your browser will ask for location access only if you choose to use it.'}
              </p>
            </HomeStartIntro>
          )}
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

          <HomeHub userLocation={hubLocation} />

          {(loading || isAutoDetecting) && !weather && (
            <div className="mt-8">
              <WeatherSkeleton />
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
              <div id="live-weather" className="scroll-mt-24">
                <WeatherDisplay
                  weather={weather}
                  theme={theme || 'nord'}
                  selectedDay={selectedDay}
                  onDayClick={(index) => setSelectedDay(selectedDay === index ? null : index)}
                  precipitation={precipitation}
                  showRadar={true}
                />
              </div>
            </ErrorBoundary>
          )}

          {/* SEO City Links Section with Random Display — deferred until the weather
              region above has settled, so it appends instead of being shoved (CLS). */}
          {showCityLinks && <RandomCityLinks theme={theme || 'nord'} />}
        </ResponsiveContainer>
      </div>
    </PageWrapper>
  )
}

// PERFORMANCE: Memoize the component to prevent unnecessary re-renders
const MemoizedWeatherApp = memo(WeatherApp)
export default MemoizedWeatherApp
export { WeatherApp }
