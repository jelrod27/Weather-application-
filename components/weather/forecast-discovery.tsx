import Link from 'next/link'
import { ArrowUpRight, CloudSun, Radar } from 'lucide-react'
import { getWeatherJourneyLinks, getWeatherLessonHref } from '@/lib/weather/journey'
import type { ReactElement } from 'react'
import type { WeatherData } from '@/lib/types'

interface ForecastDiscoveryProps {
  weather: Pick<WeatherData, 'location' | 'coordinates' | 'timezone'>
}

/** Navigation only: shares the viewed place without loading a second map or forecast. */
export function ForecastDiscovery({ weather }: ForecastDiscoveryProps): ReactElement {
  const links = getWeatherJourneyLinks(weather)
  return (
    <aside aria-label="Explore your weather" className="forecast-discovery space-y-4">
      <Link href={links.radar} className="forecast-discovery-card group">
        <span className="text-xs font-mono uppercase tracking-widest text-primary">Radar explorer</span>
        <Radar className="my-6 text-primary" size={56} strokeWidth={1.25} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">A look at the bigger picture</h2>
        <p className="mt-2 text-sm text-muted-foreground">Follow precipitation around {weather.location}, with frame times and playback.</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Explore local radar <ArrowUpRight size={16} aria-hidden="true" /></span>
      </Link>
      <Link href={getWeatherLessonHref('clouds', links.forecast)} className="forecast-discovery-card group">
        <CloudSun size={32} className="mb-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Read the sky</span>
        <h2 className="mt-2 text-lg font-semibold text-foreground">What can clouds tell you?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Explore cloud shapes, growing storms, and what a radar image means.</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Learn to read the sky <ArrowUpRight size={16} aria-hidden="true" /></span>
      </Link>
    </aside>
  )
}
