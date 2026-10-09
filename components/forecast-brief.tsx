'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatLocationTimeWithZone } from '@/lib/format-location-time'
import { getForecastBrief } from '@/lib/weather/forecast-brief'
import type { WeatherData } from '@/lib/types'

interface ForecastBriefProps {
  weather: Pick<WeatherData, 'hourlyForecast' | 'location' | 'timezone' | 'unit'>
  hourlyHref: string
}

export function ForecastBrief({ weather, hourlyHref }: ForecastBriefProps): React.JSX.Element {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = (): void => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const brief = now === null ? null : getForecastBrief(weather.hourlyForecast ?? [], now)
  let timeZone = weather.timezone || 'UTC'
  try { new Intl.DateTimeFormat('en-US', { timeZone }) } catch { timeZone = 'UTC' }
  const range = (low: number, high: number): string => Math.round(low) === Math.round(high)
    ? String(Math.round(low)) : `${Math.round(low)}–${Math.round(high)}`

  return (
    <section aria-label="Next few hours" className="forecast-brief">
      <h2 className="text-lg font-semibold text-foreground">Next few hours</h2>
      <p className="mt-1 text-xs text-muted-foreground">{weather.location}</p>
      {brief ? <>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {formatLocationTimeWithZone(brief.hours[0].dt * 1000, timeZone)} – {formatLocationTimeWithZone(brief.hours[brief.hours.length - 1].dt * 1000, timeZone)}
          {timeZone === 'UTC' && weather.timezone !== 'UTC' ? ' (location time zone unavailable)' : ''}
        </p>
        <dl className="mt-2 divide-y divide-border/50 text-sm">
          <div className="flex items-baseline justify-between gap-3 py-1.5"><dt className="text-xs text-muted-foreground">Temperature</dt><dd className="shrink-0 font-semibold tabular-nums">{brief.temperature ? `${range(brief.temperature.low, brief.temperature.high)}${weather.unit}` : 'Unavailable'}</dd></div>
          <div className="flex items-baseline justify-between gap-3 py-1.5"><dt className="text-xs text-muted-foreground">Precipitation chance</dt><dd className="shrink-0 font-semibold tabular-nums">{brief.precipitation ? `${range(brief.precipitation.low, brief.precipitation.high)}%` : 'Unavailable'}</dd></div>
          <div className="flex items-baseline justify-between gap-3 py-1.5"><dt className="text-xs text-muted-foreground">Highest hourly wind</dt><dd className="shrink-0 font-semibold tabular-nums">{brief.windHigh !== null ? <>{Math.round(brief.windHigh)} <span className="font-normal">{weather.unit === '°C' ? 'km/h' : 'mph'}</span></> : 'Unavailable'}</dd></div>
        </dl>
      </> : <p className="my-3 text-sm text-muted-foreground">{now === null ? 'Preparing your local outlook…' : 'A recent hourly outlook is unavailable. Check the detailed forecast for available periods.'}</p>}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
        <Link href={hourlyHref} className="inline-flex min-h-11 items-center gap-1 rounded text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Hourly details <ArrowRight size={14} aria-hidden="true" /></Link>
        <Link href={`${hourlyHref}#outdoor-planner`} className="inline-flex min-h-11 items-center rounded text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Outdoor planner</Link>
      </div>
    </section>
  )
}
