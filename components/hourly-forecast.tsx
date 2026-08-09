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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Droplets } from "lucide-react"
import type { ThemeType } from "@/lib/theme-config"
import WeatherIconModern from "./weather-icon-modern"

export interface HourlyForecastData {
  dt: number;
  time: string;
  temp: number;
  feelsLike?: number;
  condition: string;
  description: string;
  precipChance: number;
  windSpeed?: number;
  windDirection?: string;
  humidity?: number;
  uvIndex?: number;
  icon?: string;
}

interface HourlyForecastProps {
  hourly: HourlyForecastData[];
  theme?: ThemeType; // Kept for API compat
  tempUnit?: string;
}

export default function HourlyForecast({
  hourly,
  tempUnit = '°F'
}: HourlyForecastProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  /** Client-only clock so server and client agree on first paint (no hydration mismatch for "NOW"). */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  // Auto-scroll to current hour once client time is known
  useEffect(() => {
    if (now === null || !scrollContainerRef.current) return;
    const currentHourCard = scrollContainerRef.current.querySelector('.current-hour');
    if (currentHourCard) {
      currentHourCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [now]);

  if (!hourly || hourly.length === 0) {
    return null;
  }

  // Take first 24 hours for a cleaner view (user can scroll)
  const displayHours = hourly.slice(0, 24);

  return (
    <Card className="p-3 sm:p-4 lg:p-6 border-0 rounded-xl dashboard-surface backdrop-blur-md bg-card/55 animate-slide-in">
      <CardHeader className="p-0 mb-3 sm:mb-4">
        <CardTitle className="text-center text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-primary glow">
          HOURLY FORECAST
        </CardTitle>
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
  tempUnit
}: {
  hour: HourlyForecastData;
  isCurrentHour: boolean;
  isMidnight: boolean;
  tempUnit: string;
}) {
  return (
    <Card
      className={cn(
        "hourly-forecast-card flex-shrink-0 flex flex-col items-center justify-between snap-start",
        "rounded-xl p-3 sm:p-4 min-w-[100px] sm:min-w-[110px]",
        "transition-all duration-200 hover:-translate-y-0.5",
        "backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "shadow-[0_10px_28px_-14px_rgba(0,0,0,0.55)]",
        isCurrentHour
          ? "bg-primary/12 border border-primary/25 shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.28)] current-hour"
          : "bg-card/55 hover:bg-card/75 border border-[var(--border-invisible)] hover:border-[var(--border-subtle)] hover:shadow-[0_12px_32px_-14px_rgba(0,0,0,0.5)]",
        isMidnight && "border-l-0"
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
          {new Date(hour.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
        </div>
      )}

      {/* Weather Icon */}
      <div className="mb-3 flex items-center justify-center filter drop-shadow-md">
        <WeatherIconModern
          condition={hour.condition}
          isNight={hour.icon?.endsWith('n')}
          size={54}
          className="hover:scale-110 transition-transform"
        />
      </div>

      {/* Temperature */}
      <div className={cn(
        "text-lg sm:text-xl font-bold mb-2 tabular-nums tracking-tight text-primary font-mono",
        isCurrentHour && "glow"
      )}>
        {Math.round(hour.temp)}{tempUnit}
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 w-full justify-center text-xs text-muted-foreground/90">
        {/* Precip */}
        <div className={cn(
          "flex items-center gap-0.5",
          hour.precipChance > 0 ? "text-terminal-weather-precip" : "text-muted-foreground"
        )}>
          <Droplets className="w-3 h-3" />
          <span>{hour.precipChance}%</span>
        </div>
      </div>
    </Card>
  );
}
