'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { ParsedRadarUrlState } from '@/lib/radar'
import { DEFAULT_RADAR_ZOOM } from '@/lib/radar'
import { CARTO_VOYAGER_URL } from '@/components/radar-v2/radar-constants'
import { RAINVIEWER_MAX_ZOOM } from '@/lib/radar/rainviewer'

import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'

export interface RadarInspectorState {
  title: string
  body: string
  link?: string | null
}

export interface UseRadarMapEngineProps {
  latitude?: number
  longitude?: number
  parsedUrlStateRef: RefObject<ParsedRadarUrlState>
}

export interface UseRadarMapEngineResult {
  mapRef: RefObject<HTMLDivElement | null>
  mapInstanceRef: RefObject<Map | null>
  radarLayerRef: RefObject<TileLayer<XYZ> | null>
  coverageLayerRef: RefObject<TileLayer<XYZ> | null>
  inspector: RadarInspectorState | null
  setInspector: (inspector: RadarInspectorState | null) => void
}

function getTrustedWeatherLink(uri: unknown): string | null {
  if (typeof uri !== 'string' || uri.trim() === '') return null
  try {
    const url = new URL(uri)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (host === 'weather.gov' || host.endsWith('.weather.gov')) {
      return url.href
    }
    return null
  } catch {
    return null
  }
}

export function useRadarMapEngine({
  latitude,
  longitude,
  parsedUrlStateRef,
}: UseRadarMapEngineProps): UseRadarMapEngineResult {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const radarLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const coverageLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const [inspector, setInspector] = useState<RadarInspectorState | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          className: 'radar-basemap-layer',
          source: new XYZ({
            url: CARTO_VOYAGER_URL,
            crossOrigin: 'anonymous',
            attributions: '&copy; CARTO &copy; OpenStreetMap',
          }),
          opacity: 1,
        }),
      ],
      view: new View({
        center: fromLonLat([longitude ?? -98.5795, latitude ?? 39.8283]),
        zoom: parsedUrlStateRef.current.zoom ?? DEFAULT_RADAR_ZOOM,
        maxZoom: RAINVIEWER_MAX_ZOOM,
      }),
    })

    mapInstanceRef.current = map

    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (item) => item)
      if (!feature) {
        setInspector(null)
        return
      }
      const props = feature.getProperties() as Record<string, unknown>
      setInspector({
        title: String(props.event ?? props.LABEL2 ?? props.category ?? 'Weather feature'),
        body: [
          props.headline,
          props.areaDesc,
          props.instruction,
          props.comments,
          props.location && props.state ? `${props.location}, ${props.state}` : null,
        ].filter(Boolean).map(String).join('\n\n') || 'No additional details available.',
        link: getTrustedWeatherLink(props.uri),
      })
    })

    const resizeObserver = new ResizeObserver(() => map.updateSize())
    if (mapRef.current) resizeObserver.observe(mapRef.current)

    return () => {
      resizeObserver.disconnect()
      map.setTarget(undefined)
      map.dispose()
      mapInstanceRef.current = null
      radarLayerRef.current = null
      coverageLayerRef.current = null
    }
  }, [latitude, longitude])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || latitude == null || longitude == null) return
    map.getView().setCenter(fromLonLat([longitude, latitude]))
    map.getView().setZoom(parsedUrlStateRef.current.zoom ?? DEFAULT_RADAR_ZOOM)
  }, [latitude, longitude])

  return {
    mapRef,
    mapInstanceRef,
    radarLayerRef,
    coverageLayerRef,
    inspector,
    setInspector,
  }
}
