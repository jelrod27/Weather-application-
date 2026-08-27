'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ParsedRadarUrlState, RadarFrame, RadarMetadata, RadarShareLayerState, RadarTilePreferences } from '@/lib/radar'
import { mergeRadarUrlParams, parseRadarUrlState, serializeRadarUrlParams } from '@/lib/radar'
import { BASE_ANIMATION_INTERVAL_MS, URL_SYNC_DEBOUNCE_MS } from '@/components/radar-v2/radar-constants'

import type Map from 'ol/Map'

export function useRadarUrlSnapshot(): RefObject<ParsedRadarUrlState> {
  const searchParams = useSearchParams()
  const parsedUrlStateRef = useRef(parseRadarUrlState(searchParams))
  return parsedUrlStateRef
}

export interface UseRadarUrlStateProps {
  isFullPage: boolean
  metadata: RadarMetadata | null
  frames: RadarFrame[]
  activeLayers: RadarShareLayerState
  tilePreferences: RadarTilePreferences
  mapInstanceRef: RefObject<Map | null>
  frameIndex: number
  setFrameIndex: (index: number) => void
  isPlaying: boolean
  setIsPlaying: (value: boolean | ((current: boolean) => boolean)) => void
  frameIndexRef: { current: number }
}

export interface UseRadarUrlStateResult {
  speed: 0.5 | 1 | 2
  setSpeed: (speed: 0.5 | 1 | 2) => void
  handlePlayPause: () => void
  handleSkipToStart: () => void
  handleSkipToEnd: () => void
  handleFrameChange: (index: number) => void
  handleLiveTap: () => void
}

export function useRadarUrlState({
  isFullPage,
  metadata,
  frames,
  activeLayers,
  tilePreferences,
  mapInstanceRef,
  frameIndex,
  setFrameIndex,
  isPlaying,
  setIsPlaying,
  frameIndexRef,
}: UseRadarUrlStateProps): UseRadarUrlStateResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const timerRef = useRef<number | null>(null)
  const urlSyncTimerRef = useRef<number | null>(null)
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1)

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
  }, [frames.length, isPlaying, speed, frameIndexRef, setFrameIndex])

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
  }, [activeLayers, frameIndex, frames.length, isFullPage, metadata, pathname, router, searchParams, tilePreferences, mapInstanceRef])

  const handlePlayPause = useCallback(() => {
    setIsPlaying((value) => !value)
  }, [setIsPlaying])

  const handleSkipToStart = useCallback(() => {
    setIsPlaying(false)
    setFrameIndex(0)
  }, [setIsPlaying, setFrameIndex])

  const handleSkipToEnd = useCallback(() => {
    setIsPlaying(false)
    setFrameIndex(Math.max(0, frames.length - 1))
  }, [frames.length, setIsPlaying, setFrameIndex])

  const handleFrameChange = useCallback((index: number) => {
    setIsPlaying(false)
    setFrameIndex(index)
  }, [setIsPlaying, setFrameIndex])

  const handleLiveTap = useCallback(() => {
    setIsPlaying(false)
    setFrameIndex(Math.max(0, frames.length - 1))
  }, [frames.length, setIsPlaying, setFrameIndex])

  return {
    speed,
    setSpeed,
    handlePlayPause,
    handleSkipToStart,
    handleSkipToEnd,
    handleFrameChange,
    handleLiveTap,
  }
}
