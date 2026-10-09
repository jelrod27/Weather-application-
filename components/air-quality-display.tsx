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

/**
 * Air Quality Index (AQI) Display Component
 * Displays AQI data with color-coded visual bar, description, recommendations,
 * and optional pollutant breakdown from Open-Meteo
 */

import { Wind } from 'lucide-react'

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
import { isLightTheme } from '@/lib/theme-config'
import type { ReactElement } from 'react'
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

export function AirQualityDisplay({ aqi, theme, className, minimal = false, pollutants }: AirQualityDisplayProps): ReactElement {
  // Theme-aware styles using CSS variables
  const styles = minimal
    ? {
        container: '',
        text: 'text-foreground',
        border: 'border-white/20'
      }
    : {
        container: 'bg-card rounded-lg border border-border shadow-sm',
        text: 'text-foreground',
        border: 'border-border'
      };

  const hasAqi = Number.isFinite(aqi) && aqi >= 0;

  // Check if we have any pollutant data to show
  const hasPollutants = pollutants && Object.values(pollutants).some(v => v != null && Number.isFinite(v) && v >= 0);

  // Escalate card chrome when AQI enters actionable tiers (>100).
  // Left-border stripe only (matches hero card pattern) — no bg wash.
  const severity = !minimal && hasAqi ? getAQISeverityChrome(aqi) : null;

  return (
    <div
      className={cn(
        !minimal && "aqi-panel flex min-w-0 flex-col p-4 text-center [overflow-wrap:anywhere]",
        !minimal && styles.container,
        severity?.borderStripeClass,
        severity?.pulse && "motion-safe:animate-pulse",
        className
      )}
    >
      {/* Header */}
      <h2 className={minimal ? "text-lg font-semibold mb-2 text-center md:text-left" : "mb-4 flex items-center justify-center gap-1.5 text-xs font-semibold leading-none uppercase tracking-widest text-muted-foreground"}>
        {!minimal && <Wind size={14} className="shrink-0 text-primary" aria-hidden="true" />}
        Air Quality
      </h2>

      {/* AQI Value and Description */}
      <p className={cn("text-lg font-bold mb-3", hasAqi ? getAQIColor(aqi, isLightTheme(theme)) : 'text-muted-foreground', minimal ? "text-base mb-2" : "min-h-12")}>
        {hasAqi ? `${aqi} - ${getAQIDescription(aqi)}` : 'Air quality unavailable'}
      </p>

      {/* Horizontal AQI Color Bar */}
      {hasAqi && <div className="mb-3">
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
      </div>}

      {/* Health Recommendation */}
      <p className={cn("text-sm font-medium mb-2", styles.text, minimal && "text-xs line-clamp-2")}>
        {hasAqi ? getAQIRecommendation(aqi) : 'No current air quality reading is available for this location.'}
      </p>

      {/* Pollutant Breakdown */}
      {!minimal && hasPollutants && (
        <div className={cn("border-t pt-3 mt-2", styles.border)}>
          <p className={cn("text-xs font-semibold mb-2", styles.text)}>Pollutant Breakdown</p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
            {POLLUTANT_ITEMS.map(({ label, key, unit }) => {
              const value = pollutants[key]
              if (value == null || !Number.isFinite(value) || value < 0) return null
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
        <div className="mt-auto pt-3">
          <p className={cn("border-t pt-3 text-xs font-medium", styles.text, styles.border)}>EPA Air Quality Index • Lower = Better</p>
        </div>
      )}
    </div>
  )
}
