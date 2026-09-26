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
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

import { useEffect, useRef, useState } from "react"
import Link from 'next/link'
import { Droplets } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatLocationTime } from '@/lib/format-location-time'
import WeatherIconModern from "./weather-icon-modern"
import type { ThemeType } from "@/lib/theme-config"
import type { EnhancedHourlyForecast } from '@/lib/types'

export type HourlyForecastData = EnhancedHourlyForecast;

interface HourlyForecastProps {
  hourly: HourlyForecastData[];
  theme?: ThemeType; // Kept for API compat
  tempUnit?: string;
  timezone?: string;
  maxHours?: number;
  moreHref?: string;
  selectedHour?: number;
  onSelectHour?: (timestamp: number) => void;
}

export default function HourlyForecast({
  hourly,
  tempUnit = '°F',
  timezone = 'UTC',
  maxHours = 24,
  moreHref,
  selectedHour,
  onSelectHour,
}: HourlyForecastProps): React.JSX.Element | null {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  /** Client-only clock so server and client agree on first paint (no hydration mismatch for "NOW"). */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  // Auto-scroll to current hour once client time is known
  useEffect(() => {
    if (now === null || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const currentHourCard = container.querySelector('.current-hour');
    if (currentHourCard) {
      // Move only this strip; scrollIntoView also pulls the whole page past the briefing.
      container.scrollLeft += currentHourCard.getBoundingClientRect().left - container.getBoundingClientRect().left;
    }
  }, [now]);

  if (!hourly || hourly.length === 0) {
    return null;
  }

  // The forecast preview and dedicated hourly view choose their own window.
  const displayHours = hourly.slice(0, maxHours);

  return (
    <Card className="p-3 sm:p-4 lg:p-6 border-0 rounded-xl dashboard-surface backdrop-blur-md bg-card/55 animate-slide-in">
      <CardHeader className="p-0 mb-3 sm:mb-4 flex-row items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
          Your day, hour by hour
        </CardTitle>
        {moreHref && <Link href={moreHref} className="min-h-11 inline-flex items-center text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">View all hours →</Link>}
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-hidden py-4 px-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--primary)) transparent'
          }}
        >
          <div className="flex gap-3 sm:gap-4 pb-2 w-max mx-auto sm:mx-0">
            {displayHours.map((hour) => {
              const hourTime = new Date(hour.dt * 1000);
              const isCurrentHour =
                now !== null && Math.abs(hourTime.getTime() - now) < 1800000; // Within 30 min
              // City wall-clock label is already local; don't use viewer getHours().
              const isMidnight = hour.time === '12 AM';

              return (
                <HourlyCard
                  key={hour.dt}
                  hour={hour}
                  isCurrentHour={isCurrentHour}
                  isMidnight={isMidnight}
                  tempUnit={tempUnit}
                  timezone={timezone}
                  selected={selectedHour === hour.dt}
                  onSelect={onSelectHour ? () => onSelectHour(hour.dt) : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Scroll hint for mobile */}
        <div className="text-center mt-2 text-xs text-muted-foreground/90">
          ← Scroll for more hours →
        </div>
      </CardContent>
    </Card>
  );
}

function HourlyCard({
  hour,
  isCurrentHour,
  isMidnight,
  tempUnit,
  timezone,
  selected,
  onSelect,
}: {
  hour: HourlyForecastData;
  isCurrentHour: boolean;
  isMidnight: boolean;
  tempUnit: string;
  timezone: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <Card
      className={cn(
        "hourly-forecast-card flex-shrink-0 flex flex-col items-center justify-between snap-start",
        "rounded-xl p-3 sm:p-4 min-w-[84px] sm:min-w-[100px]",
        "transition-all duration-200 hover:-translate-y-0.5",
        "backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "shadow-[0_10px_28px_-14px_rgba(0,0,0,0.55)]",
        isCurrentHour
          ? "bg-primary/12 border border-primary/25 shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.28)] current-hour"
          : "bg-card/55 hover:bg-card/75 border border-[var(--border-invisible)] hover:border-[var(--border-subtle)] hover:shadow-[0_12px_32px_-14px_rgba(0,0,0,0.5)]",
        isMidnight && "border-l-0",
        selected && "ring-2 ring-primary"
      )}
    >
      {/* Time */}
      <div className={cn(
        "text-xs sm:text-sm font-bold mb-2 whitespace-nowrap text-foreground",
        isCurrentHour && "text-primary glow"
      )}>
        {isCurrentHour ? 'NOW' : hour.time}
      </div>

      {/* Day marker for midnight */}
      {isMidnight && !isCurrentHour && (
        <div className="text-xs mb-1 font-bold uppercase tracking-widest text-primary/90">
          {new Date(hour.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', timeZone: timezone })}
        </div>
      )}

      {/* Weather Icon */}
      <div className="mb-3 flex items-center justify-center filter drop-shadow-md">
        <WeatherIconModern
          condition={hour.condition}
          isNight={hour.icon?.endsWith('n')}
          size={40}
          className="hover:scale-110 transition-transform"
        />
      </div>

      {/* Temperature */}
      <div className={cn(
        "text-lg sm:text-xl font-bold mb-2 tabular-nums tracking-tight text-primary font-mono",
        isCurrentHour && "glow"
      )}>
        {hour.temp !== null && Number.isFinite(hour.temp) ? `${Math.round(hour.temp)}${tempUnit}` : <span aria-label="Temperature unavailable">—</span>}
      </div>

      {onSelect && <button type="button" aria-pressed={selected} aria-label={`Details for ${formatLocationTime(hour.dt * 1000, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' })}`} onClick={onSelect} className="my-1 min-h-11 rounded px-2 text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">Details</button>}

      {/* Stats Row */}
      <div className="flex items-center gap-3 w-full justify-center text-xs text-muted-foreground/90">
        {/* Precip */}
        <div className={cn(
          "flex items-center gap-0.5",
          hour.precipChance !== null && hour.precipChance > 0 ? "text-terminal-weather-precip" : "text-muted-foreground"
        )}>
          <Droplets className="w-3 h-3" />
          <span>{hour.precipChance !== null && Number.isFinite(hour.precipChance) ? `${hour.precipChance}%` : 'Chance unavailable'}</span>
        </div>
      </div>
    </Card>
  );
}
