"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Shared Weather Display Component
 * Used by both the homepage and city weather pages for consistent layouts
 */

import React from "react"
import Link from 'next/link'
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MetricInfoTooltip } from "@/components/metric-info-tooltip"
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { HeroWeatherCard } from "@/components/hero-weather-card"
import { LazyForecast, LazyForecastDetails } from "@/components/lazy-weather-components"
import { AirQualityDisplay } from "@/components/air-quality-display"
import { PollenDisplay } from "@/components/pollen-display"
import LazyHourlyForecast from "@/components/lazy-hourly-forecast"
import { ResponsiveGrid } from "@/components/responsive-container"
import LazyWeatherMap from '@/components/lazy-weather-map'
import { MoonPhaseIcon } from '@/components/moon-phase-icon'
import type { WeatherData } from "@/lib/types"
import {
  getUVSeverity,
  getHumiditySeverity,
  getPressureCategory,
  getWindSeverity,
  getVisibilitySeverity,
  windDirectionToDegrees,
} from "@/lib/weather-severity"
import {
  Sun,
  Thermometer,
  Sunrise,
  Droplets,
  Gauge,
  Wind,
  CloudRain,
  Eye,
  Leaf,
  Moon,
  Navigation,
  ArrowDown,
  ArrowUp,
  Sunset,
} from "lucide-react"

interface WeatherDisplayProps {
  weather: WeatherData
  theme: string
  selectedDay: number | null
  onDayClick: (index: number) => void
  precipitation?: { rain24h: number; snow24h: number } | null
  showRadar?: boolean
}

// Card style constants
const HERO_CARD = "weather-card-enter border-0 border-l-4 border-l-primary shadow-md weather-metric-glow weather-card-gradient hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
const METRIC_CARD = "weather-metric-card group weather-card-enter border-0 border-t-2 border-t-primary/40 shadow-md weather-metric-glow weather-card-gradient hover:border-t-primary hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 min-h-[140px]"

export function WeatherDisplay({
  weather,
  theme,
  selectedDay,
  onDayClick,
  precipitation,
  showRadar = true
}: WeatherDisplayProps) {
  const themeClasses = getComponentStyles(theme as ThemeType, 'weather')

  // Compute severity values
  const uvSeverity = getUVSeverity(weather?.uvIndex ?? 0)
  const humiditySeverity = getHumiditySeverity(weather?.humidity ?? 0)
  const pressureCategory = getPressureCategory(weather?.pressure || '1013')
  const windSpeed = weather?.wind?.speed ?? 0
  const windSeverity = getWindSeverity(windSpeed)
  const windDeg = windDirectionToDegrees(weather?.wind?.direction || '')
  const visibilityMi = weather?.forecast?.[0]?.details?.visibility ?? 10
  const visibilitySeverity = getVisibilitySeverity(visibilityMi)

  const feelsLike = weather?.hourlyForecast?.[0]?.feelsLike != null
    ? Math.round(weather.hourlyForecast[0].feelsLike)
    : weather?.temperature ?? null
  const feelsLikeDelta = feelsLike != null && weather?.temperature != null
    ? Math.round((feelsLike - weather.temperature) * 10) / 10
    : 0

  const deltaWarmClass = theme === 'daybreak' ? 'text-rose-600' : 'text-rose-400'
  const deltaSameClass = theme === 'daybreak' ? 'text-emerald-700' : 'text-emerald-400'

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* 1. Hero Weather Card */}
      <HeroWeatherCard
        location={weather.location}
        temperature={weather.temperature}
        unit={weather.unit}
        condition={weather.condition}
        description={weather.description}
        highTemp={weather.forecast?.[0]?.highTemp}
        lowTemp={weather.forecast?.[0]?.lowTemp}
        feelsLike={feelsLike}
        feelsLikeDelta={feelsLikeDelta}
        humidity={weather.humidity}
        windSpeed={weather.wind?.speed}
        windUnit={weather.unit === '°C' ? 'km/h' : 'mph'}
        precipChance={weather.forecast?.[0]?.details?.precipitationChance}
        glowClass={theme === 'daybreak' ? undefined : themeClasses.glow}
      />

      {/* 2. Hourly Forecast - Always visible if data exists */}
      {weather?.hourlyForecast && weather.hourlyForecast.length > 0 && (
        <LazyHourlyForecast
          hourly={weather.hourlyForecast}
          theme={theme as ThemeType}
          tempUnit={weather.unit || '°F'}
        />
      )}

      {/* 3. Full-width 7-Day Forecast */}
      {weather?.forecast && weather.forecast.length > 0 ? (
        <LazyForecast
          forecast={weather.forecast.map((day) => ({
            ...day,
            country: weather?.country || 'US'
          }))}
          theme={(theme || 'nord') as ThemeType}
          onDayClick={onDayClick}
          selectedDay={selectedDay}
        />
      ) : (
        <div className="bg-terminal-bg-secondary p-4 rounded-lg border-0 border-terminal-border text-center">
          <p className="text-terminal-text-primary font-mono">
            No forecast data available
          </p>
        </div>
      )}

      {/* Expandable Forecast Details Section — directly below the 5-day row */}
      <LazyForecastDetails
        forecast={(weather?.forecast || []).map((day) => ({
          ...day,
          country: weather?.country || 'US'
        }))}
        theme={(theme || 'nord') as ThemeType}
        selectedDay={selectedDay}
        currentWeatherData={{
          humidity: weather?.humidity || 0,
          wind: weather?.wind || { speed: 0, direction: '', gust: null },
          pressure: weather?.pressure || '1013',
          uvIndex: weather?.uvIndex || 0,
          sunrise: weather?.sunrise || 'N/A',
          sunset: weather?.sunset || 'N/A'
        }}
      />

      {/* 4. Two-column layout: Radar (left) / AQI + Moon Phase stacked (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        {/* LEFT: Radar */}
        {showRadar && (
          <div className="space-y-3 rounded-xl dashboard-surface bg-card/40 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-terminal-text-primary">
                Weather Radar
              </h2>
              <Link
                href="/radar"
                className="px-2 py-1 border-0 rounded-md text-xs font-semibold transition-colors hover:text-primary text-muted-foreground hover:text-foreground"
              >
                VIEW FULL →
              </Link>
            </div>
            <div className="h-[350px] rounded-lg overflow-hidden ring-1 ring-[var(--border-invisible)]">
              <LazyWeatherMap
                latitude={weather?.coordinates?.lat}
                longitude={weather?.coordinates?.lon}
                locationName={weather?.location}
                theme={(theme || 'nord') as ThemeType}
                displayMode="widget"
              />
            </div>
          </div>
        )}

        {/* RIGHT: AQI + Moon Phase stacked */}
        <div className="space-y-4">
          <AirQualityDisplay
            aqi={weather.aqi}
            theme={(theme || 'nord') as ThemeType}
            pollutants={weather.pollutants}
          />

          {/* Moon Phase (compact) */}
          <Card className={cn(HERO_CARD, "relative")} style={{ animationDelay: '0ms' }}>
            <MetricInfoTooltip metricId="moon-phase" />
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className={cn("text-sm font-bold tracking-wide uppercase flex items-center gap-2", "text-terminal-text-primary")}>
                <Moon size={14} className="text-primary" />
                Moon Phase
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1 px-4 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className={cn("text-base font-semibold", themeClasses.text)}>{weather?.moonPhase?.phase || 'Unknown'}</p>
                  <p className={cn("text-xs", themeClasses.secondaryText)}>
                    {weather?.moonPhase?.illumination || 0}% illuminated
                  </p>
                  <Progress
                    value={weather?.moonPhase?.illumination || 0}
                    className="h-1.5 mt-1"
                    indicatorColor="#EBCB8B"
                  />
                  <div className="flex gap-3 mt-1">
                    <p className={cn("text-xs", themeClasses.secondaryText)}>
                      Moonset: {weather?.moonPhase?.nextMoonset || 'N/A'}
                    </p>
                    <p className={cn("text-xs", themeClasses.secondaryText)}>
                      Full: {weather?.moonPhase?.nextFullMoon || 'N/A'}
                    </p>
                  </div>
                </div>
                <MoonPhaseIcon
                  phase={weather?.moonPhase?.phase || 'new moon'}
                  illumination={weather?.moonPhase?.illumination || 0}
                  size={48}
                  className="flex-shrink-0"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Three-column grid Row A: UV Index, Feels Like, Sun Times */}
      <ResponsiveGrid cols={{ sm: 1, md: 3 }} className="gap-4">
        {/* UV Index */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '30ms' }}>
          <MetricInfoTooltip metricId="uv-index" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Sun size={14} className="text-primary group-hover:text-accent transition-colors" />
              UV Index
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {weather?.uvIndex ?? 'N/A'}
            </p>
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: uvSeverity.textColor, backgroundColor: `${uvSeverity.bgColor}20` }}
            >
              {uvSeverity.label}
            </Badge>
            <Progress
              value={uvSeverity.percentage}
              className="h-1.5 mt-3"
              indicatorColor={uvSeverity.bgColor}
            />
          </CardContent>
        </Card>

        {/* Feels Like */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '60ms' }}>
          <MetricInfoTooltip metricId="feels-like" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Thermometer size={14} className="text-primary group-hover:text-accent transition-colors" />
              Feels Like
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {feelsLike != null ? `${feelsLike}°` : 'N/A'}
            </p>
            {feelsLikeDelta !== 0 && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {feelsLikeDelta < 0 ? (
                  <ArrowDown size={14} className="text-primary" />
                ) : (
                  <ArrowUp size={14} className={deltaWarmClass} />
                )}
                <span className={cn(
                  "text-sm",
                  feelsLikeDelta < 0 ? "text-primary" : deltaWarmClass,
                )}>
                  {Math.abs(feelsLikeDelta)}° {feelsLikeDelta < 0 ? 'cooler' : 'warmer'}
                </span>
              </div>
            )}
            {feelsLikeDelta === 0 && (
              <p className={cn("text-sm mt-2", deltaSameClass)}>Same as actual</p>
            )}
          </CardContent>
        </Card>

        {/* Sun Times */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '90ms' }}>
          <MetricInfoTooltip metricId="sun-times" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Sun size={14} className="text-primary group-hover:text-accent transition-colors" />
              Sun Times
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-center flex-1">
                <Sunrise size={20} className="mx-auto mb-1 text-amber-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Rise</p>
                <p className={cn("text-lg font-bold tabular-nums", themeClasses.text)}>
                  {weather?.sunrise || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col items-center px-1">
                <div className="w-12 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-500 rounded-full" />
              </div>
              <div className="text-center flex-1">
                <Sunset size={20} className="mx-auto mb-1 text-orange-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Set</p>
                <p className={cn("text-lg font-bold tabular-nums", themeClasses.text)}>
                  {weather?.sunset || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* 6. Three-column grid Row B: Humidity, Pressure, Wind */}
      <ResponsiveGrid cols={{ sm: 1, md: 3 }} className="gap-4">
        {/* Humidity */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '120ms' }}>
          <MetricInfoTooltip metricId="humidity" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Droplets size={14} className="text-primary group-hover:text-accent transition-colors" />
              Humidity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {weather?.humidity ?? 'N/A'}%
            </p>
            <Progress
              value={weather?.humidity ?? 0}
              className="h-1.5 mt-3"
              indicatorColor={humiditySeverity.bgColor}
            />
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: humiditySeverity.textColor, backgroundColor: `${humiditySeverity.bgColor}20` }}
            >
              {humiditySeverity.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Pressure */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '150ms' }}>
          <MetricInfoTooltip metricId="pressure" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Gauge size={14} className="text-primary group-hover:text-accent transition-colors" />
              Pressure
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {weather?.pressure || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">hPa</p>
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: pressureCategory.textColor, backgroundColor: `${pressureCategory.bgColor}20` }}
            >
              {pressureCategory.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Wind */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '180ms' }}>
          <MetricInfoTooltip metricId="wind" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Wind size={14} className="text-primary group-hover:text-accent transition-colors" />
              Wind
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {windSpeed || 'N/A'} <span className="text-lg">mph</span>
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {weather?.wind?.direction && (
                <Navigation
                  size={16}
                  className="text-primary"
                  style={{ transform: `rotate(${windDeg + 180}deg)` }}
                />
              )}
              <span className={cn("text-sm", themeClasses.secondaryText)}>
                {weather?.wind?.direction || 'N/A'}
              </span>
            </div>
            {weather?.wind?.gust && (
              <p className={cn("text-xs mt-1", themeClasses.secondaryText)}>
                Gusts {weather.wind.gust} mph
              </p>
            )}
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: windSeverity.textColor, backgroundColor: `${windSeverity.bgColor}20` }}
            >
              {windSeverity.label}
            </Badge>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* 7. Three-column grid Row C: Precipitation, Visibility, Pollen */}
      <ResponsiveGrid cols={{ sm: 1, md: 3 }} className="gap-4">
        {/* Precipitation */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '210ms' }}>
          <MetricInfoTooltip metricId="precipitation" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <CloudRain size={14} className="text-primary group-hover:text-accent transition-colors" />
              Precipitation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {precipitation != null
                ? `${((precipitation.rain24h ?? 0) + (precipitation.snow24h ?? 0)).toFixed(2)}"`
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">24h Total</p>
          </CardContent>
        </Card>

        {/* Visibility */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '240ms' }}>
          <MetricInfoTooltip metricId="visibility" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Eye size={14} className="text-primary group-hover:text-accent transition-colors" />
              Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {weather?.forecast?.[0]?.details?.visibility != null
                ? `${weather.forecast[0].details.visibility}`
                : 'N/A'}
              <span className="text-lg ml-1">mi</span>
            </p>
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: visibilitySeverity.textColor, backgroundColor: `${visibilitySeverity.bgColor}20` }}
            >
              {visibilitySeverity.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Pollen */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '270ms' }}>
          <MetricInfoTooltip metricId="pollen" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Leaf size={14} className="text-primary group-hover:text-accent transition-colors" />
              Pollen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <PollenDisplay
              pollen={weather.pollen}
              theme={(theme || 'nord') as ThemeType}
              minimal={true}
              className="border-none shadow-none p-0 bg-transparent"
            />
          </CardContent>
        </Card>
      </ResponsiveGrid>
    </div>
  )
}
