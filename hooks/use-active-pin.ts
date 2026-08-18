'use client'

import { useEffect, useState } from 'react'
import { useLocationContext } from '@/components/location-context'
import { useRemoteData } from '@/hooks/useRemoteData'
import { PIN_CHANGE_EVENT, readPersistedPinLabel } from '@/lib/warnings/persist-pin'

export type ActivePin = {
  lat: number
  lon: number
  label: string
}

export type ActivePinState = {
  pin: ActivePin | null
  label: string
  isResolving: boolean
}

type Coords = { lat: number; lon: number }

const GEOCODE_CACHE_TTL_MS = 60 * 60 * 1000

/**
 * Resolve the current pin from LocationContext or the last displayed city,
 * then geocode the label. Weather cache strips coordinates, so this always
 * goes through geocoding unless the caller already has a lat/lon.
 */
export function useActivePinState(): ActivePinState {
  const { currentLocation, locationInput } = useLocationContext()
  const [storedLabel, setStoredLabel] = useState<string | null>(null)

  useEffect(() => {
    const read = () => setStoredLabel(readPersistedPinLabel())
    read()
    window.addEventListener(PIN_CHANGE_EVENT, read)
    return () => window.removeEventListener(PIN_CHANGE_EVENT, read)
  }, [currentLocation, locationInput])

  const label = (currentLocation || locationInput || storedLabel || '').trim()

  const { data: geocoded, isLoading } = useRemoteData<Coords | null>({
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

  if (!label) {
    return { pin: null, label: '', isResolving: false }
  }
  if (!geocoded) {
    return { pin: null, label, isResolving: isLoading }
  }
  return { pin: { lat: geocoded.lat, lon: geocoded.lon, label }, label, isResolving: false }
}

export function useActivePin(): ActivePin | null {
  return useActivePinState().pin
}
