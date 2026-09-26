'use client'

/**
 * Full-viewport RainViewer radar — map-first layout with floating top bar and player dock.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Map as MapIcon } from 'lucide-react'
import { useLocationContext } from '@/components/location-context'
import type { WeatherData } from '@/lib/types'
import { parseRadarCoordinateTarget } from '@/lib/radar/radar-location-target'
import { useTheme } from '@/components/theme-provider'
import { fetchWeatherData } from '@/lib/weather'
import WeatherSearch from '@/components/weather-search'
import { getWeatherJourneyLinks, getWeatherLessonHref, getWeatherReturnHref } from '@/lib/weather/journey'
import { useRadarWarning } from '@/hooks/useRadarWarning'
import { getOfficialWarningHref, nwsGeometryBBox, radarWarningReturnHref } from '@/lib/warnings/alert-links'

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

function RadarOverlayShell({
  message,
  title,
  body,
  children,
  returnHref = '/',
  returnLabel = 'Back to forecast',
}: {
  returnHref?: string
  returnLabel?: string
  message?: string
  title?: string
  body?: string
  children?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex min-h-dvh flex-col bg-black text-white">
      {title ? (
        <>
          <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Link
              href={returnHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-mono hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
              {returnLabel}
            </Link>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Weather Radar</span>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <h2 className="text-xl font-bold font-mono text-cyan-300">{title}</h2>
            {body ? <p className="max-w-md text-sm text-zinc-400">{body}</p> : null}
            {children}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <MapIcon className="h-10 w-10 text-cyan-400" aria-hidden="true" />
          <p className="font-mono text-sm uppercase tracking-widest text-zinc-400">{message}</p>
          <Link href={returnHref} className="min-h-11 inline-flex items-center text-sm underline">{returnLabel}</Link>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      )}
    </div>
  )
}

export default function RadarClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlLocation = searchParams.get('location')
  const warningId = searchParams.get('warning')
  const warningState = useRadarWarning(warningId)
  const warning = warningState.warning
  const { currentLocation } = useLocationContext()
  const { theme } = useTheme()
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | undefined>()

  const coordinateTarget = useMemo(
    () => {
      if (urlLocation) return null
      const target = parseRadarCoordinateTarget(searchParams)
      return target ? { ...target, label: searchParams.get('label')?.trim().slice(0, 120) || target.label } : null
    },
    [searchParams, urlLocation],
  )
  const targetLocation = coordinateTarget || warningId ? null : urlLocation || currentLocation

  useEffect(() => {
    let cancelled = false

    if (coordinateTarget) {
      setWeatherData(null)
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    const loadWeatherData = async () => {
      setIsLoading(true)

      if (targetLocation) {
        try {
          const freshData = await fetchWeatherData(targetLocation, 'imperial')
          if (
            !cancelled &&
            freshData?.coordinates?.lat != null &&
            freshData?.coordinates?.lon != null
          ) {
            setWeatherData(freshData)
            setIsLoading(false)
            return
          }
        } catch (fetchError) {
          console.warn('[RadarClient] Failed to fetch weather data:', fetchError)
        }
      }

      if (!cancelled) {
        setWeatherData(null)
        setIsLoading(false)
      }
    }

    void loadWeatherData()

    return () => {
      cancelled = true
    }
  }, [coordinateTarget, targetLocation])

  const activeTarget = useMemo(() => {
    const bounds = nwsGeometryBBox(warning?.geometry)
    if (warning && bounds) return {
      latitude: (bounds.minLat + bounds.maxLat) / 2,
      longitude: (bounds.minLon + bounds.maxLon) / 2,
      label: `${warning.event} — ${warning.areaDesc}`,
    }
    if (weatherData?.coordinates) {
      return {
        latitude: weatherData.coordinates.lat,
        longitude: weatherData.coordinates.lon,
        label: weatherData.location,
      }
    }

    return coordinateTarget
  }, [coordinateTarget, weatherData, warning])

  const forecastReturn = getWeatherJourneyLinks({
    location: activeTarget?.label || targetLocation || 'Weather',
    coordinates: activeTarget ? { lat: activeTarget.latitude, lon: activeTarget.longitude } : undefined,
  }).forecast
  const returnHref = warningId ? radarWarningReturnHref(warningId, searchParams.get('returnTo'))
    : getWeatherReturnHref(searchParams.get('returnTo')) || (activeTarget || targetLocation ? forecastReturn : '/')
  const returnLabel = warningId ? 'Back to warning' : returnHref.startsWith('/hourly') ? 'Back to hourly' : 'Back to forecast'
  const learnHref = getWeatherLessonHref('radar', `/radar?${searchParams}`)

  const shareUrl = useMemo(() => {
    if (!activeTarget) return 'https://www.16bitweather.co/radar'

    const params = new URLSearchParams(searchParams.toString())
    if (weatherData) {
      params.set('location', weatherData.location)
    } else {
      params.delete('location')
    }
    params.set('lat', String(activeTarget.latitude))
    params.set('lon', String(activeTarget.longitude))
    return `https://www.16bitweather.co/radar?${params.toString()}`
  }, [activeTarget, weatherData, searchParams])

  const handleRadarSearch = (location: string) => {
    const trimmed = location.trim()
    if (!trimmed) {
      setSearchError('Enter a location to load radar.')
      return
    }
    setSearchError(undefined)
    router.push(getWeatherJourneyLinks({ location: trimmed }).radar)
  }

  if (warningId && warningState.loading) {
    return <RadarOverlayShell message="Loading selected warning" returnHref={returnHref} returnLabel={returnLabel} />
  }

  if (warningId && warningState.error) {
    return <RadarOverlayShell title="Warning map unavailable" body={warningState.error} returnHref={returnHref} returnLabel={returnLabel}>
      <Link href={returnHref!} className="underline">Back to warning</Link>
      <a href={getOfficialWarningHref(warningId)} className="underline" target="_blank" rel="noreferrer">Official NWS alert</a>
      <button className="underline" onClick={warningState.retry}>Retry warning map</button>
    </RadarOverlayShell>
  }

  if (isLoading) {
    return <RadarOverlayShell message="Loading radar" returnHref={returnHref} returnLabel={returnLabel} />
  }

  if (!activeTarget) {
    return (
      <RadarOverlayShell
        returnHref={returnHref}
        returnLabel={returnLabel}
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
      </RadarOverlayShell>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-black">
      <RadarShell
        selectedWarning={warning}
        returnHref={returnHref}
        returnLabel={returnLabel}
        learnHref={learnHref}
        latitude={activeTarget.latitude}
        longitude={activeTarget.longitude}
        locationName={activeTarget.label}
        timeZone={weatherData?.timezone || searchParams.get('tz') || undefined}
        theme={theme || 'nord'}
        displayMode="full-page"
        onLocationSearch={handleRadarSearch}
        searchError={searchError}
        shareConfig={{
          title: activeTarget.label
            ? `Weather Radar - ${activeTarget.label}`
            : 'Weather Radar',
          text: activeTarget.label
            ? `Latest radar and severe weather overlays for ${activeTarget.label}`
            : 'Latest global precipitation radar at 16bitweather.co',
          url: shareUrl,
        }}
      />
    </div>
  )
}
