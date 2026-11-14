'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WinterPlace } from '@/lib/winter/types'

export function parseWinterPlace(params: URLSearchParams): WinterPlace | null {
  const coordinate = (key: string, limit: number): number | null => {
    const raw = params.get(key)
    if (params.getAll(key).length !== 1 || !raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) return null
    const value = Number(raw)
    return Number.isFinite(value) && Math.abs(value) <= limit ? value : null
  }
  const lat = coordinate('lat', 90)
  const lon = coordinate('lon', 180)
  if (lat === null || lon === null) return null
  const name = params.get('place')?.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 100)
  return { lat, lon, name: name || `${lat.toFixed(3)}, ${lon.toFixed(3)}` }
}

export function useWinterPlace(): { place: WinterPlace | null; selectPlace: (place: WinterPlace | null) => void; invalidLink: boolean; ready: boolean } {
  const [place, setPlace] = useState<WinterPlace | null>(null)
  const [invalidLink, setInvalidLink] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const restore = (): void => {
      const params = new URLSearchParams(window.location.search)
      const next = parseWinterPlace(params)
      setPlace(next)
      setInvalidLink((params.has('lat') || params.has('lon')) && !next)
      setReady(true)
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])
  const selectPlace = useCallback((next: WinterPlace | null) => {
    setPlace(next)
    setInvalidLink(false)
    const url = new URL(window.location.href)
    for (const key of ['lat', 'lon', 'place']) url.searchParams.delete(key)
    if (next) {
      url.searchParams.set('lat', String(next.lat))
      url.searchParams.set('lon', String(next.lon))
      url.searchParams.set('place', next.name)
    }
    window.history.replaceState(null, '', url)
  }, [])
  return { place, selectPlace, invalidLink, ready }
}
