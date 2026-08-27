'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type {
  ParsedRadarUrlState,
  RadarFrame,
  RadarMetadata,
  RadarPreset,
  RadarShareLayerState,
  RadarTilePreferences,
} from '@/lib/radar'
import {
  getDefaultLayersForRegion,
  getPresetLayers,
} from '@/lib/radar'
import {
  buildRainViewerCoverageTileTemplate,
  buildRainViewerRadarTileTemplate,
  RAINVIEWER_MAX_NATIVE_ZOOM,
  RAINVIEWER_TILE_COLOR_PARAM,
} from '@/lib/radar/rainviewer'
import { MANIFEST_REFRESH_MS } from '@/components/radar-v2/radar-constants'
import { alertStyle, spcStyle, stormReportStyle } from '@/components/radar-v2/radar-styles'

import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import GeoJSON from 'ol/format/GeoJSON'
import { fromLonLat } from 'ol/proj'

export type RadarFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type?: string
    geometry?: unknown
    properties?: Record<string, unknown>
  }>
}

export interface RadarStormReport {
  category: 'tornado' | 'hail' | 'wind'
  time: string
  size: string
  location: string
  state: string
  lat: number | null
  lon: number | null
  comments: string
  date: string
}

export interface UseRadarOverlayLoaderProps {
  latitude?: number
  longitude?: number
  isFullPage: boolean
  isWidget: boolean
  parsedUrlStateRef: RefObject<ParsedRadarUrlState>
  mapInstanceRef: RefObject<Map | null>
  radarLayerRef: RefObject<TileLayer<XYZ> | null>
  coverageLayerRef: RefObject<TileLayer<XYZ> | null>
}

export interface UseRadarOverlayLoaderResult {
  metadata: RadarMetadata | null
  frames: RadarFrame[]
  metadataError: string | null
  activeLayers: RadarShareLayerState
  layerSheetOpen: boolean
  setLayerSheetOpen: (open: boolean) => void
  opacity: number
  setOpacity: (opacity: number) => void
  tilePreferences: RadarTilePreferences
  setTilePreferences: (preferences: RadarTilePreferences) => void
  alertsGeoJson: RadarFeatureCollection | null
  spcGeoJson: RadarFeatureCollection | null
  stormReports: RadarStormReport[]
  activePreset: RadarPreset
  frameIndex: number
  setFrameIndex: (index: number) => void
  isPlaying: boolean
  setIsPlaying: (value: boolean | ((current: boolean) => boolean)) => void
  frameIndexRef: { current: number }
  handleLayersChange: (layers: RadarShareLayerState) => void
  handlePresetChange: (preset: RadarPreset) => void
}

function inferPreset(layers: RadarShareLayerState): RadarPreset {
  if (layers.spc && layers.precipitation && !layers.alerts && !layers.stormReports) return 'outlook'
  if (layers.alerts && layers.stormReports && layers.precipitation) return 'severe'
  return 'radar'
}

function getRadarTileFetchKey(preferences: RadarTilePreferences, tileSize: number): string {
  return `${tileSize}:${preferences.smooth}:${preferences.snow}`
}

export function useRadarOverlayLoader({
  latitude,
  longitude,
  isFullPage,
  isWidget,
  parsedUrlStateRef,
  mapInstanceRef,
  radarLayerRef,
  coverageLayerRef,
}: UseRadarOverlayLoaderProps): UseRadarOverlayLoaderResult {
  const [isMounted, setIsMounted] = useState(false)
  const [metadata, setMetadata] = useState<RadarMetadata | null>(null)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [activeLayers, setActiveLayers] = useState<RadarShareLayerState>(() => parsedUrlStateRef.current.layers)
  const [tilePreferences, setTilePreferences] = useState<RadarTilePreferences>(() => parsedUrlStateRef.current.tilePreferences)
  const [activePreset, setActivePreset] = useState<RadarPreset>('radar')
  const [opacity, setOpacity] = useState(0.92)
  const [layerSheetOpen, setLayerSheetOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [alertsGeoJson, setAlertsGeoJson] = useState<RadarFeatureCollection | null>(null)
  const [spcGeoJson, setSpcGeoJson] = useState<RadarFeatureCollection | null>(null)
  const [stormReports, setStormReports] = useState<RadarStormReport[]>([])

  const urlStateInitializedRef = useRef(false)
  const frameIndexRef = useRef(0)
  const lastRadarTileFetchRef = useRef<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const frames = metadata?.frames ?? []
  const currentFrame = frames[frameIndex]

  useEffect(() => {
    if (!isMounted || latitude == null || longitude == null) {
      setMetadata(null)
      return
    }

    const controller = new AbortController()

    async function loadMetadata() {
      setMetadataError(null)
      try {
        const params = new URLSearchParams({
          lat: String(latitude),
          lon: String(longitude),
        })
        const response = await fetch(`/api/radar/metadata?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Radar metadata failed: ${response.status}`)
        const nextMetadata = (await response.json()) as RadarMetadata
        if (controller.signal.aborted) return

        setMetadata(nextMetadata)

        const liveIndex = Math.max(0, nextMetadata.frames.length - 1)

        if (!urlStateInitializedRef.current) {
          const parsed = parsedUrlStateRef.current
          const defaultLayers = isWidget
            ? getPresetLayers('radar')
            : parsed.explicitLayers
              ? parsed.layers
              : getDefaultLayersForRegion(nextMetadata.coverageRegion)
          setActiveLayers(defaultLayers)
          setActivePreset(inferPreset(defaultLayers))
          setTilePreferences(parsed.tilePreferences)

          const nextIndex = isWidget
            ? liveIndex
            : parsed.frameIndex != null
              ? Math.min(parsed.frameIndex, liveIndex)
              : liveIndex
          frameIndexRef.current = nextIndex
          setFrameIndex(nextIndex)
          urlStateInitializedRef.current = true
          setIsPlaying(isFullPage)
        } else {
          const clampedIndex = Math.min(frameIndexRef.current, liveIndex)
          if (clampedIndex !== frameIndexRef.current) {
            frameIndexRef.current = clampedIndex
            setFrameIndex(clampedIndex)
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error('[radar-v2] metadata load failed', error)
        setMetadata(null)
        setMetadataError('Radar is temporarily unavailable. Try again shortly.')
      }
    }

    loadMetadata()
    const refreshTimer = isFullPage
      ? window.setInterval(loadMetadata, MANIFEST_REFRESH_MS)
      : null
    return () => {
      if (refreshTimer != null) window.clearInterval(refreshTimer)
      controller.abort()
    }
  }, [isMounted, isFullPage, isWidget, latitude, longitude, parsedUrlStateRef])

  useEffect(() => {
    if (!isMounted || latitude == null || longitude == null || isWidget) return
    const controller = new AbortController()

    async function loadOverlays() {
      try {
        const point = `${latitude},${longitude}`
        const [alertsRes, spcRes, reportsRes] = await Promise.all([
          fetch(`/api/weather/alerts?geojson=1&point=${encodeURIComponent(point)}`, { signal: controller.signal }),
          fetch('/api/weather/spc-outlook?day=1&type=cat', { signal: controller.signal }),
          fetch('/api/weather/storm-reports?days=2', { signal: controller.signal }),
        ])

        if (controller.signal.aborted) return

        setAlertsGeoJson(alertsRes.ok ? await alertsRes.json() : null)
        setSpcGeoJson(spcRes.ok ? await spcRes.json() : null)
        const reportsJson = reportsRes.ok ? await reportsRes.json() : { reports: [] }
        setStormReports(reportsJson.reports ?? [])
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setAlertsGeoJson(null)
        setSpcGeoJson(null)
        setStormReports([])
      }
    }

    loadOverlays()
    return () => controller.abort()
  }, [isMounted, isWidget, latitude, longitude])

  const updateRadarTiles = useCallback(() => {
    const map = mapInstanceRef.current
    if (!map || !metadata || !currentFrame?.tilePath) return

    const radarTemplate = buildRainViewerRadarTileTemplate(
      metadata.rainviewer.host,
      currentFrame.tilePath,
      {
        size: metadata.rainviewer.tileSize,
        colorScheme: RAINVIEWER_TILE_COLOR_PARAM,
        smooth: tilePreferences.smooth,
        snow: tilePreferences.snow,
      },
    )
    const tileFetchKey = getRadarTileFetchKey(tilePreferences, metadata.rainviewer.tileSize)
    const tileFetchChanged = lastRadarTileFetchRef.current != null
      && lastRadarTileFetchRef.current !== tileFetchKey
    lastRadarTileFetchRef.current = tileFetchKey

    if (!radarLayerRef.current) {
      const layer = new TileLayer({
        source: new XYZ({
          url: radarTemplate,
          crossOrigin: 'anonymous',
          maxZoom: RAINVIEWER_MAX_NATIVE_ZOOM,
          tileSize: metadata.rainviewer.tileSize,
          transition: 0,
        }),
        opacity,
        zIndex: 500,
        className: 'radar-precip-layer',
        useInterimTilesOnError: false,
      })
      layer.setVisible(activeLayers.precipitation)
      radarLayerRef.current = layer
      map.addLayer(layer)
    } else {
      const source = radarLayerRef.current.getSource()
      if (source instanceof XYZ) {
        source.setUrl(radarTemplate)
        if (tileFetchChanged) {
          source.refresh()
        }
      }
      radarLayerRef.current.setOpacity(opacity)
      radarLayerRef.current.setVisible(activeLayers.precipitation)
    }

    if (tilePreferences.coverage) {
      const coverageTemplate = buildRainViewerCoverageTileTemplate(metadata.rainviewer.host, {
        size: metadata.rainviewer.tileSize,
      })
      if (!coverageLayerRef.current) {
        const layer = new TileLayer({
          source: new XYZ({
            url: coverageTemplate,
            crossOrigin: 'anonymous',
            maxZoom: RAINVIEWER_MAX_NATIVE_ZOOM,
            tileSize: metadata.rainviewer.tileSize,
            transition: 0,
          }),
          opacity: 0.45,
          zIndex: 450,
          useInterimTilesOnError: false,
        })
        coverageLayerRef.current = layer
        map.addLayer(layer)
      } else {
        const source = coverageLayerRef.current.getSource()
        if (source instanceof XYZ) {
          source.setUrl(coverageTemplate)
        }
        coverageLayerRef.current.setVisible(true)
      }
    } else if (coverageLayerRef.current) {
      coverageLayerRef.current.setVisible(false)
    }
  }, [activeLayers.precipitation, currentFrame, metadata, opacity, tilePreferences, mapInstanceRef, radarLayerRef, coverageLayerRef])

  useEffect(() => {
    updateRadarTiles()
  }, [updateRadarTiles, frameIndex])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const removeNamedLayer = (name: string) => {
      const existing = map.getLayers().getArray().find((layer) => layer.get('name') === name)
      if (existing) map.removeLayer(existing)
    }

    removeNamedLayer('alerts')
    if (activeLayers.alerts && alertsGeoJson?.features?.length) {
      const source = new VectorSource({
        features: new GeoJSON().readFeatures(
          { ...alertsGeoJson, features: alertsGeoJson.features.filter((feature) => feature.geometry != null) },
          { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' },
        ),
      })
      const layer = new VectorLayer({ source, style: alertStyle, zIndex: 700 })
      layer.set('name', 'alerts')
      map.addLayer(layer)
    }

    removeNamedLayer('spc')
    if (activeLayers.spc && spcGeoJson?.features?.length) {
      const source = new VectorSource({
        features: new GeoJSON().readFeatures(
          { ...spcGeoJson, features: spcGeoJson.features.filter((feature) => feature.geometry != null) },
          { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' },
        ),
      })
      const layer = new VectorLayer({ source, style: spcStyle, zIndex: 650 })
      layer.set('name', 'spc')
      map.addLayer(layer)
    }

    removeNamedLayer('stormReports')
    if (activeLayers.stormReports && stormReports.length) {
      const source = new VectorSource()
      for (const report of stormReports) {
        if (report.lat == null || report.lon == null) continue
        source.addFeature(new Feature({
          geometry: new Point(fromLonLat([report.lon, report.lat])),
          category: report.category,
          comments: report.comments,
          location: report.location,
          state: report.state,
        }))
      }
      const layer = new VectorLayer({ source, style: stormReportStyle, zIndex: 640 })
      layer.set('name', 'stormReports')
      map.addLayer(layer)
    }
  }, [activeLayers, alertsGeoJson, spcGeoJson, stormReports, mapInstanceRef])

  useEffect(() => {
    frameIndexRef.current = frameIndex
  }, [frameIndex])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !metadata) return
    const timer = window.setTimeout(() => map.updateSize(), 50)
    return () => window.clearTimeout(timer)
  }, [metadata, isWidget, mapInstanceRef])

  const handleLayersChange = useCallback((layers: RadarShareLayerState) => {
    setActiveLayers(layers)
    setActivePreset(inferPreset(layers))
  }, [])

  const handlePresetChange = useCallback((preset: RadarPreset) => {
    setActivePreset(preset)
    setActiveLayers(getPresetLayers(preset))
  }, [])

  return {
    metadata,
    frames,
    metadataError,
    activeLayers,
    layerSheetOpen,
    setLayerSheetOpen,
    opacity,
    setOpacity,
    tilePreferences,
    setTilePreferences,
    alertsGeoJson,
    spcGeoJson,
    stormReports,
    activePreset,
    frameIndex,
    setFrameIndex,
    isPlaying,
    setIsPlaying,
    frameIndexRef,
    handleLayersChange,
    handlePresetChange,
  }
}
