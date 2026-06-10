'use client'

/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 *
 * PERFORMANCE: This component uses intersection observer to only load
 * the OpenLayers map (~400KB) when the user scrolls to it.
 */

import { MapContainer } from './maps/map-container'
import type { ThemeType } from '@/lib/theme-config'

interface LazyWeatherMapProps {
  latitude?: number
  longitude?: number
  locationName?: string
  theme?: ThemeType | string
  defaultMode?: 'static' | 'animation'
  displayMode?: 'full-page' | 'widget'
}

export default function LazyWeatherMap({
  latitude,
  longitude,
  locationName,
  theme = 'nord',
  displayMode = 'widget'
}: LazyWeatherMapProps) {
  return (
    <MapContainer
      latitude={latitude}
      longitude={longitude}
      locationName={locationName}
      theme={theme}
      displayMode={displayMode}
    />
  )
}
