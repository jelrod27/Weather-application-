'use client'

/**
 * Full-viewport RainViewer radar — map-first layout with floating top bar and player dock.
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
import WeatherSearch from '@/components/weather-search'

const RadarShell = dynamicImport(() => import('@/components/radar-v2/radar-shell'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="text-center text-white">
        <div className="mb-2 text-lg font-semibold">Loading radar…</div>
        <div className="text-sm text-zinc-400">Fetching RainViewer frames</div>
      </div>
    </div>
  ),
})

function RadarLoadingShell({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <MapIcon className="h-10 w-10 text-cyan-400" aria-hidden="true" />
        <p className="font-mono text-sm uppercase tracking-widest text-zinc-400">{message}</p>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    </div>
  )
}

function RadarEmptyShell({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-mono hover:bg-white/5"
        >
          <Home className="h-4 w-4" />
          HOME
        </Link>
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Live Radar</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold font-mono text-cyan-300">{title}</h1>
        <p className="max-w-md text-sm text-zinc-400">{body}</p>
        {children}
      </div>
    </div>
  )
}

export default function MapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlLocation = searchParams.get('location')
  const { currentLocation } = useLocationContext()
  const { theme } = useTheme()
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | undefined>()

  const targetLocation = urlLocation || currentLocation

  useEffect(() => {
    const loadWeatherData = async () => {
      setIsLoading(true)

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

      setWeatherData(null)
      setIsLoading(false)
    }

    void loadWeatherData()
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
    return <RadarLoadingShell message="Initializing radar terminal" />
  }

  if (!weatherData) {
    return (
      <RadarEmptyShell
        title="Choose a location"
        body="Search for a city to open full-screen global precipitation radar with severe weather overlays."
      >
        <div className="w-full max-w-xl">
          <WeatherSearch
            onSearch={handleRadarSearch}
            isLoading={isLoading}
            error={searchError}
            hideLocationButton
          />
        </div>
      </RadarEmptyShell>
    )
  }

  const hasValidCoordinates =
    weatherData.coordinates?.lat != null && weatherData.coordinates?.lon != null

  if (!hasValidCoordinates) {
    return (
      <RadarEmptyShell
        title="Coordinates unavailable"
        body={`Could not resolve map coordinates for ${weatherData.location}. Try searching again.`}
      >
        <div className="w-full max-w-xl">
          <WeatherSearch
            onSearch={handleRadarSearch}
            isLoading={isLoading}
            error={searchError}
            hideLocationButton
          />
        </div>
      </RadarEmptyShell>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-black">
      <RadarShell
        latitude={weatherData.coordinates!.lat}
        longitude={weatherData.coordinates!.lon}
        locationName={weatherData.location}
        theme={theme || 'nord'}
        displayMode="full-page"
        onLocationSearch={handleRadarSearch}
        searchError={searchError}
        shareConfig={{
          title: weatherData.location
            ? `Live Weather Radar - ${weatherData.location}`
            : 'Live Weather Radar',
          text: weatherData.location
            ? `Live radar and severe weather overlays for ${weatherData.location}`
            : 'Live global precipitation radar at 16bitweather.co',
          url: shareUrl,
        }}
      />
    </div>
  )
}
