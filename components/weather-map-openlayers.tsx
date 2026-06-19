'use client'
// Build: v6 - Enhanced smoothness, dark base map, animated marker, radar legend
// Phase 1: Smoother playback (500ms transition, 500ms interval), tile preloading, CSS easing
// Phase 2: CartoDB Dark Matter base map, precipitation legend, pulse marker animation

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Play, Pause, SkipBack, SkipForward, Layers, ChevronDown, Loader2 } from 'lucide-react'
import type { ThemeType } from '@/lib/theme-config'
import {
  buildRadarFrames,
  DEFAULT_RADAR_ZOOM,
  mergeRadarUrlParams,
  parseRadarUrlState,
  serializeRadarUrlParams,
  type RadarFrame,
  type RadarMetadata,
  type RadarProvider,
} from '@/lib/radar'

// OpenLayers imports
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Icon, Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'

// Animation tuning constants
const TILE_TRANSITION_MS = 500 // Smooth crossfade between frames
const BASE_ANIMATION_INTERVAL_MS = 500 // Fluid playback speed
const PRELOAD_FRAMES_AHEAD = 3 // Number of frames to preload during playback
const TILE_ERROR_FALLBACK_THRESHOLD = 5
const URL_SYNC_DEBOUNCE_MS = 300

// CartoDB Dark Matter base map for better radar contrast
// Note: Removed {r} (Leaflet retina placeholder) - OpenLayers XYZ doesn't support it
const CARTO_DARK_MATTER_URL = 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'

interface WeatherMapProps {
  latitude?: number
  longitude?: number
  locationName?: string
  theme?: ThemeType
  displayMode?: 'full-page' | 'widget'
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

function buildRadarXyzUrl(provider: RadarProvider, frame: RadarFrame): string | null {
  if (!provider.xyz) return null
  return provider.xyz.urlTemplate.replace('{epochSeconds}', String(frame.epochSeconds))
}

function alertStyle(feature: FeatureLike): Style {
  const severity = String(feature.get('severity') ?? 'Minor')
  const color = severity === 'Extreme'
    ? '#dc2626'
    : severity === 'Severe'
      ? '#ea580c'
      : severity === 'Moderate'
        ? '#ca8a04'
        : '#2563eb'

  return new Style({
    fill: new Fill({ color: `${color}33` }),
    stroke: new Stroke({ color, width: 2 }),
  })
}

function spcStyle(feature: FeatureLike): Style {
  const fill = String(feature.get('fill') ?? '#facc15')
  const stroke = String(feature.get('stroke') ?? '#fef08a')
  return new Style({
    fill: new Fill({ color: `${fill}66` }),
    stroke: new Stroke({ color: stroke, width: 2 }),
  })
}

function stormReportStyle(feature: FeatureLike): Style {
  const category = String(feature.get('category') ?? '')
  const color = category === 'tornado' ? '#ef4444' : category === 'hail' ? '#a855f7' : '#38bdf8'
  return new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: `${color}dd` }),
      stroke: new Stroke({ color: '#020617', width: 1 }),
    }),
  })
}

const WeatherMapOpenLayers = ({
  latitude,
  longitude,
  locationName,
  theme = 'nord',
  displayMode = 'full-page'
}: WeatherMapProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parsedUrlStateRef = useRef(parseRadarUrlState(searchParams))

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const radarLayerRef = useRef<TileLayer<TileWMS | XYZ> | null>(null)
  const radarSourceRef = useRef<TileWMS | XYZ | null>(null)
  const alertsLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const spcLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const stormReportsLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const [radarMetadata, setRadarMetadata] = useState<RadarMetadata | null>(null)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [activeProvider, setActiveProvider] = useState<RadarProvider | null>(null)
  const [activeFrames, setActiveFrames] = useState<RadarFrame[]>([])
  const [usingFallbackProvider, setUsingFallbackProvider] = useState(false)
  const [radarStateReady, setRadarStateReady] = useState(false)
  const [alertsGeoJson, setAlertsGeoJson] = useState<FeatureCollection | null>(null)
  const [spcGeoJson, setSpcGeoJson] = useState<FeatureCollection | null>(null)
  const [stormReports, setStormReports] = useState<StormReport[]>([])
  const [selectedOverlay, setSelectedOverlay] = useState<{
    x: number
    y: number
    title: string
    body: string
  } | null>(null)

  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(() => ({
    precipitation: parsedUrlStateRef.current.layers.precipitation,
    alerts: parsedUrlStateRef.current.layers.alerts,
    spc: parsedUrlStateRef.current.layers.spc,
    stormReports: parsedUrlStateRef.current.layers.stormReports,
    clouds: false,
    wind: false,
    pressure: false,
    temperature: false,
  }))

  const [opacity, setOpacity] = useState(0.85)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [radarVisible, setRadarVisible] = useState(false) // For fade-in animation
  const timerRef = useRef<number | null>(null)
  const preloadCacheRef = useRef<Set<string>>(new Set()) // Track preloaded frames
  const isPlayingRef = useRef(isPlaying)
  const opacityRef = useRef(opacity)
  const frameIndexRef = useRef(frameIndex)
  const tileErrorCountRef = useRef(0)
  const usingFallbackRef = useRef(false)
  const fallbackProviderRef = useRef<RadarProvider | undefined>(undefined)
  const activeProviderRef = useRef<RadarProvider | null>(null)
  const urlSyncTimerRef = useRef<number | null>(null)
  const urlStateInitializedRef = useRef(false)

  // Track client-side mount to prevent hydration mismatch with Date.now()
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || latitude == null || longitude == null) {
      setRadarMetadata(null)
      return
    }

    const controller = new AbortController()

    async function loadRadarMetadata() {
      setMetadataError(null)
      try {
        const params = new URLSearchParams({
          lat: String(latitude),
          lon: String(longitude),
        })
        const response = await fetch(`/api/radar/metadata?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Radar metadata failed: ${response.status}`)
        }
        const metadata = (await response.json()) as RadarMetadata
        if (controller.signal.aborted) return
        setRadarMetadata(metadata)
        fallbackProviderRef.current = metadata.fallbackProvider

        if (!usingFallbackRef.current) {
          setActiveProvider(metadata.selectedProvider)
          activeProviderRef.current = metadata.selectedProvider
          setActiveFrames(metadata.frames)
          setUsingFallbackProvider(false)

          const urlFrame = parsedUrlStateRef.current.frameIndex
          const liveIndex = Math.max(0, metadata.frames.length - 1)
          if (!urlStateInitializedRef.current) {
            const nextIndex = urlFrame != null
              ? Math.min(urlFrame, liveIndex)
              : liveIndex
            frameIndexRef.current = nextIndex
            setFrameIndex(nextIndex)
            urlStateInitializedRef.current = true
          }
        } else if (activeProviderRef.current) {
          const refreshedFrames = buildRadarFrames({
            stepMinutes: activeProviderRef.current.frameStepMinutes,
            pastMinutes: activeProviderRef.current.pastMinutes,
          })
          setActiveFrames(refreshedFrames)
          setFrameIndex(Math.max(0, refreshedFrames.length - 1))
        }
        setRadarStateReady(true)
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error('[radar-map] metadata load failed', error)
        setRadarMetadata(null)
        setMetadataError('Radar metadata unavailable. Try again shortly.')
        setRadarStateReady(false)
      }
    }

    loadRadarMetadata()
    const refreshTimer = window.setInterval(loadRadarMetadata, 5 * 60 * 1000)

    return () => {
      window.clearInterval(refreshTimer)
      controller.abort()
    }
  }, [isMounted, latitude, longitude])

  const locationQueryKey = useMemo(
    () => `${latitude ?? ''}:${longitude ?? ''}:${searchParams.get('location') ?? ''}`,
    [latitude, longitude, searchParams],
  )

  useEffect(() => {
    usingFallbackRef.current = false
    setUsingFallbackProvider(false)
    tileErrorCountRef.current = 0
    urlStateInitializedRef.current = false
    setRadarStateReady(false)
    parsedUrlStateRef.current = parseRadarUrlState(new URLSearchParams(window.location.search))
    setActiveLayers((prev) => ({
      ...prev,
      precipitation: parsedUrlStateRef.current.layers.precipitation,
      alerts: parsedUrlStateRef.current.layers.alerts,
      spc: parsedUrlStateRef.current.layers.spc,
      stormReports: parsedUrlStateRef.current.layers.stormReports,
    }))
  }, [locationQueryKey])

  const activateFallbackProvider = useCallback(() => {
    const fallback = fallbackProviderRef.current
    const current = activeProviderRef.current
    if (!fallback || current?.id === fallback.id) return

    tileErrorCountRef.current = 0
    usingFallbackRef.current = true
    activeProviderRef.current = fallback

    const frames = buildRadarFrames({
      stepMinutes: fallback.frameStepMinutes,
      pastMinutes: fallback.pastMinutes,
    })

    setUsingFallbackProvider(true)
    setActiveProvider(fallback)
    setActiveFrames(frames)
    const nextIndex = Math.max(0, frames.length - 1)
    frameIndexRef.current = nextIndex
    setFrameIndex(nextIndex)
    setMetadataError(null)
    console.warn('[radar-map] switched to fallback provider', {
      from: current?.id,
      to: fallback.id,
    })
  }, [])

  useEffect(() => {
    if (!isMounted || latitude == null || longitude == null) return

    const controller = new AbortController()

    async function loadSevereOverlays() {
      try {
        const point = `${latitude},${longitude}`
        const [alertsRes, spcRes, reportsRes] = await Promise.all([
          fetch(`/api/weather/alerts?geojson=1&point=${encodeURIComponent(point)}`, {
            signal: controller.signal,
          }),
          fetch('/api/weather/spc-outlook?day=1&type=cat', {
            signal: controller.signal,
          }),
          fetch('/api/weather/storm-reports?days=2', {
            signal: controller.signal,
          }),
        ])

        if (controller.signal.aborted) return

        if (alertsRes.ok) {
          const alerts = (await alertsRes.json()) as FeatureCollection
          setAlertsGeoJson(alerts.type === 'FeatureCollection' ? alerts : null)
        } else {
          setAlertsGeoJson(null)
        }

        if (spcRes.ok) {
          const spc = (await spcRes.json()) as FeatureCollection
          setSpcGeoJson(spc.type === 'FeatureCollection' ? spc : null)
        } else {
          setSpcGeoJson(null)
        }

        if (reportsRes.ok) {
          const reportsJson = (await reportsRes.json()) as { reports?: StormReport[] }
          setStormReports(reportsJson.reports ?? [])
        } else {
          setStormReports([])
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.warn('[radar-map] severe overlays unavailable', error)
        setAlertsGeoJson(null)
        setSpcGeoJson(null)
        setStormReports([])
      }
    }

    loadSevereOverlays()

    return () => controller.abort()
  }, [isMounted, latitude, longitude])

  const radarProvider = activeProvider
  const radarFrames = useMemo(() => activeFrames, [activeFrames])
  const timestamps = useMemo(() => {
    return radarFrames.map((frame) => frame.timestamp)
  }, [radarFrames])
  const hasRadarProvider = !!radarProvider && timestamps.length > 0
  const metadataUpdatedAt = radarMetadata?.generatedAt
    ? new Date(radarMetadata.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const centerLon = -98.5795
    const centerLat = 39.8283


    // Create base layer (CartoDB Dark Matter - better radar visibility)
    // Dark base map provides excellent contrast for precipitation colors
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: CARTO_DARK_MATTER_URL,
        attributions: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        crossOrigin: 'anonymous',
      }),
      opacity: 0.9,
    })

    const initialZoom = parsedUrlStateRef.current.zoom ?? DEFAULT_RADAR_ZOOM

    // Create map
    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat([centerLon, centerLat]),
        zoom: initialZoom,
      }),
    })

    mapInstanceRef.current = map

    map.on('click', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature)
      if (!hit) {
        setSelectedOverlay(null)
        return
      }

      const props = hit.getProperties() as Record<string, unknown>
      const title = String(props.event ?? props.LABEL2 ?? props.LABEL ?? props.category ?? props.label ?? 'Map feature')
      const body = [
        props.headline,
        props.areaDesc,
        props.instruction,
        props.comments,
        props.location && props.state ? `${props.location}, ${props.state}` : null,
      ]
        .filter(Boolean)
        .map(String)
        .join('\n\n')

      setSelectedOverlay({
        x: evt.pixel[0],
        y: evt.pixel[1],
        title,
        body: body || 'No additional details available.',
      })
    })

    map.on('pointermove', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, () => true)
      map.getTargetElement().style.cursor = hit ? 'pointer' : ''
    })

    // Fix for production: force map to recalculate size multiple times
    // Sometimes the container size isn't ready immediately
    const updateMapSize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.updateSize()
      }
    }

    // Initial update
    setTimeout(updateMapSize, 0)
    setTimeout(updateMapSize, 100)
    setTimeout(updateMapSize, 500)
    setTimeout(updateMapSize, 1000)

    // Use ResizeObserver for robust container size detection
    const resizeObserver = new ResizeObserver(() => {
      updateMapSize()
    })

    if (mapRef.current) {
      resizeObserver.observe(mapRef.current)
    }

    // Also update on window resize
    const handleResize = () => updateMapSize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      map.setTarget(undefined)
      // Match the cleanup pattern used by every other OpenLayers consumer
      // (TurbulenceMap, TravelCorridorMap, SPCOutlookMap, warnings-alert-map).
      // Without dispose() the map's tile sources, listeners, and any retained
      // workers leak across SPA navigations.
      map.dispose()
      mapInstanceRef.current = null
    }
  }, [])

  // Update map center when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || latitude == null || longitude == null) return

    mapInstanceRef.current.getView().setCenter(fromLonLat([longitude, latitude]))
    mapInstanceRef.current.getView().setZoom(parsedUrlStateRef.current.zoom ?? DEFAULT_RADAR_ZOOM)
  }, [latitude, longitude])

  // Add location marker
  useEffect(() => {
    if (!mapInstanceRef.current || latitude == null || longitude == null) return

    const map = mapInstanceRef.current

    // Remove existing marker layer
    const existingMarker = map.getLayers().getArray().find(layer =>
      layer.get('name') === 'marker'
    )
    if (existingMarker) {
      map.removeLayer(existingMarker)
    }

    // Create marker feature
    const markerFeature = new Feature({
      geometry: new Point(fromLonLat([longitude, latitude])),
    })

    // Create animated marker with pulse effect using CSS animation in SVG
    const pulseMarkerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 0.4; r: 18; }
            50% { opacity: 0; r: 24; }
          }
          .pulse-ring { animation: pulse 2s ease-out infinite; }
        </style>
        <!-- Pulse ring effect -->
        <circle class="pulse-ring" cx="24" cy="20" r="18" fill="none" stroke="#00d4ff" stroke-width="2"/>
        <circle class="pulse-ring" cx="24" cy="20" r="14" fill="none" stroke="#00d4ff" stroke-width="1" style="animation-delay: 0.5s"/>
        <!-- Main marker pin -->
        <path d="M33 20c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#00d4ff" stroke="#000" stroke-width="2"/>
        <circle cx="24" cy="20" r="3" fill="#000"/>
      </svg>
    `
    
    const markerLayer = new VectorLayer({
      source: new VectorSource({
        features: [markerFeature],
      }),
      style: new Style({
        image: new Icon({
          src: 'data:image/svg+xml;utf8,' + encodeURIComponent(pulseMarkerSvg),
          scale: 1,
          anchor: [0.5, 0.85],
        }),
      }),
      zIndex: 1000,
    })

    markerLayer.set('name', 'marker')
    map.addLayer(markerLayer)
  }, [latitude, longitude])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (alertsLayerRef.current) {
      map.removeLayer(alertsLayerRef.current)
      alertsLayerRef.current = null
    }

    if (!activeLayers.alerts || !alertsGeoJson?.features?.length) return

    const filtered = {
      ...alertsGeoJson,
      features: alertsGeoJson.features.filter((feature) => feature.geometry != null),
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
      style: alertStyle,
      zIndex: 700,
    })

    alertsLayerRef.current = layer
    map.addLayer(layer)
  }, [activeLayers.alerts, alertsGeoJson])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (spcLayerRef.current) {
      map.removeLayer(spcLayerRef.current)
      spcLayerRef.current = null
    }

    if (!activeLayers.spc || !spcGeoJson?.features?.length) return

    const filtered = {
      ...spcGeoJson,
      features: spcGeoJson.features.filter((feature) => feature.geometry != null),
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
      style: spcStyle,
      zIndex: 650,
    })

    spcLayerRef.current = layer
    map.addLayer(layer)
  }, [activeLayers.spc, spcGeoJson])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (stormReportsLayerRef.current) {
      map.removeLayer(stormReportsLayerRef.current)
      stormReportsLayerRef.current = null
    }

    if (!activeLayers.stormReports || !stormReports.length) return

    const source = new VectorSource()
    for (const report of stormReports) {
      if (report.lat == null || report.lon == null) continue
      source.addFeature(new Feature({
        geometry: new Point(fromLonLat([report.lon, report.lat])),
        category: report.category,
        label: `${report.category.toUpperCase()} · ${report.size}`,
        location: report.location,
        state: report.state,
        comments: report.comments,
        date: report.date,
        time: report.time,
      }))
    }

    if (source.isEmpty()) return

    const layer = new VectorLayer({
      source,
      style: stormReportStyle,
      zIndex: 750,
    })

    stormReportsLayerRef.current = layer
    map.addLayer(layer)
  }, [activeLayers.stormReports, stormReports])

  // Initialize provider-selected radar layer.
  useEffect(() => {
    if (!mapInstanceRef.current || !radarProvider || !activeLayers.precipitation || timestamps.length === 0) {
      // Remove radar layer if it exists
      if (radarLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(radarLayerRef.current)
        radarLayerRef.current = null
        radarSourceRef.current = null
      }
      return
    }

    const map = mapInstanceRef.current

    // Remove existing radar layer if any
    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current)
    }

    // Reset fade-in state for new layer (fixes Cursor BugBot issue)
    setRadarVisible(false)

    const latestFrame = radarFrames[radarFrames.length - 1]
    let radarSource: TileWMS | XYZ | null = null

    if (radarProvider.protocol === 'wms' && radarProvider.wms) {
      radarSource = new TileWMS({
        url: radarProvider.wms.url,
        params: radarProvider.wms.params,
        serverType: radarProvider.wms.serverType,
        transition: TILE_TRANSITION_MS, // Smooth cross-fade between frames
        crossOrigin: 'anonymous',
      })
    } else if (radarProvider.protocol === 'xyz' && latestFrame) {
      const initialUrl = buildRadarXyzUrl(radarProvider, latestFrame)
      if (initialUrl) {
        radarSource = new XYZ({
          url: initialUrl,
          crossOrigin: 'anonymous',
          transition: TILE_TRANSITION_MS,
        })
      }
    }

    if (!radarSource) {
      setMetadataError('Radar provider is missing a usable tile source.')
      return
    }

    // Track loading state - use a counter to handle concurrent tile loads
    let loadingTileCount = 0
    let initialLoadComplete = false

    radarSource.on('tileloadstart', () => {
      loadingTileCount++
      // Only show loading indicator when not playing (to avoid button flicker)
      if (!isPlayingRef.current && loadingTileCount === 1) {
        setIsLoading(true)
      }
    })

    radarSource.on('tileloadend', () => {
      loadingTileCount = Math.max(0, loadingTileCount - 1)
      if (loadingTileCount === 0) {
        setIsLoading(false)
        // Trigger fade-in on first complete load
        if (!initialLoadComplete) {
          initialLoadComplete = true
          setRadarVisible(true)
        }
      }
    })

    radarSource.on('tileloaderror', () => {
      loadingTileCount = Math.max(0, loadingTileCount - 1)
      if (loadingTileCount === 0) {
        setIsLoading(false)
      }
      tileErrorCountRef.current += 1
      console.warn('[radar-map] Tile load error', {
        provider: radarProvider.id,
        count: tileErrorCountRef.current,
      })
      if (tileErrorCountRef.current >= TILE_ERROR_FALLBACK_THRESHOLD) {
        activateFallbackProvider()
      }
    })

    const radarLayer = new TileLayer({
      source: radarSource,
      opacity: opacityRef.current,
      zIndex: 500,
    })

    radarLayer.set('name', `${radarProvider.id}-radar`)
    map.addLayer(radarLayer)

    radarLayerRef.current = radarLayer
    radarSourceRef.current = radarSource

    // Apply the current timeline frame when the radar layer is created.
    if (radarFrames.length > 0) {
      const currentIndex = Math.min(
        Math.max(frameIndexRef.current, 0),
        radarFrames.length - 1,
      )
      const currentFrame = radarFrames[currentIndex]
      if (radarProvider.protocol === 'wms' && radarProvider.wms && 'updateParams' in radarSource) {
        radarSource.updateParams({ [radarProvider.wms.timeParam]: currentFrame.isoTime })
      } else if (radarProvider.protocol === 'xyz' && 'setUrl' in radarSource) {
        const nextUrl = buildRadarXyzUrl(radarProvider, currentFrame)
        if (nextUrl) radarSource.setUrl(nextUrl)
      }
    }

    return () => {
      if (radarLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(radarLayerRef.current)
        radarLayerRef.current = null
        radarSourceRef.current = null
      }
    }
  }, [radarProvider, activeLayers.precipitation, radarFrames, timestamps.length, activateFallbackProvider])

  // Update opacity when it changes
  useEffect(() => {
    opacityRef.current = opacity
    if (radarLayerRef.current) {
      radarLayerRef.current.setOpacity(opacity)
    }
  }, [opacity])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    frameIndexRef.current = frameIndex
  }, [frameIndex])

  // Update provider frame when timeline changes.
  useEffect(() => {
    if (!radarSourceRef.current || !radarProvider || radarFrames.length === 0) return

    const currentFrame = radarFrames[frameIndex]
    if (!currentFrame) return

    const source = radarSourceRef.current

    if (radarProvider.protocol === 'wms' && radarProvider.wms && 'updateParams' in source) {
      source.updateParams({ [radarProvider.wms.timeParam]: currentFrame.isoTime })
      return
    }

    if (radarProvider.protocol === 'xyz' && 'setUrl' in source) {
      const nextUrl = buildRadarXyzUrl(radarProvider, currentFrame)
      if (nextUrl) source.setUrl(nextUrl)
    }
  }, [frameIndex, radarFrames, radarProvider])

  // Clear preload cache when location changes (fixes CodeRabbit memory leak issue)
  useEffect(() => {
    preloadCacheRef.current.clear()
  }, [latitude, longitude])

  // Preload upcoming frames for smoother playback
  const preloadFrame = useCallback((index: number) => {
    const frame = radarFrames[index]
    if (!frame || !radarProvider || !radarSourceRef.current || !mapInstanceRef.current) return
    
    // Limit cache size to prevent memory bloat (fixes CodeRabbit issue)
    if (preloadCacheRef.current.size > 100) {
      preloadCacheRef.current.clear()
    }
    
    const cacheKey = `${radarProvider.id}:${frame.isoTime}`
    
    if (preloadCacheRef.current.has(cacheKey)) return
    preloadCacheRef.current.add(cacheKey)
    
    // Get current map extent for more effective preloading
    const view = mapInstanceRef.current.getView()
    const size = mapInstanceRef.current.getSize()
    let bbox = '-10000000,4000000,-9000000,5000000' // Default fallback
    
    if (size) {
      try {
        const extent = view.calculateExtent(size)
        bbox = extent.join(',')
      } catch {
        // Use fallback bbox if extent calculation fails
      }
    }
    
    let preloadUrl: string | null = null
    if (radarProvider.protocol === 'wms' && radarProvider.wms) {
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        WIDTH: '256',
        HEIGHT: '256',
        BBOX: bbox,
        ...radarProvider.wms.params,
        [radarProvider.wms.timeParam]: frame.isoTime,
      })
      const version = radarProvider.wms.params.VERSION
      params.set(version === '1.1.1' ? 'SRS' : 'CRS', 'EPSG:3857')
      preloadUrl = `${radarProvider.wms.url}?${params.toString()}`
    } else if (radarProvider.protocol === 'xyz') {
      preloadUrl = buildRadarXyzUrl(radarProvider, frame)
        ?.replace('{z}', '5')
        .replace('{x}', '9')
        .replace('{y}', '12') ?? null
    }

    if (!preloadUrl) return

    // Create a hidden image to preload the tile
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = preloadUrl
  }, [radarFrames, radarProvider])

  // Keep shareable URL state in sync with map controls.
  const syncRadarUrlState = useCallback(() => {
    if (!radarStateReady || activeFrames.length === 0) return

    if (urlSyncTimerRef.current) {
      window.clearTimeout(urlSyncTimerRef.current)
    }

    urlSyncTimerRef.current = window.setTimeout(() => {
      const liveIndex = Math.max(0, activeFrames.length - 1)
      const frameForUrl = isPlayingRef.current ? liveIndex : frameIndex
      const currentZoom = mapInstanceRef.current?.getView().getZoom() ?? null
      const radarParams = serializeRadarUrlParams({
        layers: {
          precipitation: activeLayers.precipitation,
          alerts: activeLayers.alerts,
          spc: activeLayers.spc,
          stormReports: activeLayers.stormReports,
        },
        frameIndex: frameForUrl,
        zoom: currentZoom,
        frameCount: activeFrames.length,
      })
      const merged = mergeRadarUrlParams(new URLSearchParams(window.location.search), radarParams)
      const nextQuery = merged.toString()
      const currentQuery = window.location.search.replace(/^\?/, '')
      if (nextQuery !== currentQuery) {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
      }
    }, URL_SYNC_DEBOUNCE_MS)
  }, [
    activeFrames.length,
    activeLayers.alerts,
    activeLayers.precipitation,
    activeLayers.spc,
    activeLayers.stormReports,
    frameIndex,
    pathname,
    radarStateReady,
    router,
  ])

  useEffect(() => {
    syncRadarUrlState()
  }, [syncRadarUrlState])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const view = map.getView()
    const handleZoomChange = () => syncRadarUrlState()
    view.on('change:resolution', handleZoomChange)
    return () => view.un('change:resolution', handleZoomChange)
  }, [syncRadarUrlState, radarProvider])

  useEffect(() => {
    return () => {
      if (urlSyncTimerRef.current) {
        window.clearTimeout(urlSyncTimerRef.current)
      }
    }
  }, [])

  // Animation playback with preloading
  useEffect(() => {
    if (!isPlaying || timestamps.length === 0) return

    const interval = BASE_ANIMATION_INTERVAL_MS / speed

    const handle = window.setInterval(() => {
      setFrameIndex((idx) => {
        const nextIdx = (idx + 1) % timestamps.length
        
        // Preload upcoming frames during playback
        for (let i = 1; i <= PRELOAD_FRAMES_AHEAD; i++) {
          const preloadIdx = (nextIdx + i) % timestamps.length
          preloadFrame(preloadIdx)
        }
        
        return nextIdx
      })
    }, interval)

    timerRef.current = handle as unknown as number

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isPlaying, speed, timestamps.length, preloadFrame])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasRadarProvider || !activeLayers.precipitation) return

      // Don't intercept keys when user is typing in an input field
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying(prev => !prev)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setIsPlaying(false)
        setFrameIndex(prev => Math.max(0, prev - 1))
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setIsPlaying(false)
        setFrameIndex(prev => Math.min(timestamps.length - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasRadarProvider, activeLayers.precipitation, timestamps.length])

  const currentTime = timestamps[frameIndex]
  const humanTime = currentTime ? new Date(currentTime).toUTCString().replace(' GMT', '') : ''

  // Check if current frame is the most recent (LIVE)
  const isLiveFrame = frameIndex === timestamps.length - 1

  // Calculate relative time for better UX
  const relativeTime = useMemo(() => {
    if (!currentTime) return ''
    const now = Date.now()
    const diff = currentTime - now
    const diffMinutes = Math.round(diff / 60000)

    // Within 3 minutes of now = LIVE
    if (Math.abs(diffMinutes) < 3) return 'LIVE'

    // Past frames
    if (diffMinutes < 0) {
      const absDiff = Math.abs(diffMinutes)
      const hours = Math.floor(absDiff / 60)
      const mins = absDiff % 60
      if (hours > 0) return `${hours}h ${mins}m ago`
      return `${mins}m ago`
    }

    // Future frames (shouldn't happen with current config)
    return humanTime
  }, [currentTime, humanTime])

  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'nord':
        return { container: 'shadow-lg shadow-blue-500/20', badge: 'bg-slate-700/90 text-white' }
      default:
        return { container: 'shadow-lg', badge: 'bg-gray-800/90 text-white' }
    }
  }, [theme])

  // Handler for play/pause with loading feedback
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // Jump to start
  const handleSkipToStart = useCallback(() => {
    setIsPlaying(false)
    setFrameIndex(0)
  }, [])

  // Jump to end (live)
  const handleSkipToEnd = useCallback(() => {
    setIsPlaying(false)
    setFrameIndex(Math.max(0, timestamps.length - 1))
  }, [timestamps.length])

  const isFullPage = displayMode === 'full-page'

  return (
    <div
      data-radar-container
      className={`flex w-full flex-col gap-2 rounded-lg sm:flex-row ${isFullPage ? 'h-full min-h-0' : ''} ${themeStyles.container}`}
      style={isFullPage ? undefined : { height: '100%', minHeight: '350px' }}
    >
      {/* Main Map Area */}
      <div className={`relative flex-1 overflow-visible ${isFullPage ? 'min-h-0 h-full' : 'min-h-[350px]'}`}>
      {/* Map Container - explicit dimensions for production */}
      <div
        ref={mapRef}
        className={`w-full bg-gray-900 rounded-lg overflow-hidden ${isFullPage ? 'h-full' : ''}`}
        style={{ zIndex: 1, position: 'relative', ...(isFullPage ? {} : { height: '100%', minHeight: '350px' }) }}
      />

      {/* Loading Indicator - Skeleton placeholder with shimmer effect */}
      {isLoading && !isPlaying && (
        <div className="absolute inset-0 z-[1999] pointer-events-none">
          {/* Semi-transparent overlay with shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-shimmer" 
               style={{ backgroundSize: '200% 100%' }} />
          {/* Loading badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/95 text-cyan-400 rounded-md font-mono text-xs shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="animate-pulse">LOADING RADAR DATA</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Radar fade-in overlay - stays in DOM and animates opacity (fixes Bugbot transition issue) */}
      {hasRadarProvider && activeLayers.precipitation && (
        <div 
          className={`absolute inset-0 bg-gray-900 z-[1998] transition-opacity duration-500 pointer-events-none ${radarVisible ? 'opacity-0' : 'opacity-100'}`}
        />
      )}

      {selectedOverlay && (
        <div
          className="absolute z-[2100] max-w-sm rounded-md border border-cyan-500/40 bg-gray-950/95 p-3 text-xs font-mono text-white shadow-xl backdrop-blur-sm"
          style={{
            left: selectedOverlay.x + 12,
            top: selectedOverlay.y + 12,
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedOverlay(null)}
            className="absolute right-2 top-1 text-gray-400 hover:text-white"
            aria-label="Close radar feature details"
          >
            x
          </button>
          <p className="mb-1 pr-5 text-sm font-bold text-cyan-300">{selectedOverlay.title}</p>
          <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{selectedOverlay.body}</p>
        </div>
      )}

      {/* Status Badge */}
      <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-md font-mono text-xs font-bold z-[2000] ${themeStyles.badge}`}>
        {radarProvider ? (
          <span>
            {usingFallbackProvider ? 'FALLBACK ' : ''}
            {isPlaying ? 'PLAYING' : isLiveFrame ? 'LIVE' : 'HISTORY'} {radarProvider.shortName} RADAR • {Math.round(radarProvider.pastMinutes / 60)}H HISTORY
            {metadataUpdatedAt ? ` • UPDATED ${metadataUpdatedAt}` : ''}
          </span>
        ) : (
          <span>{metadataError ?? 'RADAR METADATA LOADING'}</span>
        )}
      </div>

      {radarProvider && (
        <div className="absolute bottom-3 right-3 z-[1900] max-w-[70vw] rounded bg-gray-950/80 px-2 py-1 text-right font-mono text-[9px] uppercase tracking-wide text-gray-300 backdrop-blur-sm max-sm:bottom-16">
          Source: {radarProvider.attribution}
        </div>
      )}

      {/* Layer Controls */}
      <div className="absolute top-4 right-4 z-[2000]">
        <button
          onClick={() => setLayerMenuOpen(!layerMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/90 text-white rounded-md font-mono text-xs font-bold hover:bg-gray-700 transition-colors shadow-xl backdrop-blur-sm"
        >
          <Layers className="w-4 h-4" />
          LAYERS
          <ChevronDown className={`w-4 h-4 transition-transform ${layerMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {layerMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900/95 rounded-md overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="p-2 border-b border-gray-600 font-mono text-xs font-bold text-white">
              RADAR LAYERS
            </div>
            <button
              onClick={() => setActiveLayers(prev => ({ ...prev, precipitation: !prev.precipitation }))}
              className={`w-full px-3 py-2 text-left font-mono text-xs hover:bg-gray-700 transition-colors ${activeLayers.precipitation ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300'
                }`}
            >
              {activeLayers.precipitation ? '✓' : '○'} Precipitation {radarProvider ? `(${radarProvider.shortName})` : ''}
            </button>

            <button
              onClick={() => setActiveLayers(prev => ({ ...prev, alerts: !prev.alerts }))}
              className={`w-full px-3 py-2 text-left font-mono text-xs hover:bg-gray-700 transition-colors ${activeLayers.alerts ? 'bg-red-600/30 text-red-300' : 'text-gray-300'
                }`}
            >
              {activeLayers.alerts ? '✓' : '○'} NWS Alerts ({alertsGeoJson?.features?.length ?? 0})
            </button>

            <button
              onClick={() => setActiveLayers(prev => ({ ...prev, spc: !prev.spc }))}
              className={`w-full px-3 py-2 text-left font-mono text-xs hover:bg-gray-700 transition-colors ${activeLayers.spc ? 'bg-yellow-600/30 text-yellow-300' : 'text-gray-300'
                }`}
            >
              {activeLayers.spc ? '✓' : '○'} SPC Outlook ({spcGeoJson?.features?.length ?? 0})
            </button>

            <button
              onClick={() => setActiveLayers(prev => ({ ...prev, stormReports: !prev.stormReports }))}
              className={`w-full px-3 py-2 text-left font-mono text-xs hover:bg-gray-700 transition-colors ${activeLayers.stormReports ? 'bg-purple-600/30 text-purple-300' : 'text-gray-300'
                }`}
            >
              {activeLayers.stormReports ? '✓' : '○'} Storm Reports ({stormReports.length})
            </button>

            {/* Opacity slider */}
            {activeLayers.precipitation && (
              <div className="px-3 py-2 border-t border-gray-600">
                <div className="font-mono text-xs text-gray-400 mb-1">OPACITY: {Math.round(opacity * 100)}%</div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Animation Controls - Position varies by display mode: top for full-page, bottom for widget */}
      {hasRadarProvider && activeLayers.precipitation && timestamps.length > 0 && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto ${
            displayMode === 'widget' ? 'bottom-2 gap-1' : 'bottom-4 gap-2'
          }`}
          style={{ zIndex: 2000 }}
        >
          {/* Compact Controls Bar - smaller in widget mode */}
          <div className={`flex max-w-[92vw] flex-wrap items-center justify-center bg-gray-900/95 rounded-md border-2 border-cyan-500 shadow-2xl backdrop-blur-sm ${
            displayMode === 'widget' ? 'gap-1 px-2 py-1' : 'gap-2 px-3 py-2'
          }`}>
            <button
              onClick={handleSkipToStart}
              className={`bg-gray-700 border border-gray-500 rounded text-white hover:bg-gray-600 transition-colors ${
                displayMode === 'widget' ? 'px-1 py-0.5' : 'px-2 py-1.5 border-2'
              }`}
              title="Go to start (4 hours ago)"
            >
              <SkipBack className={displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'} />
            </button>

            <button
              onClick={handlePlayPause}
              className={`border rounded text-white font-mono font-bold transition-colors ${
                displayMode === 'widget'
                  ? 'px-2 py-0.5 text-[10px] min-w-[60px] border'
                  : 'px-4 py-1.5 text-xs min-w-[90px] border-2'
              } ${isPlaying
                ? 'bg-yellow-600 border-yellow-400 hover:bg-yellow-500'
                : 'bg-cyan-600 border-cyan-400 hover:bg-cyan-500'
                }`}
            >
              {isPlaying ? (
                <><Pause className={`inline mr-0.5 ${displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'}`} /> PAUSE</>
              ) : (
                <><Play className={`inline mr-0.5 ${displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'}`} /> PLAY</>
              )}
            </button>

            <button
              onClick={handleSkipToEnd}
              className={`bg-gray-700 border border-gray-500 rounded text-white hover:bg-gray-600 transition-colors ${
                displayMode === 'widget' ? 'px-1 py-0.5' : 'px-2 py-1.5 border-2'
              }`}
              title="Go to end (now)"
            >
              <SkipForward className={displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'} />
            </button>

            {/* Speed Controls */}
            <div className={`flex border-l border-gray-600 ${
              displayMode === 'widget' ? 'gap-0.5 ml-0.5 pl-1' : 'gap-1 ml-1 border-l-2 pl-2'
            }`}>
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s as 0.5 | 1 | 2)}
                  className={`border rounded font-mono font-bold transition-colors ${
                    displayMode === 'widget'
                      ? 'px-1 py-0.5 text-[10px] border'
                      : 'px-2 py-1 text-xs border-2'
                  } ${speed === s
                    ? 'bg-cyan-600 border-cyan-400 text-white'
                    : 'bg-gray-700 border-gray-500 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Time Display */}
            <div className={`border-l border-gray-600 text-center ${
              displayMode === 'widget' ? 'ml-1 pl-1 min-w-[50px]' : 'ml-2 border-l-2 pl-2 min-w-[80px]'
            }`}>
              <span className={`font-mono font-bold ${
                displayMode === 'widget' ? 'text-[10px]' : 'text-xs'
              } ${isLiveFrame ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                {relativeTime}
              </span>
            </div>
          </div>

          {/* Timeline Slider with Enhanced Progress */}
          {/* Safe progress calculation: when only 1 frame, maxIndex=0 and progress=100% (fixes Bugbot mismatch) */}
          {(() => {
            const maxIndex = timestamps.length - 1
            // Progress: if only 1 frame (maxIndex=0), show 100%; otherwise calculate based on frameIndex
            const progress = maxIndex > 0 ? (frameIndex / maxIndex) * 100 : 100
            return (
          <div className={`max-w-[90vw] bg-gray-900/95 rounded-md shadow-xl backdrop-blur-sm ${
            displayMode === 'widget' ? 'w-[280px] px-2 py-1' : 'w-[500px] px-3 py-2'
          }`}>
            {/* Progress bar background */}
            <div className={`relative bg-gray-800 rounded-full overflow-hidden border border-gray-700 ${
              displayMode === 'widget' ? 'h-2' : 'h-3'
            }`}>
              {/* Animated progress fill */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
              {/* Tick marks for time intervals */}
              <div className="absolute inset-0 flex justify-between px-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-px h-full bg-gray-600/50" />
                ))}
              </div>
              {/* Slider input overlaid - clamp max to at least 0 */}
              <input
                type="range"
                min="0"
                max={Math.max(0, maxIndex)}
                value={Math.min(frameIndex, Math.max(0, maxIndex))}
                onChange={(e) => {
                  setIsPlaying(false)
                  setFrameIndex(parseInt(e.target.value))
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              {/* Custom thumb indicator */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 bg-white border-2 border-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 pointer-events-none transition-all duration-150 ease-out ${
                  displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'
                }`}
                style={{ left: `calc(${progress}% - ${displayMode === 'widget' ? '6px' : '8px'})` }}
              />
            </div>
            {/* Time labels */}
            <div className={`flex justify-between items-center font-mono ${
              displayMode === 'widget' ? 'mt-0.5 text-[8px]' : 'mt-1.5 text-[10px]'
            }`}>
              <span className="text-gray-500">-4h</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Frame</span>
                <span className="text-cyan-400 font-bold">{frameIndex + 1}</span>
                <span className="text-gray-500">/ {timestamps.length}</span>
              </div>
              <span className={isLiveFrame ? 'text-red-400 font-bold animate-pulse' : 'text-gray-500'}>
                {isLiveFrame ? 'LIVE' : 'NOW'}
              </span>
            </div>
          </div>
            )
          })()}
        </div>
      )}

      {/* Metadata error message */}
      {!hasRadarProvider && activeLayers.precipitation && metadataError && (
        <div className="absolute inset-0 flex items-center justify-center z-[2000] pointer-events-none">
          <div className="bg-gray-800/95 rounded-lg p-6 max-w-md text-center shadow-xl">
            <div className="text-2xl font-mono font-bold text-white mb-2">
              RADAR UNAVAILABLE
            </div>
            <div className="text-sm text-gray-300 mb-4">
              {metadataError}
            </div>
            <div className="text-xs text-gray-400">
              Current conditions and forecasts are still available.
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Radar Reflectivity Legend - Right Side, Outside Map */}
      {hasRadarProvider && activeLayers.precipitation && radarVisible && (
        <div className="flex-shrink-0 self-center max-sm:absolute max-sm:bottom-3 max-sm:left-3 max-sm:z-[2000]">
          <div className="bg-gray-900/95 rounded-md p-1.5 backdrop-blur-sm shadow-xl">
            <div className="font-mono text-[8px] text-gray-400 mb-1 uppercase tracking-wide text-center">
              dBZ
            </div>
            <div className="flex flex-col gap-0.5">
              {radarMetadata?.legend.map((item) => (
                <div key={item.value} className="flex items-center gap-1">
                  <div
                    className="w-3 h-2.5 rounded-sm border border-gray-700"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-mono text-[8px] text-gray-300 whitespace-nowrap">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeatherMapOpenLayers
