'use client'

import { useCallback, useEffect, type MutableRefObject } from 'react'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
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
  onCountRef: MutableRefObject<
    | ((count: number, meta: { source: string; degraded: boolean }) => void)
    | undefined
  >
  onDegradedRef: MutableRefObject<
    ((degraded: boolean, source: string | null) => void) | undefined
  >
  onSelectedUpdateRef: MutableRefObject<((aircraft: Aircraft) => void) | undefined>
  selectedIcao24?: string | null
  highlightIcao24?: string | null
  setError: (message: string | null) => void
}

export function useLiveAircraftPoll({
  mapRef,
  mapReady,
  aircraftByIdRef,
  selectedRef,
  highlightRef,
  visibleRef,
  fetchingRef,
  onCountRef,
  onDegradedRef,
  onSelectedUpdateRef,
  selectedIcao24,
  highlightIcao24,
  setError,
}: UseLiveAircraftPollArgs) {
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
    (list: Aircraft[]) => {
      const map = mapRef.current
      if (!map) return
      const byId = new Map<string, Aircraft>()
      for (const a of list) byId.set(a.icao24, a)
      const highlight = highlightRef.current
      if (highlight) byId.set(highlight.icao24, highlight)
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
    if (!map || !visibleRef.current || fetchingRef.current) return
    fetchingRef.current = true
    const center = map.getCenter()
    const radius = radiusForZoom(map.getZoom())
    try {
      const params = new URLSearchParams({
        lat: String(center.lat),
        lon: String(center.lng),
        radius: String(radius),
      })
      const res = await fetch(`/api/aviation/aircraft?${params}`)
      const data = (await res.json()) as {
        aircraft?: Aircraft[]
        source?: string
        degraded?: boolean
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Live aircraft feed unavailable')
        onDegradedRef.current?.(true, data.source ?? null)
        return
      }
      setError(null)
      const list = data.aircraft ?? []
      applyAircraft(list)
      onCountRef.current?.(list.length, {
        source: data.source ?? 'adsb.lol',
        degraded: Boolean(data.degraded),
      })
      onDegradedRef.current?.(Boolean(data.degraded), data.source ?? null)
    } catch (err) {
      console.error('[LiveAircraftMap]', err)
      setError('Live aircraft feed unavailable')
      onDegradedRef.current?.(true, null)
    } finally {
      fetchingRef.current = false
    }
  }, [applyAircraft, fetchingRef, mapRef, onCountRef, onDegradedRef, setError, visibleRef])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return

    void fetchAircraft()
    const pollId = window.setInterval(() => {
      void fetchAircraft()
    }, POLL_MS)

    let moveTimer: number | null = null
    const onMoveEnd = () => {
      if (moveTimer != null) window.clearTimeout(moveTimer)
      moveTimer = window.setTimeout(() => {
        void fetchAircraft()
      }, MOVE_FETCH_DEBOUNCE_MS)
    }
    map.on('moveend', onMoveEnd)

    return () => {
      window.clearInterval(pollId)
      if (moveTimer != null) window.clearTimeout(moveTimer)
      map.off('moveend', onMoveEnd)
    }
  }, [fetchAircraft, mapReady, mapRef])

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
    if (!mapReady) return
    applyAircraft([...aircraftByIdRef.current.values()])
  }, [aircraftByIdRef, applyAircraft, highlightIcao24, mapReady])
}
