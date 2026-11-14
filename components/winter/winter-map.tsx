'use client'

import { useEffect, useRef, useState } from 'react'
import OLMap from 'ol/Map'
import View from 'ol/View'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromExtent } from 'ol/geom/Polygon'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import XYZ from 'ol/source/XYZ'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { defaults as defaultControls } from 'ol/control'
import { defaults as defaultInteractions } from 'ol/interaction'
import { fromLonLat, transformExtent } from 'ol/proj'
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import { getWinterMapState } from './winter-map-data'
import type { WinterMapStatus } from './winter-map-data'
import type { WinterMapSnapshot, WinterPlace } from '@/lib/winter/types'
import type { ReactElement } from 'react'

import 'ol/ol.css'

interface WinterMapProps {
  snapshot: WinterMapSnapshot | null
  place: WinterPlace | null
}

// This is an overview extent, deliberately not a political/land coverage mask.
const OVERVIEW_EXTENT = transformExtent([-125, 24, -66, 50], 'EPSG:4326', 'EPSG:3857')
const STATUS_MESSAGES: Record<WinterMapStatus, string> = {
  available: 'Official regional forecast contours shown. Use the legend and outlook summary for categories.',
  empty: 'No contours in this verified outlook period. Local winter conditions may still occur.',
  unavailable: 'Forecast contours are unavailable. The base map does not indicate an absence of winter weather.',
  stale: 'The outlook is stale. Forecast contours are hidden until a current outlook is available.',
  expired: 'This outlook period has ended. Forecast contours are hidden.',
  invalid: 'The outlook could not be verified for display. Forecast contours are hidden.',
}

export default function WinterMap({ snapshot, place }: WinterMapProps): ReactElement {
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OLMap | null>(null)
  const contoursRef = useRef<VectorSource | null>(null)
  const placesRef = useRef<VectorSource | null>(null)
  const nationalViewRef = useRef(true)
  const [now, setNow] = useState(() => Date.now())
  const [mapError, setMapError] = useState<string | null>(null)
  const state = getWinterMapState(snapshot, now)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const currentTime = Date.now()
      setNow(currentTime)
      const validityEnd = snapshot?.validTo ? Date.parse(snapshot.validTo) : NaN
      const issuedAt = snapshot?.issuedAt ? Date.parse(snapshot.issuedAt) : NaN
      const freshnessHours = snapshot?.selection.product === 'impacts' ? 6 : 30
      const boundaries = [validityEnd, issuedAt + freshnessHours * 3_600_000]
        .filter(value => Number.isFinite(value) && value > currentTime)
      const nextBoundary = boundaries.length ? Math.min(...boundaries) - currentTime + 1 : 60_000
      timer = setTimeout(tick, Math.min(60_000, nextBoundary))
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer)
        tick()
      }
    }
    tick()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [snapshot])

  useEffect(() => {
    if (!targetRef.current) return
    let map: OLMap | undefined
    let observer: ResizeObserver | undefined
    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    const onWindowResize = () => map?.updateSize()
    try {
      const contours = new VectorSource({ wrapX: false })
      const places = new VectorSource({ wrapX: false })
      const styles = new Map<string, Style>()
      const contoursLayer = new VectorLayer({
        source: contours,
        zIndex: 10,
        renderOrder: (left, right) => Number(left.get('rank')) - Number(right.get('rank')),
        style: feature => {
          const color: unknown = feature.get('color')
          const rank: unknown = feature.get('rank')
          if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color) || typeof rank !== 'number') return undefined
          const key = `${color}:${rank}`
          let style = styles.get(key)
          if (!style) {
            style = new Style({
              fill: new Fill({ color: `${color}a8` }),
              stroke: new Stroke({ color, width: 1.75 }),
              zIndex: rank,
            })
            styles.set(key, style)
          }
          return style
        },
      })
      const boundaryLayer = new VectorLayer({
        source: new VectorSource({ features: [new Feature(fromExtent(OVERVIEW_EXTENT))], wrapX: false }),
        style: new Style({ stroke: new Stroke({ color: '#475569', width: 1.5, lineDash: [7, 7] }) }),
        zIndex: 15,
      })
      const placeLayer = new VectorLayer({
        source: places,
        style: new Style({
          image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#0f172a' }), stroke: new Stroke({ color: '#ffffff', width: 3 }) }),
        }),
        zIndex: 20,
      })
      map = new OLMap({
        target: targetRef.current,
        layers: [
          new TileLayer({
            source: new XYZ({
              // Key-free, public-domain USGS reference geography; do not show
              // a CARTO authentication watermark when its optional key is absent.
              url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
              crossOrigin: 'anonymous',
              attributions: 'Map services and data available from <a href="https://www.usgs.gov/programs/national-geospatial-program">U.S. Geological Survey, National Geospatial Program</a>.',
            }),
          }),
          contoursLayer, boundaryLayer, placeLayer,
        ],
        controls: defaultControls({ zoom: false, rotate: false, attributionOptions: { collapsible: false } }),
        interactions: defaultInteractions({ mouseWheelZoom: false, altShiftDragRotate: false, pinchRotate: false }),
        view: new View({ center: fromLonLat([-98, 39]), zoom: 3, minZoom: 2, maxZoom: 12, enableRotation: false }),
      })
      const activeMap = map
      mapRef.current = activeMap
      contoursRef.current = contours
      placesRef.current = places
      const resize = () => {
        activeMap.updateSize()
        if (nationalViewRef.current) activeMap.getView().fit(OVERVIEW_EXTENT, { padding: [26, 18, 26, 18], maxZoom: 5 })
      }
      activeMap.on('pointerdrag', () => { nationalViewRef.current = false })
      activeMap.on('error', () => {
        contours.clear()
        setMapError('The map could not render. Use the outlook summary and official source link in this forecast workspace.')
      })
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(resize)
        observer.observe(targetRef.current)
      } else {
        window.addEventListener('resize', onWindowResize)
      }
      resizeTimer = setTimeout(resize, 0)
    } catch (error) {
      console.error('[winter-map] Initialization failed', error)
      setMapError('The map could not load. Use the outlook summary and official source link in this forecast workspace.')
    }
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      observer?.disconnect()
      window.removeEventListener('resize', onWindowResize)
      map?.setTarget(undefined)
      map?.dispose()
      mapRef.current = null
      contoursRef.current = null
      placesRef.current = null
    }
  }, [])

  useEffect(() => {
    const source = contoursRef.current
    if (!source) return
    source.clear()
    try {
      const current = getWinterMapState(snapshot, Date.now())
      if (current.contours.features.length) {
        source.addFeatures(new GeoJSON().readFeatures(current.contours, {
          dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857',
        }))
      }
      setMapError(null)
    } catch (error) {
      source.clear()
      console.error('[winter-map] Contour rendering failed', error)
      setMapError('Forecast contours could not render. Use the outlook summary and official source link in this forecast workspace.')
    }
  }, [snapshot, now])

  useEffect(() => {
    const map = mapRef.current
    const source = placesRef.current
    if (!map || !source) return
    source.clear()
    if (!place || !Number.isFinite(place.lon) || !Number.isFinite(place.lat)
      || Math.abs(place.lon) > 180 || Math.abs(place.lat) > 85.051129) return
    const center = fromLonLat([place.lon, place.lat])
    source.addFeature(new Feature({ geometry: new Point(center), name: place.name }))
    nationalViewRef.current = false
    map.getView().setCenter(center)
    map.getView().setZoom(7)
  }, [place])

  const zoom = (amount: number) => {
    const view = mapRef.current?.getView()
    if (!view) return
    nationalViewRef.current = false
    view.setZoom(Math.max(2, Math.min(12, (view.getZoom() ?? 4) + amount)))
  }

  const reset = () => {
    nationalViewRef.current = true
    mapRef.current?.getView().fit(OVERVIEW_EXTENT, { padding: [26, 18, 26, 18], maxZoom: 5 })
  }

  const buttonClass = 'min-h-11 min-w-11 border border-[var(--border)] bg-[var(--bg)] px-3 text-sm font-bold text-[var(--text)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:opacity-50'

  return (
    <div data-testid="winter-map" className="overflow-hidden border-2 border-[var(--border)] bg-[var(--bg)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-3">
        <span className="text-xs text-muted-foreground">Dashed box: approximate contiguous U.S. overview</span>
        <div className="flex gap-2" role="group" aria-label="Winter map controls">
          <button type="button" className={buttonClass} onClick={() => zoom(-1)} disabled={Boolean(mapError)} aria-label="Zoom out winter map">−</button>
          <button type="button" className={buttonClass} onClick={() => zoom(1)} disabled={Boolean(mapError)} aria-label="Zoom in winter map">+</button>
          <button type="button" className={buttonClass} onClick={reset} disabled={Boolean(mapError)} aria-label="Reset view of winter map to national extent">Reset view</button>
        </div>
      </div>
      <div className="relative">
        <div
          ref={targetRef}
          data-testid="winter-map-canvas"
          className="h-[380px] w-full bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--primary)] md:h-[520px]"
          tabIndex={0}
          role="region"
          aria-label={`National winter forecast map${place ? `, selected location ${place.name}` : ''}. Arrow keys pan; plus and minus zoom. Scroll to continue down the page.`}
          onKeyDown={() => { nationalViewRef.current = false }}
        />
        {mapError && <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]/95 p-6"><p role="alert" className="max-w-md text-sm text-[var(--text)]">{mapError}</p></div>}
      </div>
      <p role="status" data-testid="winter-map-status" className="border-t border-[var(--border)] p-3 text-xs leading-relaxed text-muted-foreground">
        {mapError ?? STATUS_MESSAGES[state.status]}{place && ` Selected place: ${place.name}.`}
      </p>
    </div>
  )
}
