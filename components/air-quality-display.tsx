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

/**
 * Air Quality Index (AQI) Display Component
 * Displays AQI data with color-coded visual bar, description, recommendations,
 * and optional pollutant breakdown from Open-Meteo
 */

import { cn } from '@/lib/utils'
import {
  getAQIColor,
  getAQIDescription,
  getAQIRecommendation,
  getAQIIndicatorPosition,
  getAQISeverityChrome,
  AQI_SCALE_LABELS,
  AQI_COLOR_SEGMENTS
} from '@/lib/air-quality-utils'
import type { ThemeType } from '@/lib/theme-config'

interface PollutantData {
  pm2_5?: number
  pm10?: number
  ozone?: number
  nitrogen_dioxide?: number
  sulphur_dioxide?: number
  carbon_monoxide?: number
}

interface AirQualityDisplayProps {
  aqi: number
  theme: ThemeType
  className?: string
  minimal?: boolean
  pollutants?: PollutantData
}

/** Pollutant display config: label, unit, key */
const POLLUTANT_ITEMS: { label: string; key: keyof PollutantData; unit: string }[] = [
  { label: 'PM2.5', key: 'pm2_5', unit: 'μg/m³' },
  { label: 'PM10', key: 'pm10', unit: 'μg/m³' },
  { label: 'O\u2083', key: 'ozone', unit: 'μg/m³' },
  { label: 'NO\u2082', key: 'nitrogen_dioxide', unit: 'μg/m³' },
  { label: 'SO\u2082', key: 'sulphur_dioxide', unit: 'μg/m³' },
  { label: 'CO', key: 'carbon_monoxide', unit: 'μg/m³' },
]

export function AirQualityDisplay({ aqi, theme, className, minimal = false, pollutants }: AirQualityDisplayProps) {
  // Theme-aware styles using CSS variables
  const styles = minimal
    ? {
        container: '',
        header: '',
        text: 'text-white/80',
        border: 'border-white/20'
      }
    : {
        container: 'bg-card/80 dashboard-surface rounded-xl glow-subtle',
        header: 'text-primary',
        text: 'text-foreground',
        border: 'border-primary/40'
      };

  // Check if we have any pollutant data to show
  const hasPollutants = pollutants && Object.values(pollutants).some(v => v !== undefined && v !== null);

  // Escalate card chrome when AQI enters actionable tiers (>100).
  // Left-border stripe only (matches hero card pattern) — no bg wash.
  const severity = !minimal ? getAQISeverityChrome(aqi) : null;

  return (
    <div
      className={cn(
        !minimal && "p-4 rounded-lg text-center",
        !minimal && styles.container,
        severity?.borderStripeClass,
        severity?.pulse && "motion-safe:animate-pulse",
        className
      )}
    >
      {/* Header */}
      <h2 className={cn("text-xl font-semibold mb-3", styles.header, minimal && "text-lg mb-2 text-center md:text-left")}>
        Air Quality
      </h2>

      {/* AQI Value and Description */}
      <p className={cn("text-lg font-bold mb-3", getAQIColor(aqi), minimal && "text-base mb-2")}>
        {aqi} - {getAQIDescription(aqi)}
      </p>

      {/* Horizontal AQI Color Bar */}
      <div className="mb-3">
        <div className="relative w-full h-4 rounded-full overflow-hidden border border-gray-400/50">
          {/* Color segments */}
          <div className="absolute inset-0 flex">
            {AQI_COLOR_SEGMENTS.map((segment, index) => (
              <div
                key={index}
                className={cn("flex-1", segment.color)}
                style={{ width: segment.width }}
                title={segment.label}
              />
            ))}
          </div>

          {/* Current reading indicator */}
          <div
            className="absolute top-0 w-1 h-full bg-white border border-black transform -translate-x-0.5"
            style={{
              left: `${getAQIIndicatorPosition(aqi)}%`,
              boxShadow: '0 0 4px rgba(0,0,0,0.8)'
            }}
          />
        </div>

        {/* AQI Scale Labels */}
        {!minimal && (
          <div className="flex justify-between text-xs text-muted-foreground/90 mt-1 px-1">
            {AQI_SCALE_LABELS.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        )}
      </div>

      {/* Health Recommendation */}
      <p className={cn("text-sm font-medium mb-2", styles.text, minimal && "text-xs line-clamp-2")}>
        {getAQIRecommendation(aqi)}
      </p>

      {/* Pollutant Breakdown */}
      {!minimal && hasPollutants && (
        <div className={cn("border-t pt-3 mt-2", styles.border)}>
          <p className={cn("text-xs font-semibold mb-2", styles.text)}>Pollutant Breakdown</p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
            {POLLUTANT_ITEMS.map(({ label, key, unit }) => {
              const value = pollutants[key]
              if (value === undefined || value === null) return null
              return (
                <div key={key} className="flex flex-col items-center">
                  <span className={cn("text-xs font-medium", styles.text)}>{label}</span>
                  <span className={cn("text-sm font-bold tabular-nums", styles.text)}>{value}</span>
                  <span className="text-[10px] text-muted-foreground">{unit}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* EPA AQI Legend - Updated */}
      {!minimal && (
        <div className={cn("text-xs border-t pt-2 mt-2", styles.text, styles.border)}>
          <p className="font-medium">EPA Air Quality Index • Lower = Better</p>
        </div>
      )}
    </div>
  )
}
