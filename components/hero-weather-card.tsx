"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import WeatherIconModern from "@/components/weather-icon-modern"
import { ShareButton } from "@/components/share-weather-modal"
import { useTheme } from "@/components/theme-provider"
import { getHeroAccent } from "@/lib/weather/hero-utils"
import { formatLocationTimeWithZone } from "@/lib/format-location-time"
import { ArrowDown, ArrowUp, CloudRain, Droplets, Thermometer, Wind } from "lucide-react"

/** Icon tints tuned per theme — dark themes use pastel /90; daybreak uses saturated hues for cream bg. */
const HERO_CHIP_ICON = {
  dark: {
    hi: "text-rose-300/90",
    lo: "text-sky-300/90",
    feels: "text-amber-300/90",
    hum: "text-sky-300/90",
    wind: "text-emerald-300/90",
    rain: "text-blue-300/90",
  },
  daybreak: {
    hi: "text-rose-600",
    lo: "text-primary",
    feels: "text-accent",
    hum: "text-primary/80",
    wind: "text-emerald-700",
    rain: "text-blue-700",
  },
} as const

const HERO_CARD_BASE =
  "hero-weather-card weather-card-enter border-0 border-l-4 border-l-primary shadow-md weather-metric-glow weather-card-gradient hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"

interface HeroWeatherCardProps {
  location: string
  temperature: number | null | undefined
  unit: string
  condition: string
  description: string
  highTemp?: number
  lowTemp?: number
  feelsLike: number | null
  feelsLikeDelta: number
  humidity?: number
  windSpeed?: number
  windUnit?: string
  precipChance?: number
  glowClass?: string
  /** IANA timezone for the viewed location (city-local clock). */
  timezone?: string
}

export function HeroWeatherCard({
  location,
  temperature,
  unit,
  condition,
  description,
  highTemp,
  lowTemp,
  feelsLike,
  feelsLikeDelta,
  humidity,
  windSpeed,
  windUnit = 'mph',
  precipChance,
  glowClass,
  timezone,
}: HeroWeatherCardProps) {
  const { theme } = useTheme()
  const accent = getHeroAccent(condition)
  const displayTemp = typeof temperature === 'number' ? Math.round(temperature) : null
  const chipIcon = theme === 'daybreak' ? HERO_CHIP_ICON.daybreak : HERO_CHIP_ICON.dark
  const localTimeLabel = useLocationLocalTime(timezone)

  return (
    <Card className={cn(HERO_CARD_BASE, accent, "relative overflow-hidden")}>
      <HeroAmbientBackdrop condition={condition} />
      <CardContent className="p-5 sm:p-7 relative z-10">
        <div className="grid gap-5 sm:gap-6 sm:grid-cols-[1fr_auto] items-center">
          {/* Left: identity + temperature */}
          <div className="min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-1.5">
              <h1
                className={cn(
                  "font-extrabold tracking-wider uppercase text-primary font-sans",
                  glowClass,
                )}
                style={{ fontSize: "clamp(18px, 3.2vw, 26px)" }}
              >
                {location} Weather
              </h1>
              {(highTemp !== undefined && lowTemp !== undefined) && (
                <ShareButton
                  weatherData={{
                    location,
                    temperature: temperature ?? 0,
                    unit,
                    condition,
                    highTemp: Math.round(highTemp),
                    lowTemp: Math.round(lowTemp),
                  }}
                  variant="button"
                />
              )}
            </div>

            {localTimeLabel ? (
              <p
                data-testid="location-local-time"
                className="mb-1 text-xs sm:text-sm font-mono text-muted-foreground/80 tracking-wide"
              >
                Local time {localTimeLabel}
              </p>
            ) : null}

            <p
              data-testid="temperature-value"
              className="text-6xl sm:text-8xl font-bold tabular-nums tracking-tight font-mono leading-none text-foreground glow-hero"
              style={{ fontSize: "clamp(56px, 11vw, 104px)" }}
            >
              {displayTemp ?? 'N/A'}
              {displayTemp != null ? '°' : ''}
            </p>

            <p className="mt-2 text-base sm:text-lg text-muted-foreground/90 leading-snug">
              <span className="capitalize">{condition || 'Unknown'}</span>
              {description ? <span className="text-muted-foreground/70"> — {description}</span> : null}
            </p>
          </div>

          {/* Right: icon + 2-row chip grid */}
          <div className="flex flex-col items-center gap-4 sm:gap-5 sm:pr-2 sm:min-w-[280px]">
            <div className="drop-shadow-[0_4px_28px_rgba(var(--theme-accent-rgb),0.28)]">
              <WeatherIconModern condition={condition} size={112} className="sm:scale-110" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs sm:text-sm font-mono w-full">
              {highTemp !== undefined && (
                <HeroChip icon={<ArrowUp size={12} className={chipIcon.hi} />} label="HI" value={`${Math.round(highTemp)}°`} />
              )}
              {lowTemp !== undefined && (
                <HeroChip icon={<ArrowDown size={12} className={chipIcon.lo} />} label="LO" value={`${Math.round(lowTemp)}°`} />
              )}
              {feelsLike != null && (
                <HeroChip
                  icon={<Thermometer size={12} className={chipIcon.feels} />}
                  label="FEELS"
                  value={`${feelsLike}°${feelsLikeDelta !== 0 ? (feelsLikeDelta > 0 ? ' ↑' : ' ↓') : ''}`}
                />
              )}
              {humidity !== undefined && (
                <HeroChip
                  icon={<Droplets size={12} className={chipIcon.hum} />}
                  label="HUM"
                  value={`${Math.round(humidity)}%`}
                />
              )}
              {windSpeed !== undefined && (
                <HeroChip
                  icon={<Wind size={12} className={chipIcon.wind} />}
                  label="WIND"
                  value={`${Math.round(windSpeed)} ${windUnit}`}
                />
              )}
              {precipChance !== undefined && (
                <HeroChip
                  icon={<CloudRain size={12} className={chipIcon.rain} />}
                  label="RAIN"
                  value={`${Math.round(precipChance)}%`}
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HeroChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md px-2 py-1 bg-card/80 border border-[var(--border-invisible)]">
      {icon}
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  )
}

/** Live city-local clock; null until mount (and when timezone unknown) to avoid SSR skew. */
function useLocationLocalTime(timeZone?: string): string | null {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!timeZone) {
      setLabel(null)
      return
    }

    const tick = () => setLabel(formatLocationTimeWithZone(Date.now(), timeZone))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [timeZone])

  return label
}

/**
 * Ambient backdrop for the hero card — three layered decorative effects:
 *   1. Static pixel grid (ties visually to the radar card).
 *   2. Rotating conic-gradient sweep arc (the "rotating watermark").
 *   3. Giant condition-aware weather icon watermark at low opacity.
 *
 * Deferred off the LCP path: mounted only after first client paint via
 * useEffect+useState, so Lighthouse's FCP/LCP measurements don't pay
 * for the watermark SVG, pixel grid, and conic-gradient sweep. Animations
 * gated on motion-safe; all layers pointer-events-none.
 */
function HeroAmbientBackdrop({ condition }: { condition: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!mounted) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1. Pixel grid — 16-bit texture, matches radar card */}
      <div
        className="hero-backdrop-grid absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(var(--theme-accent-rgb),0.8) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(var(--theme-accent-rgb),0.8) 0 1px, transparent 1px 28px)',
        }}
      />

      {/* 2. Rotating sweep arc — center-anchored, GPU-accelerated */}
      <div className="hero-backdrop-sweep absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-[700px] w-[700px] motion-safe:animate-spin"
          style={{
            animationDuration: '60s',
            animationTimingFunction: 'linear',
            background:
              'conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(var(--theme-accent-rgb),0.05) 320deg, rgba(var(--theme-accent-rgb),0.12) 358deg, transparent 360deg)',
            maskImage: 'radial-gradient(circle, black 0%, black 42%, transparent 58%)',
            WebkitMaskImage: 'radial-gradient(circle, black 0%, black 42%, transparent 58%)',
          }}
        />
      </div>

      {/* 3. Giant condition icon watermark — offset toward center, static.
          (No pulse animation: Tailwind animate-pulse overrides opacity-[0.06]
          up to 0.5–1 cycles, which both defeats the watermark subtlety and
          costs compositor work every frame.) */}
      <div className="hero-backdrop-watermark absolute top-1/2 left-[45%] -translate-y-1/2 opacity-[0.08]">
        <WeatherIconModern condition={condition} size={320} />
      </div>
    </div>
  )
}
