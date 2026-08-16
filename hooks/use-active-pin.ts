'use client'

import { useEffect, useState } from 'react'
import { useLocationContext } from '@/components/location-context'
import { useRemoteData } from '@/hooks/useRemoteData'
import { LAST_LOCATION_KEY } from '@/lib/weather-session-cache'
import { safeStorage } from '@/lib/safe-storage'

export type ActivePin = {
  lat: number
  lon: number
  label: string
}

type Coords = { lat: number; lon: number }

const GEOCODE_CACHE_TTL_MS = 60 * 60 * 1000

/**
 * Resolve the current pin from LocationContext or the last displayed city,
 * then geocode the label. Weather cache strips coordinates, so this always
 * goes through geocoding unless the caller already has a lat/lon.
 */
export function useActivePin(): ActivePin | null {
  const { currentLocation, locationInput } = useLocationContext()
  const [storedLabel, setStoredLabel] = useState<string | null>(null)

  useEffect(() => {
    setStoredLabel(safeStorage.getItem(LAST_LOCATION_KEY))
  }, [currentLocation, locationInput])

  const label = (currentLocation || locationInput || storedLabel || '').trim()

  const { data: geocoded } = useRemoteData<Coords | null>({
    key: label ? `geocode:${label.toLowerCase()}` : null,
    cacheTtlMs: GEOCODE_CACHE_TTL_MS,
    fetcher: async (signal) => {
      const res = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(label)}&limit=1`, {
        signal,
      })
      if (!res.ok) throw new Error(`geocoding failed: ${res.status}`)
      const body = (await res.json()) as
        | Array<{ lat?: number; lon?: number; name?: string }>
        | { lat?: number; lon?: number }
      const first = Array.isArray(body) ? body[0] : body
      if (first?.lat == null || first?.lon == null) return null
      return { lat: first.lat, lon: first.lon }
    },
  })

  if (!label || !geocoded) return null
  return { lat: geocoded.lat, lon: geocoded.lon, label }
}
