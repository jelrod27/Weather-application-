"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 *
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */


import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { safeStorage } from '@/lib/safe-storage'

interface LocationContextType {
  locationInput: string
  currentLocation: string
  setLocationInput: (location: string) => void
  setCurrentLocation: (location: string) => void
  clearLocationState: () => void
  shouldClearOnRouteChange: boolean
  setShouldClearOnRouteChange: (should: boolean) => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

interface LocationProviderProps {
  children: ReactNode
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [locationInput, setLocationInput] = useState<string>("")
  const [currentLocation, setCurrentLocation] = useState<string>("")
  const [shouldClearOnRouteChange, setShouldClearOnRouteChange] = useState(true)
  const [lastPathname, setLastPathname] = useState<string>("")

  const pathname = usePathname()

  // Clear location state function
  const clearLocationState = useCallback(() => {
    setLocationInput("")
    setCurrentLocation("")

    // Clear only the transient "last displayed" keys. The per-location
    // weather caches and the search cache are TTL-bounded and keyed by
    // location; wiping them on a routine home<->city navigation forced a
    // full refetch of data that was still fresh.
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = [
          'bitweather_city',
          'bitweather_weather_data',
          'bitweather_cache_timestamp'
        ]

        keysToRemove.forEach(key => {
          safeStorage.removeItem(key)
        })
      } catch (error) {
        console.warn('[LocationProvider] Failed to clear location cache:', error)
      }
    }
  }, [])

  // Cleanup legacy keys on mount
  useEffect(() => {
    try {
      const legacyKey = 'weather-app-last-location'
      if (safeStorage.getItem(legacyKey) !== null) {
        safeStorage.removeItem(legacyKey)
      }
    } catch {
      // Ignore cleanup errors
    }
  }, [])

  // Route change detection and state clearing
  useEffect(() => {
    if (!pathname || pathname === lastPathname) {
      return
    }

    const isNavigatingFromCityPageToHome = lastPathname.startsWith('/weather/') && pathname === '/'
    const isNavigatingBetweenCityPages = lastPathname.startsWith('/weather/') && pathname.startsWith('/weather/') && lastPathname !== pathname
    const isNavigatingFromHomeToCityPage = lastPathname === '/' && pathname.startsWith('/weather/')
    const isNavigatingFromHomeToMap = lastPathname === '/' && pathname === '/map'

    // Always clear when navigating between different city pages or from city to home
    // DON'T clear when navigating from home to map (preserve location state)
    const shouldClear = (isNavigatingFromCityPageToHome || isNavigatingBetweenCityPages) ||
                       (shouldClearOnRouteChange && isNavigatingFromHomeToCityPage && !isNavigatingFromHomeToMap)

    if (shouldClear) {
      clearLocationState()
    }

    setLastPathname(pathname)
  }, [pathname, lastPathname, shouldClearOnRouteChange, clearLocationState])

  // Initialize last pathname on mount
  useEffect(() => {
    if (pathname && !lastPathname) {
      setLastPathname(pathname)
    }
  }, [pathname, lastPathname])

  const value: LocationContextType = {
    locationInput,
    currentLocation,
    setLocationInput,
    setCurrentLocation,
    clearLocationState,
    shouldClearOnRouteChange,
    setShouldClearOnRouteChange
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocationContext() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return context
}
