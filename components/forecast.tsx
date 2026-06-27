"use client"

import { useEffect, useState, type KeyboardEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
// removed ThemeType import as manual mapping is gone, but we might accept the prop for compat
import type { ThemeType } from "@/lib/theme-config"
import WeatherIconModern from "./weather-icon-modern"
import type { ForecastDay } from "@/lib/types"
import { getPrecipSeverity } from "@/lib/weather/precip-utils"

interface ForecastProps {
  forecast: ForecastDay[];
  theme?: ThemeType; // Kept for prop output compatibility
  onDayClick?: (index: number) => void;
  selectedDay?: number | null;
}

export default function Forecast({ forecast, onDayClick, selectedDay }: ForecastProps) {
  // Determine number of days to show (max 7, or length if less)
  const daysToShow = forecast.length >= 7 ? 7 : Math.min(forecast.length, 5);
  const displayForecast = forecast.slice(0, daysToShow);

  const title = displayForecast.length > 5 ? "7-DAY FORECAST" : "5-DAY FORECAST";

  // Dynamic grid columns based on number of days
  const gridColsClass = displayForecast.length > 5
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

  return (
    <Card className="forecast-panel p-3 sm:p-4 lg:p-6 border-0 rounded-xl dashboard-surface bg-card/55 backdrop-blur-md transition-shadow duration-300 animate-slide-in">
      <CardHeader className="p-0 mb-3 sm:mb-4">
        <CardTitle className="text-center text-base sm:text-lg lg:text-xl font-extrabold uppercase tracking-wider text-primary glow">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className={cn("grid gap-2 sm:gap-3 lg:gap-4", gridColsClass)}>
          {displayForecast.map((day, index) => (
            <ForecastCard
              key={index}
              day={day}
              index={index}
              onDayClick={onDayClick}
              isSelected={selectedDay === index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ForecastCard({ day, index, onDayClick, isSelected }: {
  day: ForecastDay;
  index: number;
  onDayClick?: (index: number) => void;
  isSelected?: boolean;
}) {
  const isUSALocation = day.country === 'US' || day.country === 'USA';
  const tempUnit = isUSALocation ? '°F' : '°C';

  // M.DD.YY from local calendar; computed on client only to avoid SSR/client date skew
  const [formattedDate, setFormattedDate] = useState('');
  useEffect(() => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + index);
    const month = targetDate.getMonth() + 1;
    const date = targetDate.getDate();
    const year = targetDate.getFullYear().toString().slice(-2);
    setFormattedDate(`${month}.${date.toString().padStart(2, '0')}.${year}`);
  }, [index]);

  const precip = getPrecipSeverity(day.details?.precipitationChance);

  const handleClick = () => {
    if (onDayClick) {
      onDayClick(index);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Card
      data-precip-tier={precip.tier}
      className={cn(
        "forecast-day-card relative overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 card-interactive",
        "flex flex-col justify-between min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]",
        "backdrop-blur-sm border border-[var(--border-invisible)] shadow-[0_10px_28px_-14px_rgba(0,0,0,0.55)]",
        "hover:border-[var(--border-subtle)] hover:shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)]",
        precip.tier === 'none' ? "bg-card/70" : precip.cardClass,
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_22px_rgba(var(--theme-accent-rgb),0.32)]"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Forecast for ${day.day}: High ${Math.round(day.highTemp)}${tempUnit}, Low ${Math.round(day.lowTemp)}${tempUnit}, ${day.description}`}
      aria-pressed={isSelected}
    >
      {precip.tier !== 'none' ? (
        <div
          className={cn("absolute inset-x-0 top-0 rounded-t-lg pointer-events-none", precip.stripClass)}
          aria-hidden
        />
      ) : null}
      <CardContent className="p-2 sm:p-3 flex flex-col items-center justify-between h-full">
        {/* Day - Mobile responsive */}
        <div className="text-xs sm:text-sm font-bold text-primary mb-1 uppercase tracking-wider glow text-center">
          <span className="sm:hidden">{day.day.substring(0, 3)}</span>
          <span className="hidden sm:inline">{day.day}</span>
          <div className="text-xs text-muted-foreground/90 mt-1 tabular-nums">
            {formattedDate}
          </div>
        </div>

        {/* Icon */}
        <div className="flex justify-center my-2">
          <WeatherIconModern
            condition={day.condition}
            size={40}
            className="hover:scale-110 transition-transform drop-shadow"
          />
        </div>

        {/* Temp */}
        <div className="space-y-1 text-center">
          <div className="text-sm sm:text-base lg:text-lg font-bold text-foreground tabular-nums font-mono tracking-tight">
            {Math.round(day.highTemp)}{tempUnit}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground/90 font-medium tabular-nums font-mono">
            {Math.round(day.lowTemp)}{tempUnit}
          </div>
        </div>

        {/* Precipitation chance */}
        {(day.details?.precipitationChance ?? 0) > 0 && (
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-medium tabular-nums",
              precip.chipClass,
            )}
          >
            <span aria-hidden>&#x1F4A7;</span>
            <span>{day.details?.precipitationChance}%</span>
          </div>
        )}

        {/* Description - Mobile responsive */}
        <div
          className="text-xs text-primary/85 capitalize mt-2 text-center w-full line-clamp-2 leading-snug min-h-[2.25rem]"
          title={day.description}
        >
          <span className="sm:hidden">
            {day.description.length > 12 ? `${day.description.substring(0, 10)}...` : day.description}
          </span>
          <span className="hidden sm:inline">
            {day.description.length > 20 ? `${day.description.substring(0, 18)}...` : day.description}
          </span>
        </div>
      </CardContent>
    </Card>
  );
} 