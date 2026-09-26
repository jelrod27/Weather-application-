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
  const headline = brief?.precipitation?.trend === 'rising' ? 'Precipitation chances rise.'
    : brief?.precipitation?.trend === 'easing' ? 'Precipitation chances ease.' : 'A little detail. A better plan.'
  let timeZone = weather.timezone || 'UTC'
  try { new Intl.DateTimeFormat('en-US', { timeZone }) } catch { timeZone = 'UTC' }
  const range = (low: number, high: number): string => Math.round(low) === Math.round(high)
    ? String(Math.round(low)) : `${Math.round(low)}–${Math.round(high)}`

  return (
    <section aria-label="Next few hours" className="flex flex-col justify-center py-4 sm:py-6">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">The next few hours · {weather.location}</p>
      <h2 className="mt-3 max-w-lg text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.12] text-foreground">{headline}</h2>
      {brief ? <>
        <p className="mt-4 text-sm text-muted-foreground">
          {formatLocationTimeWithZone(brief.hours[0].dt * 1000, timeZone)} – {formatLocationTimeWithZone((brief.hours[brief.hours.length - 1].dt + 3600) * 1000, timeZone)}
          {timeZone === 'UTC' && !weather.timezone ? ' (location time zone unavailable)' : ''}
        </p>
        <dl className="my-5 flex flex-wrap gap-x-7 gap-y-4 text-sm">
          {brief.temperature && <div><dt className="text-xs text-muted-foreground">Temperature</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{range(brief.temperature.low, brief.temperature.high)}{weather.unit}</dd></div>}
          {brief.precipitation && <div><dt className="text-xs text-muted-foreground">Precipitation chance</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{range(brief.precipitation.low, brief.precipitation.high)}%</dd></div>}
          {brief.windHigh !== null && <div><dt className="text-xs text-muted-foreground">Highest hourly wind</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{Math.round(brief.windHigh)} <span className="text-sm font-normal">{weather.unit === '°C' ? 'km/h' : 'mph'}</span></dd></div>}
        </dl>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Compare the hours before you head out. Precipitation probabilities describe a chance of rain or snow, not a guarantee.</p>
      </> : <p className="my-5 max-w-md text-sm text-muted-foreground">{now === null ? 'Preparing your local outlook…' : 'A recent hourly outlook is unavailable. Check the detailed forecast for available periods.'}</p>}
      <Link href={hourlyHref} className="mt-5 inline-flex min-h-11 w-fit items-center gap-3 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Plan the next few hours <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
  )
}
