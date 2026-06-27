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

import { useCallback, useState, useEffect, useRef } from "react"
import PageWrapper from "@/components/page-wrapper"
import EducationBreadcrumb from "@/components/education/education-breadcrumb"
import EducationBackLink from "@/components/education/education-back-link"
import { TrendingUp, TrendingDown, MapPin, RefreshCw, Thermometer } from "lucide-react"
import type { ExtremesData, LocationTemperature } from "@/lib/extremes/extremes-data"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// Client-side cache management
const CACHE_KEY = '16bit-weather-extremes-cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
type Coordinates = { lat: number; lon: number }

function getExtremesCacheKey(coords: Coordinates | null): string {
  if (!coords) return `${CACHE_KEY}:global`
  return `${CACHE_KEY}:${coords.lat.toFixed(3)},${coords.lon.toFixed(3)}`
}

function getCachedExtremesClient(cacheKey: string): ExtremesData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - data.lastUpdated;

    if (age > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

function setCachedExtremesClient(cacheKey: string, data: ExtremesData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
}

export default function ExtremesPage() {
  const [data, setData] = useState<ExtremesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<LocationTemperature | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchAbortRef = useRef<AbortController | null>(null)

  const handleLocationClick = (location: LocationTemperature) => {
    setSelectedLocation(location)
  }

  // Fetch extremes data (abort in-flight request when a newer one starts — geolocation vs initial load)
  const fetchData = useCallback(async (skipCache = false, coords: Coordinates | null = null) => {
    fetchAbortRef.current?.abort()
    const controller = new AbortController()
    fetchAbortRef.current = controller
    const cacheKey = getExtremesCacheKey(coords)

    try {
      // Check client-side cache first
      if (!skipCache) {
        const cached = getCachedExtremesClient(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true)
      setError(null)

      let url = '/api/extremes'
      if (coords) {
        url += `?lat=${coords.lat}&lon=${coords.lon}`
      }

      const response = await fetch(url, { signal: controller.signal })
      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to fetch extreme temperatures')
      }

      if (controller.signal.aborted) return

      setData(responseData)
      setCachedExtremesClient(cacheKey, responseData) // Cache on client side
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error('Error fetching extremes:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  // Get user location
  const getUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }

  // Initial fetch + request browser location (second fetch runs when userCoords is set)
  useEffect(() => {
    getUserLocation()
    void fetchData(false, null)
    return () => {
      fetchAbortRef.current?.abort()
    }
  }, [fetchData])

  // Re-fetch when user coords change
  useEffect(() => {
    if (userCoords) {
      fetchData(true, userCoords) // Skip cache when user location changes
    }
  }, [fetchData, userCoords])

  // Auto-refresh every 30 minutes
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchData(true, userCoords) // Skip cache for refresh
      }, 30 * 60 * 1000) // 30 minutes
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, fetchData, userCoords])

  // Thermometer visualization component with theme colors
  const ThermometerViz = ({ temp, max = 140, min = -100 }: { temp: number; max?: number; min?: number }) => {
    const percentage = ((temp - min) / (max - min)) * 100
    const isHot = temp > 32

    return (
      <div className="relative h-48 w-12 mx-auto">
        {/* Thermometer tube */}
        <div className="absolute inset-0 bg-weather-bg-elev rounded-full border-2 border-weather-border">
          {/* Mercury fill - using theme colors */}
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-1000 ${isHot
              ? 'bg-gradient-to-t from-weather-danger via-weather-warn to-weather-warn'
              : 'bg-gradient-to-t from-weather-primary via-weather-primary to-cyan-300'
              }`}
            style={{ height: `${Math.max(5, Math.min(95, percentage))}%` }}
          />
        </div>
        {/* Bulb */}
        <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full ${isHot ? 'bg-weather-danger' : 'bg-weather-primary'
          } border-2 border-weather-border`}>
          <div className="flex items-center justify-center h-full text-weather-bg font-bold text-xs">
            {temp}°
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && !data) {
    return (
      <PageWrapper>
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8">
          <div className="text-center mb-8 space-y-4">
            <Skeleton className="h-12 w-3/4 max-w-lg mx-auto" />
            <Skeleton className="h-4 w-1/2 max-w-md mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-[500px] w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </PageWrapper>
    )
  }

  // Error state
  if (error) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-destructive">
            <div className="text-xl font-mono uppercase tracking-wider mb-4">
              ERROR: {error}
            </div>
            <Button
              onClick={() => fetchData(true)}
              variant="destructive"
              className="font-mono uppercase tracking-wider"
            >
              RETRY
            </Button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!data) return null

  return (
    <PageWrapper>
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <EducationBreadcrumb
          items={[
            { label: 'Education', href: '/education' },
            { label: 'Extremes' },
          ]}
        />
        <EducationBackLink />
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold mb-2 text-weather-primary glow">
            🌍 PLANET EXTREMES 🌡️
          </h1>
          <div className="text-sm sm:text-base text-weather-text font-mono uppercase tracking-wider">
            GLOBAL TEMPERATURE CHAMPIONS • LIVE DATA
          </div>
          <div className="text-xs mt-2 text-weather-muted opacity-75">
            Last Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </div>
        </div>

        {/* Main Extremes Display */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Hottest Place */}
          <Card
            className="container-primary hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
            onClick={() => data.hottest && handleLocationClick(data.hottest)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-mono font-bold text-orange-500 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                HOTTEST ON EARTH
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.hottest && (
                <>
                  <div className="mb-6 mt-2">
                    <ThermometerViz temp={data.hottest.temp} />
                  </div>

                  <div className="text-4xl font-mono font-bold mb-4 text-orange-500 text-center">
                    {data.hottest.temp}°F <span className="text-2xl text-muted-foreground">/ {data.hottest.tempC}°C</span>
                  </div>

                  <div className="text-xl font-mono mb-4 text-center font-bold">
                    {data.hottest.emoji} {data.hottest.name}, {data.hottest.country}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                    <div className="bg-muted/50 p-2 rounded text-center">
                      <div className="font-bold">Condition</div>
                      {data.hottest.condition}
                    </div>
                    <div className="bg-muted/50 p-2 rounded text-center">
                      <div className="font-bold">Wind/Hum</div>
                      {data.hottest.windSpeed}mph / {data.hottest.humidity}%
                    </div>
                  </div>

                  {data.hottest.fact && (
                    <div className="text-xs text-muted-foreground italic mt-3 p-3 card-inner rounded bg-muted/30">
                      💡 {data.hottest.fact}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Coldest Place */}
          <Card
            className="container-primary hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
            onClick={() => data.coldest && handleLocationClick(data.coldest)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-mono font-bold text-terminal-weather-cold flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                COLDEST ON EARTH
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.coldest && (
                <>
                  <div className="mb-6 mt-2">
                    <ThermometerViz temp={data.coldest.temp} />
                  </div>

                  <div className="text-4xl font-mono font-bold mb-4 text-terminal-weather-cold text-center">
                    {data.coldest.temp}°F <span className="text-2xl text-muted-foreground">/ {data.coldest.tempC}°C</span>
                  </div>

                  <div className="text-xl font-mono mb-4 text-center font-bold">
                    {data.coldest.emoji} {data.coldest.name}, {data.coldest.country}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                    <div className="bg-muted/50 p-2 rounded text-center">
                      <div className="font-bold">Condition</div>
                      {data.coldest.condition}
                    </div>
                    <div className="bg-muted/50 p-2 rounded text-center">
                      <div className="font-bold">Wind/Hum</div>
                      {data.coldest.windSpeed}mph / {data.coldest.humidity}%
                    </div>
                  </div>

                  {data.coldest.fact && (
                    <div className="text-xs text-muted-foreground italic mt-3 p-3 card-inner rounded bg-muted/30">
                      💡 {data.coldest.fact}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Temperature Leaderboards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Top 5 Hottest */}
          <Card className="container-primary">
            <CardHeader>
              <CardTitle className="text-lg font-mono font-bold text-orange-500">
                🏆 TOP 5 HOTTEST
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topHot.map((loc, index) => (
                  <div
                    key={index}
                    onClick={() => handleLocationClick(loc)}
                    className="flex items-center justify-between p-3 card-inner rounded hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">#{index + 1}</Badge>
                      <span className="font-medium">
                        {loc.emoji} {loc.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-orange-500">
                      {loc.temp}°F
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Coldest */}
          <Card className="container-primary">
            <CardHeader>
              <CardTitle className="text-lg font-mono font-bold text-terminal-weather-cold">
                🏆 TOP 5 COLDEST
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topCold.map((loc, index) => (
                  <div
                    key={index}
                    onClick={() => handleLocationClick(loc)}
                    className="flex items-center justify-between p-3 card-inner rounded hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">#{index + 1}</Badge>
                      <span className="font-medium">
                        {loc.emoji} {loc.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-terminal-weather-cold">
                      {loc.temp}°F
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Location Ranking */}
        {data.userLocation && (
          <Card className="container-primary mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-mono font-bold flex items-center">
                <MapPin className="inline mr-2 text-primary" />
                YOUR LOCATION RANKING
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-mono font-bold mb-2 text-primary">
                  {data.userLocation.temp}°F / {data.userLocation.tempC}°C
                </div>
                <div className="text-lg text-muted-foreground">
                  Global Rank: #{data.userLocation.globalRank} of {data.userLocation.totalLocations}
                </div>
                <div className="text-sm text-muted-foreground mt-2 italic">
                  {data.userLocation.globalRank && data.userLocation.globalRank <= 5 && "🔥 You're in one of the hottest places!"}
                  {data.userLocation.globalRank && data.userLocation.globalRank > data.userLocation.totalLocations - 5 && "🧊 You're in one of the coldest places!"}
                  {data.userLocation.globalRank &&
                    data.userLocation.globalRank > 5 &&
                    data.userLocation.globalRank <= data.userLocation.totalLocations - 5 &&
                    "😎 You're in the comfortable middle!"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Temperature Difference */}
        {data.hottest && data.coldest && (
          <Card className="container-primary text-center bg-muted/20">
            <CardHeader>
              <CardTitle className="text-lg font-mono font-bold text-muted-foreground">
                🌡️ GLOBAL TEMPERATURE SPREAD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-mono font-bold text-foreground">
                {Math.abs(data.hottest.temp - data.coldest.temp)}°F
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Difference between hottest and coldest places on Earth right now
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            onClick={() => fetchData(true)}
            disabled={loading}
            variant="outline"
            size="lg"
            className="font-mono uppercase tracking-wider flex items-center gap-2 border-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </Button>

          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="lg"
            className="font-mono uppercase tracking-wider border-2"
          >
            AUTO-REFRESH: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>

        {/* ASCII Art Footer */}
        <div className="text-center mt-12 text-weather-muted opacity-50">
          <pre className="text-xs inline-block font-mono">
            {`     .-.     .-.     .-.     .-.     .-.     .-.
   .'   '._..'   '._..'   '._..'   '._..'   '._..'
   :     HOT     COLD     HOT     COLD     HOT   :
   '.   .'   '.   .'   '.   .'   '.   .'   '.   .'
     '-'     '-'     '-'     '-'     '-'     '-'`}
          </pre>
        </div>

        {/* Location Details Modal */}
        {selectedLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="bg-weather-bg-elev w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg container-primary shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-mono font-bold text-primary flex items-center gap-3">
                      <span className="text-4xl">{selectedLocation.emoji}</span>
                      {selectedLocation.name}
                    </h2>
                    <div className="text-muted-foreground font-mono uppercase tracking-wider mt-1">
                      {selectedLocation.country} • {Math.round(selectedLocation.lat * 10) / 10}°N, {Math.round(selectedLocation.lon * 10) / 10}°E
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedLocation(null)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-weather-text uppercase mb-2 border-b border-weather-border/50 pb-1">
                        Current Conditions
                      </h3>
                      <div className="text-4xl font-mono font-bold text-weather-primary mb-2">
                        {selectedLocation.temp}°F <span className="text-xl text-weather-muted">/ {selectedLocation.tempC}°C</span>
                      </div>
                      <div className="space-y-1 text-sm font-mono text-weather-text">
                        <div>Condition: {selectedLocation.condition}</div>
                        <div>Humidity: {selectedLocation.humidity}%</div>
                        <div>Wind: {selectedLocation.windSpeed} mph</div>
                      </div>
                    </div>

                    {selectedLocation.description && (
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-weather-text uppercase mb-2 border-b border-weather-border/50 pb-1">
                          About
                        </h3>
                        <p className="text-sm text-weather-text leading-relaxed">
                          {selectedLocation.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {selectedLocation.climateType && (
                      <div>
                        <h3 className="text-sm font-bold text-weather-text uppercase mb-2 border-b border-weather-border/50 pb-1">
                          Climate Profile
                        </h3>
                        <div className="inline-block px-3 py-1 rounded-full bg-weather-primary/20 text-weather-primary text-xs font-bold font-mono border border-weather-primary/50">
                          {selectedLocation.climateType}
                        </div>
                      </div>
                    )}

                    {(selectedLocation.bestTime || selectedLocation.travelTip) && (
                      <div>
                        <h3 className="text-sm font-bold text-weather-text uppercase mb-2 border-b border-weather-border/50 pb-1">
                          Travel Intel
                        </h3>
                        {selectedLocation.bestTime && (
                          <div className="mb-2 text-sm">
                            <span className="font-bold text-weather-primary">Best Time:</span> {selectedLocation.bestTime}
                          </div>
                        )}
                        {selectedLocation.travelTip && (
                          <div className="text-sm italic text-weather-muted p-2 bg-weather-bg rounded border border-weather-border">
                            💡 Tip: {selectedLocation.travelTip}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedLocation.historicalAvg && (
                      <div>
                        <h3 className="text-sm font-bold text-weather-text uppercase mb-2 border-b border-weather-border/50 pb-1">
                          Historical Averages
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm">
                          <div className="p-2 bg-weather-warn/10 rounded border border-weather-warn/30">
                            <div className="text-xs text-weather-muted uppercase">Summer</div>
                            <div className="font-bold text-weather-warn">{selectedLocation.historicalAvg.summer}°F</div>
                          </div>
                          <div className="p-2 bg-weather-primary/10 rounded border border-weather-primary/30">
                            <div className="text-xs text-weather-muted uppercase">Winter</div>
                            <div className="font-bold text-weather-primary">{selectedLocation.historicalAvg.winter}°F</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t text-center">
                  <Button
                    onClick={() => setSelectedLocation(null)}
                    size="lg"
                    className="font-mono uppercase tracking-wider"
                  >
                    Close Intel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
