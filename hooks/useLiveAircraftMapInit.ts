'use client'

import { useEffect, type MutableRefObject, type RefObject } from 'react'
import {
  GeolocateControl,
  Map as MapLibreMap,
  NavigationControl,
} from 'maplibre-gl'
import {
  AIRCRAFT_ICON_ID,
  AIRCRAFT_LABEL_LAYER_ID,
  AIRCRAFT_LAYER_ID,
  CARTO_VOYAGER_STYLE,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  emptyLineCollection,
  toFeatureCollection,
} from '@/lib/aviation/live-map-geojson'
import { loadAirplaneIcon } from '@/lib/aviation/airplane-icon'
import type { Aircraft } from '@/lib/aviation/aircraft-types'

type UseLiveAircraftMapInitArgs = {
  containerRef: RefObject<HTMLDivElement | null>
  mapRef: MutableRefObject<MapLibreMap | null>
  aircraftByIdRef: MutableRefObject<Map<string, Aircraft>>
  onSelectRef: MutableRefObject<((aircraft: Aircraft | null) => void) | undefined>
  setMapReady: (ready: boolean) => void
}

export function useLiveAircraftMapInit({
  containerRef,
  mapRef,
  aircraftByIdRef,
  onSelectRef,
  setMapReady,
}: UseLiveAircraftMapInitArgs) {
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: CARTO_VOYAGER_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: false },
        trackUserLocation: false,
      }),
      'top-right',
    )

    let cancelled = false
    map.on('load', () => {
      void (async () => {
        if (!map.hasImage(AIRCRAFT_ICON_ID)) {
          const icon = await loadAirplaneIcon(128)
          if (cancelled || !mapRef.current) return
          if (!map.hasImage(AIRCRAFT_ICON_ID)) {
            map.addImage(AIRCRAFT_ICON_ID, icon, { pixelRatio: 2 })
          }
        }
        if (cancelled || !mapRef.current) return

        map.addSource('route-line', {
          type: 'geojson',
          data: emptyLineCollection(),
        })
        map.addSource('route-airports', {
          type: 'geojson',
          data: emptyLineCollection(),
        })
        map.addSource('trail-line', {
          type: 'geojson',
          data: emptyLineCollection(),
        })
        map.addSource('aircraft', {
          type: 'geojson',
          data: toFeatureCollection([]),
          promoteId: 'icao24',
        })

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': '#0284c7',
            'line-width': 3,
            'line-opacity': 0.85,
            'line-dasharray': [2, 1],
          },
        })
        map.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail-line',
          paint: {
            'line-color': '#ca8a04',
            'line-width': 2,
            'line-opacity': 0.9,
          },
        })
        map.addLayer({
          id: 'route-airports',
          type: 'circle',
          source: 'route-airports',
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match',
              ['get', 'role'],
              'origin',
              '#16a34a',
              'destination',
              '#dc2626',
              '#64748b',
            ],
            'circle-stroke-color': '#0f172a',
            'circle-stroke-width': 2,
          },
        })
        map.addLayer({
          id: 'route-airport-labels',
          type: 'symbol',
          source: 'route-airports',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-offset': [0, 1.4],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#f8fafc',
            'text-halo-width': 1.5,
          },
        })
        map.addLayer({
          id: AIRCRAFT_LAYER_ID,
          type: 'symbol',
          source: 'aircraft',
          layout: {
            'icon-image': AIRCRAFT_ICON_ID,
            'icon-rotate': ['coalesce', ['get', 'track'], 0],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'icon-padding': 2,
            'icon-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4,
              0.6,
              7,
              0.9,
              10,
              1.15,
            ],
          },
          paint: {
            'icon-opacity': 0.98,
          },
        })
        map.addLayer({
          id: AIRCRAFT_LABEL_LAYER_ID,
          type: 'symbol',
          source: 'aircraft',
          layout: {
            'text-field': ['get', 'callsign'],
            'text-size': 10,
            'text-offset': [0, 1.35],
            'text-optional': true,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          },
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#f8fafc',
            'text-halo-width': 1.25,
          },
          minzoom: 8,
          filter: ['==', ['get', 'icao24'], ''],
        })
        setMapReady(true)
      })()
    })

    map.on('click', AIRCRAFT_LAYER_ID, (e) => {
      const feature = e.features?.[0]
      const icao = feature?.properties?.icao24 as string | undefined
      if (!icao) return
      const aircraft = aircraftByIdRef.current.get(icao) ?? null
      onSelectRef.current?.(aircraft)
    })

    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: [AIRCRAFT_LAYER_ID] })
      if (hits.length === 0) onSelectRef.current?.(null)
    })

    map.on('mouseenter', AIRCRAFT_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', AIRCRAFT_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
    })

    mapRef.current = map
    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
    }
  }, [aircraftByIdRef, containerRef, mapRef, onSelectRef, setMapReady])
}
