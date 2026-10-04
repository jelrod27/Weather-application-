import Link from 'next/link'
import { ArrowUpRight, Radar } from 'lucide-react'
import { getWeatherJourneyLinks } from '@/lib/weather/journey'
import type { ReactElement, ReactNode } from 'react'
import type { WeatherData } from '@/lib/types'

interface ForecastDiscoveryProps {
  weather: Pick<WeatherData, 'location' | 'coordinates' | 'timezone'>
  children?: ReactNode
}

/** Uses the viewed place without loading a second map or forecast. */
export function ForecastDiscovery({ weather, children }: ForecastDiscoveryProps): ReactElement {
  const links = getWeatherJourneyLinks(weather)
  return (
    <aside aria-label="Explore your weather" className="forecast-discovery space-y-4">
      {children}
      <Link href={links.radar} className="forecast-discovery-card group">
        <span className="text-xs font-mono uppercase tracking-widest text-primary">Radar explorer</span>
        <Radar className="my-6 text-primary" size={56} strokeWidth={1.25} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">A look at the bigger picture</h2>
        <p className="mt-2 text-sm text-muted-foreground">Follow precipitation around {weather.location}, with frame times and playback.</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Explore local radar <ArrowUpRight size={16} aria-hidden="true" /></span>
      </Link>
    </aside>
  )
}
