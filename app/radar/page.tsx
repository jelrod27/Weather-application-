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

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { Home, Map as MapIcon, Share2 } from 'lucide-react'
import { useLocationContext } from '@/components/location-context'
import { userCacheService } from '@/lib/user-cache-service'
import type { WeatherData } from '@/lib/types'
import { useTheme } from '@/components/theme-provider'
import { fetchWeatherData } from '@/lib/weather'
import Navigation from '@/components/navigation'
import { ShareButtons } from '@/components/share-buttons';

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
  const searchParams = useSearchParams()
  const urlLocation = searchParams.get('location')
  const { currentLocation } = useLocationContext()
  const { theme } = useTheme()
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [shareSuccess, setShareSuccess] = useState(false)

  // Priority: URL location > context location
  const targetLocation = urlLocation || currentLocation

  useEffect(() => {
    const loadWeatherData = async () => {
      setIsLoading(true)

      // If we have a target location (from URL or context), fetch weather data
      if (targetLocation) {
        try {
          const freshData = await fetchWeatherData(targetLocation, 'imperial')
          if (freshData?.coordinates?.lat && freshData?.coordinates?.lon) {
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

  // Share location handler
  const handleShare = async () => {
    if (!weatherData) return

    // Coordinates may be intentionally omitted from cached weather data (privacy / CodeQL).
    // Only include them in the share URL if present.
    const shareUrl = weatherData.coordinates
      ? `${window.location.origin}/map?lat=${weatherData.coordinates.lat}&lon=${weatherData.coordinates.lon}`
      : `${window.location.origin}/map`

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Weather Radar - ${weatherData.location}`,
          text: `Check out the weather radar for ${weatherData.location}`,
          url: shareUrl
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      }
    } catch (error) {
      console.error('Share failed:', error)
    }
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
  const hasValidCoordinates = weatherData?.coordinates?.lat &&
    weatherData?.coordinates?.lon &&
    weatherData.coordinates.lat !== 0 &&
    weatherData.coordinates.lon !== 0

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
              Search for a location on the home page first to view its weather map.
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-mono px-4 py-2 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors rounded"
            >
              <Home className="w-4 h-4" />
              Return to Home & Search
            </Link>
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
    <div className="min-h-screen w-full flex flex-col">
      <Navigation />

      {/* Breadcrumb Header */}
      <div className="p-3 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
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

        {/* Share Buttons */}
        <ShareButtons
          config={{
            title: 'Live Weather Radar',
            text: 'Live NOAA MRMS weather radar at 16bitweather.co',
            url: 'https://www.16bitweather.co/radar',
          }}
        />
      </div>

      {/* Map Container - explicit height for full-screen map page */}
      {/* Note: Using explicit h-[calc(...)] class instead of flex-1 + inline style to ensure height propagates correctly */}
      <div className="h-[calc(100vh-120px)] min-h-[400px] overflow-visible">
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

