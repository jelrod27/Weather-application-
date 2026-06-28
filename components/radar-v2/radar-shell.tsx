'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ThemeType } from '@/lib/theme-config'
import type { RadarFrame, RadarMetadata } from '@/lib/radar'
import {
  DEFAULT_RADAR_ZOOM,
  getDefaultLayersForRegion,
  getPresetLayers,
  mergeRadarUrlParams,
  parseRadarUrlState,
  serializeRadarUrlParams,
  type RadarPreset,
  type RadarShareLayerState,
  type RadarTilePreferences,
} from '@/lib/radar'
import {
  buildRainViewerCoverageTileTemplate,
  buildRainViewerRadarTileTemplate,
  getRainViewerDisplayFilter,
  RAINVIEWER_MAX_NATIVE_ZOOM,
  RAINVIEWER_MAX_ZOOM,
  RAINVIEWER_TILE_COLOR_PARAM,
} from '@/lib/radar/rainviewer'
import { RadarInspector } from '@/components/radar-v2/radar-inspector'
import { RadarLayerSheet } from '@/components/radar-v2/radar-layer-sheet'
import { RadarPlayerDock } from '@/components/radar-v2/radar-player-dock'
import { RadarPrecipLegend } from '@/components/radar-v2/radar-precip-legend'
import { RadarPresetBar } from '@/components/radar-v2/radar-preset-bar'
import { RadarStatusChip } from '@/components/radar-v2/radar-status-chip'
import { RadarTopBar } from '@/components/radar-v2/radar-top-bar'
import { RadarWidgetBadge } from '@/components/radar-v2/radar-widget-badge'
import {
  BASE_ANIMATION_INTERVAL_MS,
  CARTO_VOYAGER_URL,
  MANIFEST_REFRESH_MS,
  URL_SYNC_DEBOUNCE_MS,
} from '@/components/radar-v2/radar-constants'
import { alertStyle, spcStyle, stormReportStyle } from '@/components/radar-v2/radar-styles'

import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import GeoJSON from 'ol/format/GeoJSON'
import { fromLonLat } from 'ol/proj'

interface RadarShellProps {
  latitude?: number
  longitude?: number
  locationName?: string
  theme?: ThemeType
  displayMode?: 'full-page' | 'widget'
  onLocationSearch?: (location: string) => void
  searchError?: string
  shareConfig?: {
    title: string
    text: string
    url: string
  }
}

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type?: string
    geometry?: unknown
    properties?: Record<string, unknown>
  }>
}

interface StormReport {
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

function inferPreset(layers: RadarShareLayerState): RadarPreset {
  if (layers.spc && layers.precipitation && !layers.alerts && !layers.stormReports) return 'outlook'
  if (layers.alerts && layers.stormReports && layers.precipitation) return 'severe'
  return 'radar'
}

function getFreshnessClass(generatedAt: string | null): string {
  if (!generatedAt) return 'bg-black/70 text-zinc-200'
  const ageMinutes = (Date.now() - new Date(generatedAt).getTime()) / 60000
  if (ageMinutes < 5) return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
  if (ageMinutes < 15) return 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
  return 'bg-red-500/20 text-red-100 border border-red-400/30'
}

function getRelativeTimeLabel(frame: RadarFrame | undefined): string {
  if (!frame) return '—'
  if (frame.isLive) return 'LIVE'
  const minutes = Math.abs(frame.offsetMinutes)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `${hours}h ${remainder}m ago` : `${hours}h ago`
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

function getRadarTileFetchKey(preferences: RadarTilePreferences, tileSize: number): string {
  return `${tileSize}:${preferences.smooth}:${preferences.snow}`
}

function RadarShell({
  latitude,
  longitude,
  locationName,
  theme: _theme = 'nord',
  displayMode = 'full-page',
  onLocationSearch,
  searchError,
  shareConfig,
}: RadarShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parsedUrlStateRef = useRef(parseRadarUrlState(searchParams))

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const radarLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const coverageLayerRef = useRef<TileLayer<XYZ> | null>(null)

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
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1)
  const [inspector, setInspector] = useState<{ title: string; body: string; link?: string | null } | null>(null)
  const [alertsGeoJson, setAlertsGeoJson] = useState<FeatureCollection | null>(null)
  const [spcGeoJson, setSpcGeoJson] = useState<FeatureCollection | null>(null)
  const [stormReports, setStormReports] = useState<StormReport[]>([])

  const timerRef = useRef<number | null>(null)
  const urlSyncTimerRef = useRef<number | null>(null)
  const urlStateInitializedRef = useRef(false)
  const frameIndexRef = useRef(0)
  const lastRadarTileFetchRef = useRef<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const frames = metadata?.frames ?? []
  const currentFrame = frames[frameIndex]
  const isLiveFrame = currentFrame?.isLive ?? false
  const isFullPage = displayMode === 'full-page'
  const isWidget = displayMode === 'widget'

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
  }, [isMounted, isFullPage, isWidget, latitude, longitude])

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
  }, [activeLayers.precipitation, currentFrame, metadata, opacity, tilePreferences])

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
  }, [activeLayers, alertsGeoJson, spcGeoJson, stormReports])

  useEffect(() => {
    frameIndexRef.current = frameIndex
  }, [frameIndex])

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (timerRef.current != null) window.clearInterval(timerRef.current)
      timerRef.current = null
      return
    }

    const interval = Math.max(200, BASE_ANIMATION_INTERVAL_MS / speed)
    timerRef.current = window.setInterval(() => {
      const liveIndex = Math.max(0, frames.length - 1)
      const nextIndex = frameIndexRef.current >= liveIndex ? 0 : frameIndexRef.current + 1
      frameIndexRef.current = nextIndex
      setFrameIndex(nextIndex)
    }, interval)

    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [frames.length, isPlaying, speed])

  useEffect(() => {
    if (!isFullPage || !metadata || frames.length === 0) return
    if (urlSyncTimerRef.current != null) window.clearTimeout(urlSyncTimerRef.current)
    urlSyncTimerRef.current = window.setTimeout(() => {
      const radarParams = serializeRadarUrlParams({
        layers: activeLayers,
        frameIndex,
        zoom: mapInstanceRef.current?.getView().getZoom() ?? null,
        frameCount: frames.length,
        tilePreferences,
      })
      const merged = mergeRadarUrlParams(new URLSearchParams(searchParams.toString()), radarParams)
      const next = merged.toString()
      const current = searchParams.toString()
      if (next !== current) {
        router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
      }
    }, URL_SYNC_DEBOUNCE_MS)

    return () => {
      if (urlSyncTimerRef.current != null) window.clearTimeout(urlSyncTimerRef.current)
    }
  }, [activeLayers, frameIndex, frames.length, isFullPage, metadata, pathname, router, searchParams, tilePreferences])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !metadata) return
    const timer = window.setTimeout(() => map.updateSize(), 50)
    return () => window.clearTimeout(timer)
  }, [metadata, isWidget])

  const updatedLabel = metadata?.generatedAt
    ? new Date(metadata.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null

  const statusClass = getFreshnessClass(metadata?.generatedAt ?? null)

  return (
    <div
      data-radar-container
      data-radar-v2
      data-radar-widget={isWidget ? 'true' : undefined}
      data-radar-color-scheme={tilePreferences.colorScheme}
      style={{
        '--radar-scheme-filter': getRainViewerDisplayFilter(tilePreferences.colorScheme),
      } as CSSProperties}
      className={`relative flex w-full flex-col ${isFullPage ? 'h-full min-h-0 bg-black' : 'h-full min-h-0'}`}
    >
      <div className={`relative min-h-0 flex-1 ${isFullPage ? 'h-full' : 'h-full min-h-[280px]'}`}>
        <div ref={mapRef} className={`h-full w-full ${isFullPage ? 'bg-black' : 'bg-[#e8e4dc]'} ${isFullPage ? '' : 'rounded-lg'}`} />

        {isFullPage && locationName && onLocationSearch && shareConfig ? (
          <RadarTopBar
            locationName={locationName}
            onSearch={onLocationSearch}
            searchError={searchError}
            shareConfig={shareConfig}
          />
        ) : null}

        {isWidget && metadata && frames.length > 0 ? (
          <RadarWidgetBadge updatedLabel={updatedLabel} />
        ) : null}

        {isFullPage && metadata && frames.length > 0 && activeLayers.precipitation ? (
          <RadarPrecipLegend />
        ) : null}

        {isFullPage && metadata && frames.length > 0 ? (
          <RadarStatusChip
            providerLabel={`${metadata.selectedProvider.shortName.toUpperCase()} RADAR`}
            updatedLabel={updatedLabel ?? ''}
            freshnessClassName={statusClass}
            isPlaying={isPlaying}
            isLiveFrame={isLiveFrame}
          />
        ) : null}

        {metadataError ? (
          <div className="absolute inset-0 z-[2100] flex items-center justify-center bg-black/70 p-6 text-center text-white">
            <div>
              <p className="text-lg font-semibold">Radar unavailable</p>
              <p className="mt-2 text-sm text-zinc-300">{metadataError}</p>
            </div>
          </div>
        ) : null}

        {isFullPage ? (
          <RadarLayerSheet
            open={layerSheetOpen}
            layers={activeLayers}
            tilePreferences={tilePreferences}
            opacity={opacity}
            alertCount={alertsGeoJson?.features?.length ?? 0}
            spcCount={spcGeoJson?.features?.length ?? 0}
            stormReportCount={stormReports.length}
            onClose={() => setLayerSheetOpen(false)}
            onLayersChange={(layers) => {
              setActiveLayers(layers)
              setActivePreset(inferPreset(layers))
            }}
            onTilePreferencesChange={setTilePreferences}
            onOpacityChange={setOpacity}
          />
        ) : null}

        {isFullPage && inspector ? (
          <RadarInspector
            title={inspector.title}
            body={inspector.body}
            link={inspector.link}
            onClose={() => setInspector(null)}
          />
        ) : null}

        {isFullPage && frames.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2500] flex flex-col">
            <div className="pointer-events-none h-16 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
            <RadarPresetBar
              activePreset={activePreset}
              onPresetChange={(preset) => {
                setActivePreset(preset)
                setActiveLayers(getPresetLayers(preset))
              }}
              onOpenLayers={() => setLayerSheetOpen(true)}
            />
            <RadarPlayerDock
              frameIndex={frameIndex}
              frameCount={frames.length}
              isPlaying={isPlaying}
              isLiveFrame={isLiveFrame}
              relativeTime={getRelativeTimeLabel(currentFrame)}
              speed={speed}
              onPlayPause={() => setIsPlaying((value) => !value)}
              onSkipToStart={() => {
                setIsPlaying(false)
                setFrameIndex(0)
              }}
              onSkipToEnd={() => {
                setIsPlaying(false)
                setFrameIndex(Math.max(0, frames.length - 1))
              }}
              onSpeedChange={setSpeed}
              onFrameChange={(index) => {
                setIsPlaying(false)
                setFrameIndex(index)
              }}
              onLiveTap={() => {
                setIsPlaying(false)
                setFrameIndex(Math.max(0, frames.length - 1))
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default RadarShell
