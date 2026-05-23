'use client'
// Build: v7.1 - Phase 1 radar (Iowa NEXRAD US primary, RainViewer intl, live refresh)

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Layers, ChevronDown, Loader2, Info } from 'lucide-react'
import { isInMRMSCoverage } from '@/lib/utils/location-utils'
import { ThemeType } from '@/lib/theme-config'
import {
  BASE_ANIMATION_INTERVAL_MS,
  CARTO_DARK_MATTER_URL,
  INTL_RADAR_SOURCE_ID,
  IOWA_NEXRAD_LAYER,
  IOWA_NEXRAD_WMS_URL,
  PRELOAD_FRAMES_AHEAD,
  US_RADAR_SOURCE_ID,
  RADAR_LEGEND,
  RADAR_REFRESH_MS,
  RAINVIEWER_MAPS_API,
  STORM_WATCH_FRAMES,
  TILE_TRANSITION_MS,
} from '@/lib/radar/radar-config'
import {
  buildRadarTimestamps,
  minutesSinceFrame,
  stormWatchStartIndex,
} from '@/lib/radar/radar-timestamps'
import { rainViewerTileUrl, type RainViewerMapsResponse } from '@/lib/radar/rainviewer-types'

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
import { Style, Icon } from 'ol/style'

interface WeatherMapProps {
  latitude?: number
  longitude?: number
  locationName?: string
  theme?: ThemeType
  displayMode?: 'full-page' | 'widget'
}

const WeatherMapOpenLayers = ({
  latitude,
  longitude,
  theme = 'nord',
  displayMode = 'full-page',
}: WeatherMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const radarLayerRef = useRef<TileLayer<TileWMS | XYZ> | null>(null)
  const radarSourceRef = useRef<TileWMS | XYZ | null>(null)

  const [precipitationOn, setPrecipitationOn] = useState(true)
  const [opacity, setOpacity] = useState(0.85)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const [showNightTip, setShowNightTip] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [radarVisible, setRadarVisible] = useState(false)
  const timerRef = useRef<number | null>(null)
  const preloadCacheRef = useRef<Set<string>>(new Set())

  const [isMounted, setIsMounted] = useState(false)
  const [clockTick, setClockTick] = useState(0)
  const [tileError, setTileError] = useState<string | null>(null)
  const [rainViewerData, setRainViewerData] = useState<RainViewerMapsResponse | null>(null)
  const [rainViewerLoading, setRainViewerLoading] = useState(false)
  const [rainViewerFailed, setRainViewerFailed] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setClockTick(Date.now())
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const refreshClock = () => setClockTick(Date.now())
    const intervalId = window.setInterval(refreshClock, RADAR_REFRESH_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshClock()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isMounted])

  const isUSLocation = useMemo(() => {
    if (!latitude || !longitude) return false
    return isInMRMSCoverage(latitude, longitude)
  }, [latitude, longitude])

  const usTimestamps = useMemo(() => {
    if (!isUSLocation || !isMounted || clockTick === 0) return []
    return buildRadarTimestamps({ nowMs: clockTick })
  }, [isUSLocation, isMounted, clockTick])

  useEffect(() => {
    if (isUSLocation || !isMounted) {
      setRainViewerData(null)
      setRainViewerFailed(false)
      return
    }

    let cancelled = false
    setRainViewerLoading(true)
    setRainViewerFailed(false)

    fetch(RAINVIEWER_MAPS_API)
      .then(async (res) => {
        if (!res.ok) throw new Error('RainViewer metadata failed')
        return res.json() as Promise<RainViewerMapsResponse>
      })
      .then((data) => {
        if (cancelled) return
        if (!data?.past?.length) {
          setRainViewerFailed(true)
          setRainViewerData(null)
          return
        }
        setRainViewerData(data)
        setFrameIndex(data.past.length - 1)
      })
      .catch(() => {
        if (!cancelled) {
          setRainViewerFailed(true)
          setRainViewerData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setRainViewerLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isUSLocation, isMounted, clockTick])

  const intlTimestamps = useMemo(
    () => rainViewerData?.past.map((frame) => frame.time * 1000) ?? [],
    [rainViewerData]
  )

  const activeTimestamps = isUSLocation ? usTimestamps : intlTimestamps
  const hasRadarAnimation = activeTimestamps.length > 0

  const wasLiveRef = useRef(true)
  useEffect(() => {
    wasLiveRef.current =
      activeTimestamps.length > 0 && frameIndex >= activeTimestamps.length - 1
  }, [frameIndex, activeTimestamps.length])

  useEffect(() => {
    if (wasLiveRef.current && activeTimestamps.length > 0) {
      setFrameIndex(activeTimestamps.length - 1)
    }
  }, [activeTimestamps])

  useEffect(() => {
    setTileError(null)
    preloadCacheRef.current.clear()
  }, [latitude, longitude])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const centerLon = longitude || -98.5795
    const centerLat = latitude || 39.8283

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: CARTO_DARK_MATTER_URL,
        attributions:
          '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        crossOrigin: 'anonymous',
      }),
      opacity: 0.9,
    })

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat([centerLon, centerLat]),
        zoom: 10,
      }),
    })

    mapInstanceRef.current = map

    const updateMapSize = () => mapInstanceRef.current?.updateSize()
    setTimeout(updateMapSize, 0)
    setTimeout(updateMapSize, 100)
    setTimeout(updateMapSize, 500)

    const resizeObserver = new ResizeObserver(updateMapSize)
    if (mapRef.current) resizeObserver.observe(mapRef.current)
    window.addEventListener('resize', updateMapSize)

    return () => {
      window.removeEventListener('resize', updateMapSize)
      resizeObserver.disconnect()
      map.setTarget(undefined)
      map.dispose()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return
    mapInstanceRef.current.getView().setCenter(fromLonLat([longitude, latitude]))
    mapInstanceRef.current.getView().setZoom(10)
  }, [latitude, longitude])

  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return

    const map = mapInstanceRef.current
    const existingMarker = map.getLayers().getArray().find((layer) => layer.get('name') === 'marker')
    if (existingMarker) map.removeLayer(existingMarker)

    const pulseMarkerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
        <style>
          @keyframes pulse { 0%, 100% { opacity: 0.4; r: 18; } 50% { opacity: 0; r: 24; } }
          .pulse-ring { animation: pulse 2s ease-out infinite; }
        </style>
        <circle class="pulse-ring" cx="24" cy="20" r="18" fill="none" stroke="#00d4ff" stroke-width="2"/>
        <circle class="pulse-ring" cx="24" cy="20" r="14" fill="none" stroke="#00d4ff" stroke-width="1" style="animation-delay: 0.5s"/>
        <path d="M33 20c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#00d4ff" stroke="#000" stroke-width="2"/>
        <circle cx="24" cy="20" r="3" fill="#000"/>
      </svg>
    `

    const markerLayer = new VectorLayer({
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new Point(fromLonLat([longitude, latitude])),
          }),
        ],
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
    if (!map || !precipitationOn || !hasRadarAnimation) {
      if (radarLayerRef.current && map) {
        map.removeLayer(radarLayerRef.current)
        radarLayerRef.current = null
        radarSourceRef.current = null
      }
      return
    }

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current)
      radarLayerRef.current = null
      radarSourceRef.current = null
    }

    setRadarVisible(false)

    let loadingTileCount = 0
    let initialLoadComplete = false
    let tileErrorCount = 0

    const attachLoadHandlers = (source: TileWMS | XYZ) => {
      source.on('tileloadstart', () => {
        loadingTileCount++
        if (!isPlaying && loadingTileCount === 1) setIsLoading(true)
      })
      source.on('tileloadend', () => {
        loadingTileCount = Math.max(0, loadingTileCount - 1)
        if (loadingTileCount === 0) {
          setIsLoading(false)
          if (!initialLoadComplete) {
            initialLoadComplete = true
            setRadarVisible(true)
          }
          if (tileErrorCount > 0) {
            tileErrorCount = 0
            setTileError(null)
          }
        }
      })
      source.on('tileloaderror', () => {
        loadingTileCount = Math.max(0, loadingTileCount - 1)
        if (loadingTileCount === 0) setIsLoading(false)
        tileErrorCount++
        if (tileErrorCount >= 8) {
          setTileError('Some radar tiles failed to load — try refreshing or zooming in.')
        }
      })
    }

    if (isUSLocation) {
      const radarSource = new TileWMS({
        url: IOWA_NEXRAD_WMS_URL,
        params: {
          LAYERS: IOWA_NEXRAD_LAYER,
          FORMAT: 'image/png',
          TRANSPARENT: 'true',
          VERSION: '1.1.1',
        },
        serverType: 'mapserver',
        transition: TILE_TRANSITION_MS,
        crossOrigin: 'anonymous',
      })

      attachLoadHandlers(radarSource)

      const radarLayer = new TileLayer({
        source: radarSource,
        opacity,
        zIndex: 500,
      })
      radarLayer.set('name', 'us-radar')
      map.addLayer(radarLayer)
      radarLayerRef.current = radarLayer
      radarSourceRef.current = radarSource

      if (activeTimestamps.length > 0) {
        const liveIndex = activeTimestamps.length - 1
        radarSource.updateParams({ TIME: new Date(activeTimestamps[liveIndex]).toISOString() })
        setFrameIndex(liveIndex)
      }
    } else if (rainViewerData) {
      const frame = rainViewerData.past[Math.min(frameIndex, rainViewerData.past.length - 1)]
      const radarSource = new XYZ({
        crossOrigin: 'anonymous',
        maxZoom: 12,
        tileUrlFunction: (tileCoord) => {
          const z = tileCoord[0]
          const x = tileCoord[1]
          const y = tileCoord[2]
          return rainViewerTileUrl(rainViewerData.host, frame.path, z, x, y)
        },
      })

      attachLoadHandlers(radarSource)

      const radarLayer = new TileLayer({
        source: radarSource,
        opacity,
        zIndex: 500,
      })
      radarLayer.set('name', 'intl-radar')
      map.addLayer(radarLayer)
      radarLayerRef.current = radarLayer
      radarSourceRef.current = radarSource
    }

    return () => {
      if (radarLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(radarLayerRef.current)
        radarLayerRef.current = null
        radarSourceRef.current = null
      }
    }
    // Intentionally omit frameIndex/isPlaying — TIME/URL updates happen in a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- provider swap + data availability only
  }, [
    isUSLocation,
    precipitationOn,
    hasRadarAnimation,
    rainViewerData,
    activeTimestamps.length,
    opacity,
  ])

  useEffect(() => {
    if (!radarLayerRef.current) return
    radarLayerRef.current.setOpacity(opacity)
  }, [opacity])

  useEffect(() => {
    if (!radarSourceRef.current || activeTimestamps.length === 0) return

    const currentTimestamp = activeTimestamps[frameIndex]
    if (!currentTimestamp) return

    if (isUSLocation) {
      const wms = radarSourceRef.current as TileWMS
      wms.updateParams({ TIME: new Date(currentTimestamp).toISOString() })
      return
    }

    if (!rainViewerData) return
    const xyz = radarSourceRef.current as XYZ
    const frame = rainViewerData.past[frameIndex]
    if (!frame) return

    xyz.setTileUrlFunction((tileCoord) => {
      const z = tileCoord[0]
      const x = tileCoord[1]
      const y = tileCoord[2]
      return rainViewerTileUrl(rainViewerData.host, frame.path, z, x, y)
    })
    xyz.refresh()
  }, [frameIndex, activeTimestamps, isUSLocation, rainViewerData])

  useEffect(() => {
    preloadCacheRef.current.clear()
  }, [latitude, longitude])

  const preloadFrame = useCallback(
    (index: number) => {
      if (!activeTimestamps[index] || !mapInstanceRef.current || !isUSLocation) return

      if (preloadCacheRef.current.size > 100) preloadCacheRef.current.clear()

      const timeISO = new Date(activeTimestamps[index]).toISOString()
      if (preloadCacheRef.current.has(timeISO)) return
      preloadCacheRef.current.add(timeISO)

      const view = mapInstanceRef.current.getView()
      const size = mapInstanceRef.current.getSize()
      let bbox = '-10000000,4000000,-9000000,5000000'
      if (size) {
        try {
          bbox = view.calculateExtent(size).join(',')
        } catch {
          // use fallback bbox
        }
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = `${IOWA_NEXRAD_WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${IOWA_NEXRAD_LAYER}&TIME=${encodeURIComponent(timeISO)}&FORMAT=image/png&TRANSPARENT=true&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX=${bbox}`
    },
    [activeTimestamps, isUSLocation]
  )

  useEffect(() => {
    if (!isPlaying || activeTimestamps.length === 0) return

    const interval = BASE_ANIMATION_INTERVAL_MS / speed
    const handle = window.setInterval(() => {
      setFrameIndex((idx) => {
        const nextIdx = (idx + 1) % activeTimestamps.length
        for (let i = 1; i <= PRELOAD_FRAMES_AHEAD; i++) {
          preloadFrame((nextIdx + i) % activeTimestamps.length)
        }
        return nextIdx
      })
    }, interval)

    timerRef.current = handle as unknown as number
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [isPlaying, speed, activeTimestamps.length, preloadFrame])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasRadarAnimation || !precipitationOn) return
      const active = document.activeElement as HTMLElement | null
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return

      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setIsPlaying(false)
        setFrameIndex((prev) => Math.max(0, prev - 1))
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setIsPlaying(false)
        setFrameIndex((prev) => Math.min(activeTimestamps.length - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasRadarAnimation, precipitationOn, activeTimestamps.length])

  const latestTimestamp = activeTimestamps[activeTimestamps.length - 1]
  const currentTime = activeTimestamps[frameIndex]
  const isLiveFrame = frameIndex === activeTimestamps.length - 1
  const dataAgeMinutes = latestTimestamp ? minutesSinceFrame(latestTimestamp, clockTick || Date.now()) : 0

  const relativeTime = useMemo(() => {
    if (!currentTime) return ''
    const diffMinutes = Math.round((currentTime - (clockTick || Date.now())) / 60_000)

    if (isLiveFrame) {
      if (dataAgeMinutes <= 1) return 'LIVE'
      return `LIVE · ${dataAgeMinutes}m old`
    }

    if (diffMinutes < 0) {
      const absDiff = Math.abs(diffMinutes)
      const hours = Math.floor(absDiff / 60)
      const mins = absDiff % 60
      if (hours > 0) return `${hours}h ${mins}m ago`
      return `${mins}m ago`
    }

    return new Date(currentTime).toUTCString().replace(' GMT', '')
  }, [currentTime, clockTick, isLiveFrame, dataAgeMinutes])

  const providerLabel = isUSLocation
    ? 'NEXRAD'
    : rainViewerData
      ? 'RAINVIEWER'
      : 'RADAR'

  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'nord':
        return { container: 'shadow-lg shadow-blue-500/20', badge: 'bg-slate-700/90 text-white' }
      default:
        return { container: 'shadow-lg', badge: 'bg-gray-800/90 text-white' }
    }
  }, [theme])

  const handlePlayPause = useCallback(() => setIsPlaying((prev) => !prev), [])

  const handleSkipToStart = useCallback(() => {
    setIsPlaying(false)
    setFrameIndex(0)
  }, [])

  const handleSkipToEnd = useCallback(() => {
    setIsPlaying(false)
    setFrameIndex(Math.max(0, activeTimestamps.length - 1))
  }, [activeTimestamps.length])

  const handlePlayLastTwoHours = useCallback(() => {
    const start = stormWatchStartIndex(activeTimestamps.length, STORM_WATCH_FRAMES)
    setFrameIndex(start)
    setIsPlaying(true)
  }, [activeTimestamps.length])

  const showRadarOverlay = precipitationOn && (isUSLocation || !!rainViewerData)
  const showUnavailable = precipitationOn && !isUSLocation && !rainViewerData && !rainViewerLoading

  return (
    <div
      data-radar-container
      data-radar-us-source={isUSLocation ? US_RADAR_SOURCE_ID : undefined}
      data-radar-intl-source={!isUSLocation && rainViewerData ? INTL_RADAR_SOURCE_ID : undefined}
      className={`flex gap-2 w-full rounded-lg ${themeStyles.container}`}
      style={{ height: '100%', minHeight: '350px' }}
    >
      <div className="relative flex-1 overflow-visible">
        <div
          ref={mapRef}
          className="w-full bg-gray-900 rounded-lg overflow-hidden"
          style={{ zIndex: 1, height: '100%', minHeight: '350px', position: 'relative' }}
        />

        {isLoading && !isPlaying && (
          <div className="absolute inset-0 z-[1999] pointer-events-none">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/95 text-cyan-400 rounded-md font-mono text-xs shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">LOADING RADAR DATA</span>
              </div>
            </div>
          </div>
        )}

        {showRadarOverlay && (
          <div
            className={`absolute inset-0 bg-gray-900 z-[1998] transition-opacity duration-500 pointer-events-none ${radarVisible ? 'opacity-0' : 'opacity-100'}`}
          />
        )}

        {tileError && (
          <div className="absolute top-14 left-4 right-4 z-[2001] pointer-events-none">
            <div className="bg-amber-900/90 text-amber-100 px-3 py-2 rounded-md font-mono text-xs border border-amber-600">
              {tileError}
            </div>
          </div>
        )}

        <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-md font-mono text-xs font-bold z-[2000] ${themeStyles.badge}`}>
          {hasRadarAnimation ? (
            <span>
              {isPlaying ? '▶️' : isLiveFrame ? '🔴' : '🎬'} {providerLabel} • 4 HR HISTORY
              {isLiveFrame && dataAgeMinutes > 0 ? ` • updated ${dataAgeMinutes}m ago` : ''}
            </span>
          ) : rainViewerLoading ? (
            <span>Loading global radar…</span>
          ) : showUnavailable ? (
            <span>Radar unavailable for this region</span>
          ) : (
            <span>Set a location to view radar</span>
          )}
        </div>

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
            <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900/95 rounded-md overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="p-2 border-b border-gray-600 font-mono text-xs font-bold text-white">RADAR</div>
              <button
                onClick={() => setPrecipitationOn((prev) => !prev)}
                className={`w-full px-3 py-2 text-left font-mono text-xs hover:bg-gray-700 transition-colors ${
                  precipitationOn ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300'
                }`}
              >
                {precipitationOn ? '✓' : '○'} Precipitation reflectivity
              </button>
              {precipitationOn && (
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
              <div className="px-3 py-2 border-t border-gray-600 text-[10px] text-gray-400 font-mono leading-snug">
                US: Iowa State NEXRAD composite
                <br />
                Intl:{' '}
                <a href="https://www.rainviewer.com/" className="text-cyan-400 underline" target="_blank" rel="noopener noreferrer">
                  RainViewer
                </a>
              </div>
            </div>
          )}
        </div>

        {hasRadarAnimation && precipitationOn && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto ${
              displayMode === 'widget' ? 'bottom-2 gap-1' : 'top-16 gap-2'
            }`}
            style={{ zIndex: 2000 }}
          >
            <div
              className={`flex items-center bg-gray-900/95 rounded-md border-2 border-cyan-500 shadow-2xl backdrop-blur-sm ${
                displayMode === 'widget' ? 'gap-1 px-2 py-1 flex-wrap justify-center' : 'gap-2 px-3 py-2'
              }`}
            >
              <button
                onClick={handleSkipToStart}
                className={`bg-gray-700 border border-gray-500 rounded text-white hover:bg-gray-600 transition-colors ${
                  displayMode === 'widget' ? 'px-1 py-0.5' : 'px-2 py-1.5 border-2'
                }`}
                title="Go to start"
              >
                <SkipBack className={displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'} />
              </button>

              <button
                onClick={handlePlayLastTwoHours}
                className={`bg-gray-700 border border-gray-500 rounded text-cyan-300 hover:bg-gray-600 transition-colors font-mono font-bold ${
                  displayMode === 'widget' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px] border-2'
                }`}
                title="Play last 2 hours"
              >
                LAST 2H
              </button>

              <button
                onClick={handlePlayPause}
                className={`border rounded text-white font-mono font-bold transition-colors ${
                  displayMode === 'widget'
                    ? 'px-2 py-0.5 text-[10px] min-w-[60px] border'
                    : 'px-4 py-1.5 text-xs min-w-[90px] border-2'
                } ${isPlaying ? 'bg-yellow-600 border-yellow-400 hover:bg-yellow-500' : 'bg-cyan-600 border-cyan-400 hover:bg-cyan-500'}`}
              >
                {isPlaying ? (
                  <>
                    <Pause className={`inline mr-0.5 ${displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'}`} /> PAUSE
                  </>
                ) : (
                  <>
                    <Play className={`inline mr-0.5 ${displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'}`} /> PLAY
                  </>
                )}
              </button>

              <button
                onClick={handleSkipToEnd}
                className={`bg-gray-700 border border-gray-500 rounded text-white hover:bg-gray-600 transition-colors ${
                  displayMode === 'widget' ? 'px-1 py-0.5' : 'px-2 py-1.5 border-2'
                }`}
                title="Go to live frame"
              >
                <SkipForward className={displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'} />
              </button>

              <div
                className={`flex border-l border-gray-600 ${
                  displayMode === 'widget' ? 'gap-0.5 ml-0.5 pl-1' : 'gap-1 ml-1 border-l-2 pl-2'
                }`}
              >
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s as 0.5 | 1 | 2)}
                    className={`border rounded font-mono font-bold transition-colors ${
                      displayMode === 'widget' ? 'px-1 py-0.5 text-[10px] border' : 'px-2 py-1 text-xs border-2'
                    } ${speed === s ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-gray-700 border-gray-500 text-gray-300 hover:bg-gray-600'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <div
                className={`border-l border-gray-600 text-center ${
                  displayMode === 'widget' ? 'ml-1 pl-1 min-w-[50px]' : 'ml-2 border-l-2 pl-2 min-w-[80px]'
                }`}
              >
                <span
                  className={`font-mono font-bold ${
                    displayMode === 'widget' ? 'text-[10px]' : 'text-xs'
                  } ${isLiveFrame ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}
                >
                  {relativeTime}
                </span>
              </div>
            </div>

            {(() => {
              const maxIndex = activeTimestamps.length - 1
              const progress = maxIndex > 0 ? (frameIndex / maxIndex) * 100 : 100
              return (
                <div
                  className={`max-w-[90vw] bg-gray-900/95 rounded-md shadow-xl backdrop-blur-sm ${
                    displayMode === 'widget' ? 'w-[280px] px-2 py-1' : 'w-[500px] px-3 py-2'
                  }`}
                >
                  <div
                    className={`relative bg-gray-800 rounded-full overflow-hidden border border-gray-700 ${
                      displayMode === 'widget' ? 'h-2' : 'h-3'
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, maxIndex)}
                      value={Math.min(frameIndex, Math.max(0, maxIndex))}
                      onChange={(e) => {
                        setIsPlaying(false)
                        setFrameIndex(parseInt(e.target.value, 10))
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 bg-white border-2 border-cyan-400 rounded-full shadow-lg pointer-events-none ${
                        displayMode === 'widget' ? 'w-3 h-3' : 'w-4 h-4'
                      }`}
                      style={{ left: `calc(${progress}% - ${displayMode === 'widget' ? '6px' : '8px'})` }}
                    />
                  </div>
                  <div
                    className={`flex justify-between items-center font-mono ${
                      displayMode === 'widget' ? 'mt-0.5 text-[8px]' : 'mt-1.5 text-[10px]'
                    }`}
                  >
                    <span className="text-gray-500">-4h</span>
                    <span className="text-gray-400">
                      Frame {frameIndex + 1}/{activeTimestamps.length}
                    </span>
                    <span className={isLiveFrame ? 'text-red-400 font-bold animate-pulse' : 'text-gray-500'}>
                      {isLiveFrame ? 'LIVE' : 'SCRUB'}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {showUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center z-[2000] pointer-events-none">
            <div className="bg-gray-800/95 rounded-lg p-6 max-w-md text-center shadow-xl">
              <div className="text-2xl font-mono font-bold text-white mb-2">RADAR UNAVAILABLE</div>
              <div className="text-sm text-gray-300 mb-4">
                No RainViewer feed for this area right now. Forecast data is still available above.
              </div>
              {rainViewerFailed && (
                <div className="text-xs text-amber-300 font-mono">RainViewer metadata could not be loaded.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {showRadarOverlay && radarVisible && (
        <div className="flex-shrink-0 self-center">
          <div className="bg-gray-900/95 rounded-md p-1.5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-mono text-[8px] text-gray-400 uppercase tracking-wide">dBZ</span>
              <button
                type="button"
                onClick={() => setShowNightTip((v) => !v)}
                className="text-gray-400 hover:text-cyan-300"
                title="About night-time radar artifacts"
              >
                <Info className="w-3 h-3" />
              </button>
            </div>
            {showNightTip && (
              <p className="font-mono text-[8px] text-gray-400 mb-1 max-w-[88px] leading-snug">
                Reflectivity can show non-storm echoes at night (birds, clutter, AP).
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {RADAR_LEGEND.map((item) => (
                <div key={item.dbz} className="flex items-center gap-1">
                  <div
                    className="w-3 h-2.5 rounded-sm border border-gray-700"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-mono text-[8px] text-gray-300 whitespace-nowrap">{item.dbz}</span>
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
