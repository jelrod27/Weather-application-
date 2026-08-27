'use client'

import type { RefObject } from 'react'
import type { ThemeType } from '@/lib/theme-config'
import type { RadarFrame, RadarMetadata, RadarPreset, RadarShareLayerState, RadarTilePreferences } from '@/lib/radar'
import { formatLocationTime } from '@/lib/format-location-time'
import { useRadarMapEngine } from '@/hooks/useRadarMapEngine'
import type { RadarFeatureCollection, RadarStormReport } from '@/hooks/useRadarOverlayLoader'
import { useRadarOverlayLoader } from '@/hooks/useRadarOverlayLoader'
import { useRadarUrlSnapshot, useRadarUrlState } from '@/hooks/useRadarUrlState'

export interface UseRadarControllerProps {
  latitude?: number
  longitude?: number
  locationName?: string
  /** IANA timezone for location-local "updated" labels. */
  timeZone?: string
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

export type UseRadarControllerResult = {
  mapRef: RefObject<HTMLDivElement | null>
  isFullPage: boolean
  isWidget: boolean
  tilePreferences: RadarTilePreferences
  locationName?: string
  onLocationSearch?: (location: string) => void
  searchError?: string
  shareConfig?: {
    title: string
    text: string
    url: string
  }
  metadata: RadarMetadata | null
  frames: RadarFrame[]
  metadataError: string | null
  updatedLabel: string | null
  statusClass: string
  activeLayers: RadarShareLayerState
  layerSheetOpen: boolean
  setLayerSheetOpen: (open: boolean) => void
  opacity: number
  setOpacity: (opacity: number) => void
  setTilePreferences: (preferences: RadarTilePreferences) => void
  alertsGeoJson: RadarFeatureCollection | null
  spcGeoJson: RadarFeatureCollection | null
  stormReports: RadarStormReport[]
  inspector: { title: string; body: string; link?: string | null } | null
  setInspector: (inspector: { title: string; body: string; link?: string | null } | null) => void
  activePreset: RadarPreset
  frameIndex: number
  isPlaying: boolean
  isLiveFrame: boolean
  relativeTime: string
  speed: 0.5 | 1 | 2
  setSpeed: (speed: 0.5 | 1 | 2) => void
  handleLayersChange: (layers: RadarShareLayerState) => void
  handlePresetChange: (preset: RadarPreset) => void
  handlePlayPause: () => void
  handleSkipToStart: () => void
  handleSkipToEnd: () => void
  handleFrameChange: (index: number) => void
  handleLiveTap: () => void
}

export function useRadarController({
  latitude,
  longitude,
  locationName,
  timeZone,
  theme: _theme = 'nord',
  displayMode = 'full-page',
  onLocationSearch,
  searchError,
  shareConfig,
}: UseRadarControllerProps): UseRadarControllerResult {
  const isFullPage = displayMode === 'full-page'
  const isWidget = displayMode === 'widget'

  const parsedUrlStateRef = useRadarUrlSnapshot()

  const map = useRadarMapEngine({
    latitude,
    longitude,
    parsedUrlStateRef,
  })

  const overlay = useRadarOverlayLoader({
    latitude,
    longitude,
    isFullPage,
    isWidget,
    parsedUrlStateRef,
    mapInstanceRef: map.mapInstanceRef,
    radarLayerRef: map.radarLayerRef,
    coverageLayerRef: map.coverageLayerRef,
  })

  const url = useRadarUrlState({
    isFullPage,
    metadata: overlay.metadata,
    frames: overlay.frames,
    activeLayers: overlay.activeLayers,
    tilePreferences: overlay.tilePreferences,
    mapInstanceRef: map.mapInstanceRef,
    frameIndex: overlay.frameIndex,
    setFrameIndex: overlay.setFrameIndex,
    isPlaying: overlay.isPlaying,
    setIsPlaying: overlay.setIsPlaying,
    frameIndexRef: overlay.frameIndexRef,
  })

  const currentFrame = overlay.frames[overlay.frameIndex]
  const isLiveFrame = currentFrame?.isLive ?? false
  const updatedLabel = overlay.metadata?.generatedAt
    ? formatLocationTime(overlay.metadata.generatedAt, timeZone)
    : null
  const statusClass = getFreshnessClass(overlay.metadata?.generatedAt ?? null)

  return {
    mapRef: map.mapRef,
    isFullPage,
    isWidget,
    tilePreferences: overlay.tilePreferences,
    locationName,
    onLocationSearch,
    searchError,
    shareConfig,
    metadata: overlay.metadata,
    frames: overlay.frames,
    metadataError: overlay.metadataError,
    updatedLabel,
    statusClass,
    activeLayers: overlay.activeLayers,
    layerSheetOpen: overlay.layerSheetOpen,
    setLayerSheetOpen: overlay.setLayerSheetOpen,
    opacity: overlay.opacity,
    setOpacity: overlay.setOpacity,
    setTilePreferences: overlay.setTilePreferences,
    alertsGeoJson: overlay.alertsGeoJson,
    spcGeoJson: overlay.spcGeoJson,
    stormReports: overlay.stormReports,
    inspector: map.inspector,
    setInspector: map.setInspector,
    activePreset: overlay.activePreset,
    frameIndex: overlay.frameIndex,
    isPlaying: overlay.isPlaying,
    isLiveFrame,
    relativeTime: getRelativeTimeLabel(currentFrame),
    speed: url.speed,
    setSpeed: url.setSpeed,
    handleLayersChange: overlay.handleLayersChange,
    handlePresetChange: overlay.handlePresetChange,
    handlePlayPause: url.handlePlayPause,
    handleSkipToStart: url.handleSkipToStart,
    handleSkipToEnd: url.handleSkipToEnd,
    handleFrameChange: url.handleFrameChange,
    handleLiveTap: url.handleLiveTap,
  }
}
