"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Shared Weather Display Component
 * Used by both the homepage and city weather pages for consistent layouts
 */

import React, { useSyncExternalStore } from "react"
import Link from 'next/link'
import { Moon } from 'lucide-react'
import { getTodayForecast } from '@/lib/weather/daily-forecast'
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MetricInfoTooltip } from "@/components/metric-info-tooltip"
import { themeTokens } from '@/lib/theme-tokens'
import { WeatherJourney } from "@/components/weather-journey"
import { getWeatherJourneyLinks } from "@/lib/weather/journey"
import { ForecastBrief } from "@/components/forecast-brief"
import { HeroWeatherCard } from "@/components/hero-weather-card"
import { LazyForecast, LazyForecastDetails } from "@/components/lazy-weather-components"
import { AirQualityDisplay } from "@/components/air-quality-display"
import LazyHourlyForecast from "@/components/lazy-hourly-forecast"
import LazyWeatherMap from '@/components/lazy-weather-map'
import { MoonPhaseIcon } from '@/components/moon-phase-icon'
import { CurrentConditions } from '@/components/weather/current-conditions'
import { ForecastDiscovery } from '@/components/weather/forecast-discovery'
import { getFeelsLike } from '@/lib/weather/current-readings'
import { DEFAULT_THEME } from '@/lib/theme-config'

import type { ThemeType } from '@/lib/theme-config'
import type { WeatherData } from '@/lib/types'

interface WeatherDisplayProps {
  weather: WeatherData
  theme: string
  selectedDay: number | null
  onDayClick: (index: number) => void
  precipitation?: { rain24h: number; snow24h: number } | null
  showRadar?: boolean
}

// Match the visual breakpoint so keyboard order follows each layout, with one sidebar mounted.
const DISCOVERY_MEDIA = '(min-width: 1200px)'
function subscribeDiscoveryLayout(onChange: () => void): () => void {
  const media = window.matchMedia?.(DISCOVERY_MEDIA)
  media?.addEventListener('change', onChange)
  return () => media?.removeEventListener('change', onChange)
}
function isDesktopDiscovery(): boolean { return window.matchMedia?.(DISCOVERY_MEDIA).matches ?? false }
function serverDiscoveryLayout(): boolean { return false }

// Card style constants
const HERO_CARD = "weather-card-enter border-0 border-l-4 border-l-primary shadow-md weather-metric-glow weather-card-gradient hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"

export function WeatherDisplay({
  weather,
  theme,
  selectedDay,
  onDayClick,
  precipitation,
  showRadar = true
}: WeatherDisplayProps): React.JSX.Element {
  const desktopDiscovery = useSyncExternalStore(subscribeDiscoveryLayout, isDesktopDiscovery, serverDiscoveryLayout)
  const illumination = weather.moonPhase?.illumination
  const hasIllumination = illumination != null && Number.isFinite(illumination) && illumination >= 0 && illumination <= 100
  const hasMoonPhase = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'third quarter', 'waning crescent'].includes(weather.moonPhase?.phase?.trim().toLowerCase() ?? '')
  const themeClasses = themeTokens.weather

  const todayForecast = getTodayForecast(weather)
  const weatherLinks = getWeatherJourneyLinks(weather)
  const hourlyHref = weatherLinks.hourly

  const { feelsLike, feelsLikeDelta } = getFeelsLike(weather)

  return (
    <div className="weather-layout font-sans">
      <div className="weather-layout-journey"><WeatherJourney weather={weather} active="forecast" /></div>
      <div className="weather-layout-main space-y-5">
      <HeroWeatherCard
        compact
        location={weather.location}
        temperature={weather.temperature}
        unit={weather.unit}
        condition={weather.condition}
        description={weather.description}
        highTemp={todayForecast?.highTemp}
        lowTemp={todayForecast?.lowTemp}
        feelsLike={feelsLike}
        feelsLikeDelta={feelsLikeDelta}
        humidity={weather.humidity}
        windSpeed={weather.wind?.speed}
        windUnit={weather.unit === '°C' ? 'km/h' : 'mph'}
        precipChance={todayForecast?.details?.precipitationChance}
        glowClass={themeClasses.glow}
        timezone={weather.timezone}
      />
      <ForecastBrief weather={weather} hourlyHref={hourlyHref} />

      {/* 2. Hourly Forecast - Always visible if data exists */}
      {weather?.hourlyForecast && weather.hourlyForecast.length > 0 && (
        <LazyHourlyForecast
          hourly={weather.hourlyForecast}
          maxHours={6}
          moreHref={hourlyHref}
          theme={theme as ThemeType}
          tempUnit={weather.unit || '°F'}
          timezone={weather.timezone}
        />
      )}

      </div>
      {desktopDiscovery && <ForecastDiscovery weather={weather} />}
      <div className="weather-layout-details space-y-6">
      {/* Full available daily forecast and selected-day detail */}
      {weather?.forecast && weather.forecast.length > 0 ? (
        <LazyForecast
          tempUnit={weather.unit}
          forecast={weather.forecast.map((day) => ({
            ...day,
            country: weather?.country || 'US'
          }))}
          theme={(theme || DEFAULT_THEME) as ThemeType}
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
        tempUnit={weather?.unit}
        forecast={(weather?.forecast || []).map((day) => ({
          ...day,
          country: weather?.country || 'US'
        }))}
        theme={(theme || DEFAULT_THEME) as ThemeType}
        selectedDay={selectedDay}
      />

      <CurrentConditions weather={weather} theme={theme} precipitation={precipitation} />

      {/* 4. Two-column layout: Radar (left) / AQI + Moon Phase stacked (right) */}
      <div className={cn("grid grid-cols-1 gap-5 lg:gap-6", showRadar && "lg:grid-cols-2")}>
        {/* LEFT: Radar */}
        {showRadar && (
          <div className="space-y-3 rounded-xl dashboard-surface bg-card/40 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-terminal-text-primary">
                Weather Radar
              </h2>
              <Link
                href={weatherLinks.radar}
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
                timeZone={weather?.timezone}
                theme={(theme || DEFAULT_THEME) as ThemeType}
                displayMode="widget"
              />
            </div>
          </div>
        )}

        {/* RIGHT: AQI + Moon Phase stacked */}
        <div className="space-y-4">
          <AirQualityDisplay
            aqi={weather.aqi}
            theme={(theme || DEFAULT_THEME) as ThemeType}
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
              {!weather.moonPhase ? <p className="text-sm text-muted-foreground">Moon information unavailable</p> : <>
              {(weather.moonPhase.observingNight || weather.moonPhase.timeZone) && (
                <p className="text-xs text-muted-foreground mb-2">
                  {[weather.moonPhase.observingNight, weather.moonPhase.timeZone].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className={cn("text-base font-semibold", themeClasses.text)}>{weather?.moonPhase?.phase || 'Unknown'}</p>
                  <p className={cn("text-xs", themeClasses.secondaryText)}>
                    {hasIllumination ? `${illumination}% illuminated` : 'Illumination unavailable'}
                  </p>
                  {hasIllumination && <Progress
                    value={illumination}
                    className="h-1.5 mt-1"
                    indicatorColor="#EBCB8B"
                  />}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <p className={cn("text-xs", themeClasses.secondaryText)}>
                      Moonset: {weather?.moonPhase?.nextMoonset || 'N/A'}
                    </p>
                    <p className={cn("text-xs", themeClasses.secondaryText)}>
                      Full: {weather?.moonPhase?.nextFullMoon || 'N/A'}
                    </p>
                  </div>
                </div>
                {hasMoonPhase && hasIllumination && <MoonPhaseIcon
                  phase={weather.moonPhase.phase}
                  illumination={illumination}
                  size={48}
                  className="flex-shrink-0"
                />}
              </div>
              </>}
            </CardContent>
          </Card>
        </div>
      </div>

      </div>
      {!desktopDiscovery && <ForecastDiscovery weather={weather} />}
    </div>
  )
}
