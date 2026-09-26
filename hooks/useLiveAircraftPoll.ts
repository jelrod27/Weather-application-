'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { INITIAL_AIRCRAFT_STATUS, type AircraftFeedStatus } from '@/lib/aviation/aircraft-feed-status'
import type { Aircraft } from '@/lib/aviation/aircraft-types'
import { AIRCRAFT_LABEL_DECLUTTER_COUNT } from '@/lib/aviation/airplane-icon'
import {
  AIRCRAFT_LABEL_LAYER_ID,
  AIRCRAFT_LAYER_ID,
  MOVE_FETCH_DEBOUNCE_MS,
  POLL_MS,
  radiusForZoom,
  toFeatureCollection,
} from '@/lib/aviation/live-map-geojson'

type UseLiveAircraftPollArgs = {
  mapRef: MutableRefObject<MapLibreMap | null>
  mapReady: boolean
  aircraftByIdRef: MutableRefObject<Map<string, Aircraft>>
  selectedRef: MutableRefObject<string | null>
  highlightRef: MutableRefObject<Aircraft | null>
  visibleRef: MutableRefObject<boolean>
  fetchingRef: MutableRefObject<boolean>
  onStatusRef: MutableRefObject<((status: AircraftFeedStatus) => void) | undefined>
  onSelectedUpdateRef: MutableRefObject<((aircraft: Aircraft) => void) | undefined>
  selectedIcao24?: string | null
  highlightIcao24?: string | null
}

export function useLiveAircraftPoll({
  mapRef,
  mapReady,
  aircraftByIdRef,
  selectedRef,
  highlightRef,
  visibleRef,
  fetchingRef,
  onStatusRef,
  onSelectedUpdateRef,
  selectedIcao24,
  highlightIcao24,
}: UseLiveAircraftPollArgs): { status: AircraftFeedStatus; retry: () => Promise<void> } {
  const [status, setStatus] = useState<AircraftFeedStatus>(INITIAL_AIRCRAFT_STATUS)
  const requestRef = useRef<AbortController | null>(null)
  useEffect(() => { onStatusRef.current?.(status) }, [status, onStatusRef])
  const syncSelectionStyle = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.getLayer(AIRCRAFT_LAYER_ID)) return
    const sel = selectedRef.current ?? ''
    map.setLayoutProperty(AIRCRAFT_LAYER_ID, 'icon-size', [
      'interpolate',
      ['linear'],
      ['zoom'],
      4,
      ['case', ['==', ['get', 'icao24'], sel], 0.9, 0.6],
      7,
      ['case', ['==', ['get', 'icao24'], sel], 1.25, 0.9],
      10,
      ['case', ['==', ['get', 'icao24'], sel], 1.45, 1.15],
    ])
  }, [mapRef, selectedRef])

  const syncLabelDeclutter = useCallback((count: number) => {
    const map = mapRef.current
    if (!map || !map.getLayer(AIRCRAFT_LABEL_LAYER_ID)) return
    const sel = selectedRef.current
    if (count > AIRCRAFT_LABEL_DECLUTTER_COUNT) {
      map.setFilter(
        AIRCRAFT_LABEL_LAYER_ID,
        sel ? ['==', ['get', 'icao24'], sel] : ['==', ['get', 'icao24'], ''],
      )
    } else {
      map.setFilter(AIRCRAFT_LABEL_LAYER_ID, ['!=', ['get', 'callsign'], ''])
    }
  }, [mapRef, selectedRef])

  const applyAircraft = useCallback(
    (list: Aircraft[], includeHighlight = true) => {
      const map = mapRef.current
      if (!map) return
      const byId = new Map<string, Aircraft>()
      for (const a of list) byId.set(a.icao24, a)
      const highlight = highlightRef.current
      if (highlight && includeHighlight && !byId.has(highlight.icao24)) byId.set(highlight.icao24, highlight)
      aircraftByIdRef.current = byId
      const source = map.getSource('aircraft') as GeoJSONSource | undefined
      source?.setData(toFeatureCollection([...byId.values()]))
      syncSelectionStyle()
      syncLabelDeclutter(byId.size)

      const selectedId = selectedRef.current
      if (selectedId && onSelectedUpdateRef.current) {
        const updated = byId.get(selectedId)
        if (updated) onSelectedUpdateRef.current(updated)
      }
    },
    [
      aircraftByIdRef,
      highlightRef,
      mapRef,
      onSelectedUpdateRef,
      selectedRef,
      syncLabelDeclutter,
      syncSelectionStyle,
    ],
  )

  const fetchAircraft = useCallback(async () => {
    const map = mapRef.current
    if (!mapReady || !map || !visibleRef.current || fetchingRef.current) return
    fetchingRef.current = true
    const controller = new AbortController()
    requestRef.current = controller
    setStatus((previous) => ({ ...previous, state: 'loading', count: null }))
    const center = map.getCenter()
    const radius = radiusForZoom(map.getZoom())
    try {
      const params = new URLSearchParams({
        lat: String(center.lat),
        lon: String(center.lng),
        radius: String(radius),
      })
      const res = await fetchWithTimeout(`/api/aviation/aircraft?${params}`, { signal: controller.signal, timeoutMs: 15000, maxRetries: 0 })
      const data = (await res.json()) as {
        aircraft?: Aircraft[]
        source?: string
        degraded?: boolean
        fetchedAt?: number
        error?: string
      }
      if (controller.signal.aborted) return
      if (!res.ok || !Array.isArray(data.aircraft)) throw new Error('Aircraft feed unavailable')
      applyAircraft(data.aircraft)
      setStatus({
        state: 'ready', count: data.aircraft.length,
        source: data.source ?? null, degraded: Boolean(data.degraded),
        updatedAt: typeof data.fetchedAt === 'number' && Number.isFinite(data.fetchedAt) ? data.fetchedAt : null,
      })
    } catch (err) {
      if (controller.signal.aborted) return
      console.error('[LiveAircraftMap]', err)
      applyAircraft([], false)
      setStatus((previous) => ({ ...previous, state: 'unavailable', count: null }))
    } finally {
      if (requestRef.current === controller) fetchingRef.current = false
    }
  }, [applyAircraft, fetchingRef, mapRef, mapReady, visibleRef])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return

    void fetchAircraft()
    const pollId = window.setInterval(() => {
      void fetchAircraft()
    }, POLL_MS)

    let moveTimer: number | null = null
    const onMoveStart = () => {
      requestRef.current?.abort()
      fetchingRef.current = false
      applyAircraft([], false)
      setStatus((previous) => ({ ...previous, state: 'loading', count: null }))
    }
    const onMoveEnd = () => {
      if (moveTimer != null) window.clearTimeout(moveTimer)
      moveTimer = window.setTimeout(() => {
        void fetchAircraft()
      }, MOVE_FETCH_DEBOUNCE_MS)
    }
    map.on('movestart', onMoveStart)
    map.on('moveend', onMoveEnd)

    return () => {
      window.clearInterval(pollId)
      if (moveTimer != null) window.clearTimeout(moveTimer)
      map.off('movestart', onMoveStart)
      map.off('moveend', onMoveEnd)
      requestRef.current?.abort()
      fetchingRef.current = false
    }
  }, [applyAircraft, fetchAircraft, fetchingRef, mapReady, mapRef])

  useEffect(() => {
    const onVis = () => {
      visibleRef.current = document.visibilityState === 'visible'
      if (visibleRef.current) void fetchAircraft()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [fetchAircraft, visibleRef])

  useEffect(() => {
    syncSelectionStyle()
    syncLabelDeclutter(aircraftByIdRef.current.size)
  }, [aircraftByIdRef, selectedIcao24, syncLabelDeclutter, syncSelectionStyle])

  useEffect(() => {
    if (!mapReady || status.state === 'unavailable') return
    applyAircraft([...aircraftByIdRef.current.values()])
  }, [aircraftByIdRef, applyAircraft, highlightIcao24, mapReady, status.state])

  return { status, retry: fetchAircraft }
}
