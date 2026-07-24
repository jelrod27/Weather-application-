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


import type { JSX, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageWrapper from '@/components/page-wrapper'
import WeatherSearch from '@/components/weather-search'
import { useTheme } from '@/components/theme-provider'
import { Loader2 } from 'lucide-react'
import { ResponsiveContainer } from '@/components/responsive-container'
import { useLocationContext } from '@/components/location-context'
import { WeatherDisplay } from '@/components/weather-display'
import SaveLocationButton from '@/components/weather/save-location-button'
import { locationInputToSlug } from '@/lib/city-slug'
import { useHubLocation } from '@/hooks/use-hub-location'
import { useWeatherSession } from '@/hooks/useWeatherSession'
import { usePrecipitationHistory } from '@/hooks/usePrecipitationHistory'
import dynamic from 'next/dynamic'

const HomeHub = dynamic(() => import('@/components/home/home-hub'), {
  ssr: false,
  loading: () => <div className="mt-4 h-16 animate-pulse rounded-md bg-gray-800/30" aria-hidden />,
})

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
  climateGuide?: ReactNode
}

export default function CityWeatherClient({ city, citySlug, climateGuide }: CityWeatherClientProps): JSX.Element {
  const router = useRouter()
  const { theme } = useTheme()
  const { setLocationInput } = useLocationContext()

  const {
    weather,
    loading,
    error,
    handleLocationSearch,
  } = useWeatherSession({ mode: 'city', seed: city.searchTerm })

  const hubLocation = useHubLocation(weather)
  const precipitation = usePrecipitationHistory(
    weather?.coordinates?.lat,
    weather?.coordinates?.lon,
  )
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    setSelectedDay(null)
  }, [citySlug])

  useEffect(() => {
    if (!weather || loading) return
    const anchor = document.getElementById('live-weather')
    if (!anchor) return
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [citySlug, weather?.location, loading])

  function handleSearch(locationInput: string): void {
    if (!locationInput.trim()) return
    setSelectedDay(null)
    setLocationInput('')
    router.push(`/weather/${locationInputToSlug(locationInput)}`)
  }

  return (
    <PageWrapper
      weatherLocation={weather?.location}
      weatherTemperature={weather?.temperature}
      weatherUnit={weather?.unit}
    >
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--card))]">
        <ResponsiveContainer maxWidth="2xl" padding="md">

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

          <HomeHub userLocation={hubLocation} />

          {loading && (
            <div className="flex justify-center items-center mt-8">
              <Loader2 className="h-8 w-8 animate-spin text-weather-primary" />
              <span className="ml-2 text-weather-text">Loading weather data...</span>
            </div>
          )}

          {error && (
            <div className="text-weather-danger text-center mt-4">
              {error}
            </div>
          )}

          {weather && !loading && !error && (
            <div id="live-weather" className="scroll-mt-24">
              <div className="flex justify-end mb-2">
                <SaveLocationButton
                  weather={weather}
                  cityName={city.name}
                  state={city.state}
                />
              </div>
              <WeatherDisplay
                weather={weather}
                theme={theme || 'nord'}
                selectedDay={selectedDay}
                onDayClick={(index) => setSelectedDay(selectedDay === index ? null : index)}
                precipitation={precipitation}
                showRadar={true}
              />
            </div>
          )}

          {climateGuide ? <div className="mt-8">{climateGuide}</div> : null}
        </ResponsiveContainer>
      </div>
    </PageWrapper>
  )
}
