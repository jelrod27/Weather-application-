'use client'

/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { Home, Map as MapIcon } from 'lucide-react'
import { useLocationContext } from '@/components/location-context'
import type { WeatherData } from '@/lib/types'
import { useTheme } from '@/components/theme-provider'
import { fetchWeatherData } from '@/lib/weather'
import Navigation from '@/components/navigation'
import { ShareButtons } from '@/components/share-buttons'
import WeatherSearch from '@/components/weather-search'

const WeatherMap = dynamicImport(() => import('@/components/weather-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-gray-900">
      <div className="text-white text-center">
        <div className="mb-2">Loading Weather Map...</div>
        <div className="text-sm text-gray-400">Initializing map components</div>
      </div>
    </div>
  )
})

export default function MapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlLocation = searchParams.get('location')
  const { currentLocation } = useLocationContext()
  const { theme } = useTheme()
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | undefined>()

  // Priority: URL location > context location
  const targetLocation = urlLocation || currentLocation

  useEffect(() => {
    const loadWeatherData = async () => {
      setIsLoading(true)

      // If we have a target location (from URL or context), fetch weather data
      if (targetLocation) {
        try {
          const freshData = await fetchWeatherData(targetLocation, 'imperial')
          if (freshData?.coordinates?.lat != null && freshData?.coordinates?.lon != null) {
            setWeatherData(freshData)
            setIsLoading(false)
            return
          }
        } catch (fetchError) {
          console.warn('[MapPage] Failed to fetch weather data:', fetchError)
        }
      }

      setIsLoading(false)
    }

    loadWeatherData()
  }, [targetLocation, urlLocation])

  const shareUrl = useMemo(() => {
    if (!weatherData) return 'https://www.16bitweather.co/radar'

    const params = new URLSearchParams(searchParams.toString())
    params.set('location', weatherData.location)
    if (weatherData.coordinates) {
      params.set('lat', String(weatherData.coordinates.lat))
      params.set('lon', String(weatherData.coordinates.lon))
    }
    return `https://www.16bitweather.co/radar?${params.toString()}`
  }, [weatherData, searchParams])

  const handleRadarSearch = (location: string) => {
    const trimmed = location.trim()
    if (!trimmed) {
      setSearchError('Enter a location to load radar.')
      return
    }
    setSearchError(undefined)
    router.push(`/radar?location=${encodeURIComponent(trimmed)}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Navigation />
        <div className="p-3 bg-gray-900 border-b border-gray-700 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 border-2 border-gray-600 hover:bg-gray-700 transition-colors rounded" aria-label="Return to Home">
            <Home className="w-3 h-3" />
            HOME
          </Link>
          <div className="text-gray-500 text-xs font-mono">
            <MapIcon className="w-3 h-3 inline mr-1" />
            RADAR MAP
          </div>
        </div>
        <div className="h-full flex items-center justify-center bg-gray-900">
          <div className="text-white text-center">
            <div className="mb-2">Loading Weather Data...</div>
            <div className="text-sm text-gray-400">Retrieving location information</div>
          </div>
        </div>
      </div>
    )
  }

  // Check if we have valid coordinates for the radar
  const hasValidCoordinates = weatherData?.coordinates?.lat != null &&
    weatherData?.coordinates?.lon != null

  if (!weatherData) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Navigation />
        <div className="p-3 bg-gray-900 border-b border-gray-700 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 border-2 border-gray-600 hover:bg-gray-700 transition-colors rounded" aria-label="Return to Home">
            <Home className="w-3 h-3" />
            HOME
          </Link>
          <div className="text-gray-500 text-xs font-mono">
            <MapIcon className="w-3 h-3 inline mr-1" />
            RADAR MAP
          </div>
        </div>
        <div className="h-full flex items-center justify-center bg-gray-900">
          <div className="text-white text-center max-w-md px-4">
            <div className="text-xl mb-4 font-mono">NO LOCATION DATA</div>
            <div className="text-sm text-gray-400 mb-6">
              Search for a location to view North America radar and severe weather overlays.
            </div>
            <WeatherSearch
              onSearch={handleRadarSearch}
              isLoading={isLoading}
              error={searchError}
              hideLocationButton
            />
          </div>
        </div>
      </div>
    )
  }

  // Show message if we have weather data but missing coordinates
  if (!hasValidCoordinates) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Navigation />
        <div className="p-3 bg-gray-900 border-b border-gray-700 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 border-2 border-gray-600 hover:bg-gray-700 transition-colors rounded" aria-label="Return to Home">
            <Home className="w-3 h-3" />
            HOME
          </Link>
          <div className="text-gray-500 text-xs font-mono">
            <MapIcon className="w-3 h-3 inline mr-1" />
            RADAR MAP
          </div>
          {weatherData.location && (
            <div className="text-yellow-400 text-xs font-mono">
              {weatherData.location}
            </div>
          )}
        </div>
        <div className="h-full flex items-center justify-center bg-gray-900">
          <div className="text-white text-center max-w-md px-4">
            <div className="text-xl mb-4 font-mono text-yellow-400">COORDINATES UNAVAILABLE</div>
            <div className="text-sm text-gray-400 mb-4">
              Unable to load radar data for <span className="text-cyan-400">{weatherData.location}</span>.
            </div>
            <div className="text-sm text-gray-500 mb-6">
              Location coordinates are required for radar display. Please search for the location again.
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-mono px-4 py-2 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors rounded"
            >
              <Home className="w-4 h-4" />
              Search Location
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <Navigation />

      {/* Breadcrumb Header */}
      <div className="shrink-0 p-3 bg-gray-900 border-b border-gray-700 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 border-2 border-gray-600 hover:bg-gray-700 transition-colors rounded" aria-label="Return to Home">
            <Home className="w-3 h-3" />
            HOME
          </Link>
          <div className="text-white text-xs font-mono">
            <MapIcon className="w-3 h-3 inline mr-1" />
            RADAR MAP
          </div>
          {weatherData.location && (
            <div className="text-cyan-400 text-xs font-mono font-bold">
              → {weatherData.location}
            </div>
          )}
        </div>

        <div className="w-full max-w-xl lg:flex-1">
          <WeatherSearch
            onSearch={handleRadarSearch}
            isLoading={isLoading}
            error={searchError}
            hideLocationButton
          />
        </div>

        {/* Share Buttons */}
        <ShareButtons
          config={{
            title: weatherData.location ? `Live Weather Radar - ${weatherData.location}` : 'Live Weather Radar',
            text: weatherData.location
              ? `Live radar and severe weather overlays for ${weatherData.location}`
              : 'Live North America radar and severe weather overlays at 16bitweather.co',
            url: shareUrl,
          }}
          className="justify-end"
        />
      </div>

      {/* Map Container - flex-1 + min-h-0 fills remaining viewport below nav/header */}
      <div className="min-h-0 flex-1 overflow-visible">
        <WeatherMap
          latitude={weatherData.coordinates!.lat}
          longitude={weatherData.coordinates!.lon}
          locationName={weatherData.location}
          theme={theme || 'nord'}
          displayMode="full-page"
        />
      </div>
    </div>
  )
}

