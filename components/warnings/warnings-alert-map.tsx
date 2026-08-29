'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

import 'ol/ol.css'
import OLMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { fromLonLat } from 'ol/proj'
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import type OlFeature from 'ol/Feature'
import { CARTO_VOYAGER_XYZ_URL } from '@/lib/maps/carto-basemap'

const CONUS_CENTER: [number, number] = [-98.5795, 39.8283]

export interface MapPoint {
  id: string
  lat: number
  lon: number
  label: string
  sub?: string
  kind: 'lsr' | 'community'
}

export type AlertsFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type?: string
    geometry?: unknown
    properties?: Record<string, unknown>
  }>
}

interface WarningsAlertMapProps {
  geoJson: AlertsFeatureCollection | null
  extraPoints?: MapPoint[]
  onSelectFeature?: (props: Record<string, unknown>) => void
  className?: string
}

const strokeForSeverity = (sev: string): string => {
  switch (sev) {
    case 'Extreme':
      return '#dc2626'
    case 'Severe':
      return '#ea580c'
    case 'Moderate':
      return '#ca8a04'
    default:
      return '#2563eb'
  }
}

export default function WarningsAlertMap({
  geoJson,
  extraPoints = [],
  onSelectFeature,
  className,
}: WarningsAlertMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<OLMap | null>(null)
  const alertsLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const pointsLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const [popup, setPopup] = useState<{
    x: number
    y: number
    title: string
    body: string
  } | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: CARTO_VOYAGER_XYZ_URL,
        attributions:
          '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        crossOrigin: 'anonymous',
      }),
    })

    const map = new OLMap({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat(CONUS_CENTER),
        zoom: 4,
      }),
    })

    mapInstanceRef.current = map

    map.on('click', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, (f) => f)
      if (hit) {
        const props = hit.getProperties() as Record<string, unknown>
        const id = String(props.id ?? '')
        const event = String(props.event ?? 'Alert')
        const headline = String(props.headline ?? '')
        const area = String(props.areaDesc ?? '')
        const inst = String(props.instruction ?? '')
        const desc = String(props.description ?? '').slice(0, 600)
        const body = [headline, area, inst || desc].filter(Boolean).join('\n\n')
        setPopup({
          x: evt.pixel[0],
          y: evt.pixel[1],
          title: event,
          body,
        })
        onSelectFeature?.(props)
      } else {
        setPopup(null)
      }
    })

    map.on('pointermove', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, () => true)
      map.getTargetElement().style.cursor = hit ? 'pointer' : ''
    })

    const ro = new ResizeObserver(() => map.updateSize())
    if (mapRef.current) ro.observe(mapRef.current)
    const t0 = setTimeout(() => map.updateSize(), 0)
    const t1 = setTimeout(() => map.updateSize(), 200)

    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      ro.disconnect()
      map.setTarget(undefined)
      map.dispose()
      mapInstanceRef.current = null
    }
  }, [onSelectFeature])

  const refreshAlertsLayer = useCallback((fc: AlertsFeatureCollection | null) => {
    const map = mapInstanceRef.current
    if (!map) return

    if (alertsLayerRef.current) {
      map.removeLayer(alertsLayerRef.current)
      alertsLayerRef.current = null
    }
    if (!fc?.features?.length) return

    const filtered = {
      ...fc,
      features: fc.features.filter((f) => f.geometry != null),
    }
    if (!filtered.features.length) return

    const source = new VectorSource({
      features: new GeoJSON().readFeatures(filtered, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      }),
    })

    const layer = new VectorLayer({
      source,
      style: (feature: FeatureLike) => {
        const p = feature.getProperties() as Record<string, unknown>
        const sev = String(p.severity ?? 'Minor')
        const color = strokeForSeverity(sev)
        return new Style({
          fill: new Fill({ color: `${color}33` }),
          stroke: new Stroke({ color, width: 2 }),
        })
      },
      zIndex: 20,
    })
    alertsLayerRef.current = layer
    map.addLayer(layer)
    try {
      const extent = source.getExtent()
      if (extent && extent.every((n) => Number.isFinite(n))) {
        map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 8, duration: 400 })
      }
    } catch {
      /* ignore fit errors */
    }
  }, [])

  const refreshPointsLayer = useCallback((points: MapPoint[]) => {
    const map = mapInstanceRef.current
    if (!map) return

    if (pointsLayerRef.current) {
      map.removeLayer(pointsLayerRef.current)
      pointsLayerRef.current = null
    }
    if (!points.length) return

    const source = new VectorSource()
    for (const p of points) {
      const f = new GeoJSON().readFeature(
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { id: p.id, label: p.label, sub: p.sub ?? '', kind: p.kind },
        },
        { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
      ) as OlFeature
      source.addFeature(f)
    }

    const layer = new VectorLayer({
      source,
      style: (feature: FeatureLike) => {
        const k = String(feature.get('kind') ?? '')
        const color = k === 'community' ? '#a855f7' : '#0ea5e9'
        return new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: `${color}cc` }),
            stroke: new Stroke({ color: '#0f172a', width: 1 }),
          }),
        })
      },
      zIndex: 30,
    })
    pointsLayerRef.current = layer
    map.addLayer(layer)
  }, [])

  useEffect(() => {
    refreshAlertsLayer(geoJson)
  }, [geoJson, refreshAlertsLayer])

  useEffect(() => {
    refreshPointsLayer(extraPoints)
  }, [extraPoints, refreshPointsLayer])

  return (
    <div className={cn('relative rounded-lg border border-border overflow-hidden bg-card/40', className)}>
      <div ref={mapRef} className="w-full h-[420px] md:h-[520px]" role="application" aria-label="NWS alerts map" />
      {popup && (
        <div
          className="absolute z-20 max-w-sm rounded border border-border bg-background/95 p-3 text-xs font-mono shadow-xl pointer-events-none"
          style={{ left: popup.x + 12, top: popup.y + 12 }}
        >
            <p className="font-bold text-sm mb-1">{popup.title}</p>
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{popup.body}</p>
        </div>
      )}
    </div>
  )
}
