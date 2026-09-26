import Link from 'next/link'
import { getWeatherJourneyLinks, getWeatherLessonHref } from '@/lib/weather/journey'
import type { WeatherData } from '@/lib/types'

interface WeatherJourneyProps {
  weather: Pick<WeatherData, 'location' | 'coordinates' | 'timezone'>
  active: 'forecast' | 'hourly'
}

export function WeatherJourney({ weather, active }: WeatherJourneyProps): React.JSX.Element {
  const links = getWeatherJourneyLinks(weather)
  const currentHref = links[active]
  const radarParams = new URLSearchParams(links.radar.split('?')[1])
  radarParams.set('returnTo', currentHref)
  const items = [
    { label: 'Forecast', key: 'forecast', href: links.forecast },
    { label: 'Hourly', key: 'hourly', href: links.hourly },
    { label: 'Radar', key: 'radar', href: `/radar?${radarParams}` },
    { label: 'Read the sky', key: 'learn', href: getWeatherLessonHref('clouds', currentHref) },
  ]
  return (
    <nav aria-label={`Weather views for ${weather.location}`} className="border-b border-border">
      <ul className="flex gap-5 sm:gap-7 text-sm">
        {items.map(item => <li key={item.key}><Link href={item.href} aria-current={active === item.key ? 'page' : undefined} className={`inline-flex min-h-11 items-center border-b-2 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active === item.key ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-primary'}`}>{item.label}</Link></li>)}
      </ul>
    </nav>
  )
}
