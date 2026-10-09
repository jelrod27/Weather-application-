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
    <aside aria-label="Explore your weather" className="forecast-discovery">
      {children}
      <Link href={links.radar} className="forecast-discovery-card group">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Radar className="shrink-0 text-primary" size={24} strokeWidth={1.5} aria-hidden="true" />
          Radar explorer
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Precipitation around {weather.location}, with frame times and playback.</p>
        <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary">Explore local radar <ArrowUpRight size={16} aria-hidden="true" /></span>
      </Link>
    </aside>
  )
}
