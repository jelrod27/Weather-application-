"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Shared Weather Display Component
 * Used by both the homepage and city weather pages for consistent layouts
 */

import React, { useSyncExternalStore } from "react"
import { Moon } from 'lucide-react'
import { getTodayForecast } from '@/lib/weather/daily-forecast'
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MetricInfoTooltip } from "@/components/metric-info-tooltip"
import { themeTokens } from '@/lib/theme-tokens'
import { WeatherJourney } from "@/components/weather-journey"
import { getWeatherJourneyLinks } from "@/lib/weather/journey"
import { ForecastBrief } from "@/components/forecast-brief"
import { HeroWeatherCard } from "@/components/hero-weather-card"
import { LazyForecast, LazyForecastDetails } from "@/components/lazy-weather-components"
import { AirQualityDisplay } from "@/components/air-quality-display"
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

export function WeatherDisplay({
  weather,
  theme,
  selectedDay,
  onDayClick,
  precipitation,
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
        sunrise={weather.sunrise}
        sunset={weather.sunset}
      />

      {!desktopDiscovery && <ForecastBrief weather={weather} hourlyHref={hourlyHref} />}

      </div>
      {desktopDiscovery && <ForecastDiscovery weather={weather}>
        <ForecastBrief weather={weather} hourlyHref={hourlyHref} />
      </ForecastDiscovery>}
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

      <div className="space-y-4">
        <CurrentConditions weather={weather} theme={theme} precipitation={precipitation} />

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <AirQualityDisplay
              aqi={weather.aqi}
              theme={(theme || DEFAULT_THEME) as ThemeType}
              pollutants={weather.pollutants}
            />

            {/* Moon Phase */}
            <Card className="relative flex min-w-0 flex-col border border-border bg-card shadow-sm [overflow-wrap:anywhere]">
              <MetricInfoTooltip metricId="moon-phase" />
              <CardHeader className="p-4 pb-0">
                <h2 className="flex items-center justify-center gap-1.5 text-xs font-semibold leading-none uppercase tracking-widest text-muted-foreground">
                  <Moon size={14} className="shrink-0 text-primary" aria-hidden="true" />
                  Moon Phase
                </h2>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-4">
                {!weather.moonPhase ? <p className="text-sm text-muted-foreground">Moon information unavailable</p> : <>
                <div className="flex min-h-12 items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className={cn("text-lg font-bold", themeClasses.text)}>{weather?.moonPhase?.phase || 'Unknown'}</p>
                    <p className={cn("text-xs", themeClasses.secondaryText)}>
                      {hasIllumination ? `${illumination}% illuminated` : 'Illumination unavailable'}
                    </p>
                  </div>
                  {hasMoonPhase && hasIllumination && <MoonPhaseIcon
                    phase={weather.moonPhase.phase}
                    illumination={illumination}
                    size={48}
                    className="flex-shrink-0"
                  />}
                </div>
                {hasIllumination && <Progress
                  aria-label="Moon illumination"
                  value={illumination}
                  className="h-1.5 mt-3"
                  indicatorColor="#EBCB8B"
                />}
                {(weather.moonPhase.observingNight || weather.moonPhase.timeZone) && (
                  <p className="mt-3 mb-3 text-xs text-muted-foreground">
                    {[weather.moonPhase.observingNight, weather.moonPhase.timeZone].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-auto pt-3">
                  <div className={cn("grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-2", themeClasses.secondaryText)}>
                    <p>Moonset: {weather?.moonPhase?.nextMoonset || 'N/A'}</p>
                    <p>Full: {weather?.moonPhase?.nextFullMoon || 'N/A'}</p>
                  </div>
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
