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

// Note: UV Index data is now only available in One Call API 3.0 (paid subscription required)
// The main weather API handles UV index estimation for free accounts

// API keys are now handled by internal API routes

interface WeatherAppProps {
  children?: React.ReactNode
}

function WeatherApp({ children }: WeatherAppProps): React.ReactElement {
  const { theme } = useTheme()
  const router = useRouter()

  const {
    weather,
    loading,
    error,
    remainingSearches,
    handleLocationSearch,
    cancelLocationDetection,
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
    if (weather && autoLocationAttempted && !loading && !isAutoDetecting) {
      const id = requestAnimationFrame(() => setShowCityLinks(true))
      return () => cancelAnimationFrame(id)
    }
  }, [weather, autoLocationAttempted, loading, isAutoDetecting])

  // Manual searches use the same /weather/[city] experience as footer city links.
  const handleSearchWrapper = (locationInput: string) => {
    const trimmed = locationInput.trim()
    if (trimmed.length < 3) return
    cancelLocationDetection()
    router.push(`/weather/${locationInputToSlug(trimmed)}`)
  }

  return (
    <>
    <PageWrapper
      weatherLocation={weather?.location}
      weatherTemperature={weather?.temperature}
      weatherUnit={weather?.unit}
      showFooter={Boolean(weather)}
    >
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--card))]">
        <ResponsiveContainer maxWidth="2xl" padding="md">
          <ErrorBoundary componentName="Weather Search">
            <WeatherSearch
              onSearch={handleSearchWrapper}
              onLocationSearch={handleLocationSearch}
              isLoading={loading && !isAutoDetecting}
              isAutoDetecting={isAutoDetecting}
              compactLocationPrompt={!weather}
              error={error}
              rateLimitError=""
              isDisabled={remainingSearches <= 0}
              hideLocationButton={true}
            />
          </ErrorBoundary>

          {weather && <HomeHub userLocation={hubLocation} />}

          {loading && !isAutoDetecting && !weather && (
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
          {weather && showCityLinks && <RandomCityLinks theme={theme || 'nord'} />}
        </ResponsiveContainer>
      </div>
    </PageWrapper>
    <div hidden={!weather} data-testid="home-discovery">{children}</div>
    </>
  )
}

// PERFORMANCE: Memoize the component to prevent unnecessary re-renders
const MemoizedWeatherApp = memo(WeatherApp)
export default MemoizedWeatherApp
export { WeatherApp }
