import { parseStargazerCoordinates, isStargazerTimeZone } from '@/lib/stargazer/context'
import { getWeatherReturnHref, getWeatherJourneyLinks } from '@/lib/weather/journey'

export interface SkyContext {
  coordinates: { lat: number; lon: number } | null
  label: string
  timezone?: string
  returnHref: string
}

export function readSkyContext(params: Pick<URLSearchParams, 'get'>): SkyContext {
  const coordinates = parseStargazerCoordinates(params.get('lat'), params.get('lon'))
  const label = (params.get('label') ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160) || (coordinates ? 'Selected location' : '')
  const timezone = params.get('tz')
  const requestedReturn = getWeatherReturnHref(params.get('returnTo'))
  return {
    coordinates, label, timezone: isStargazerTimeZone(timezone) ? timezone : undefined,
    returnHref: requestedReturn && !requestedReturn.startsWith('/read-your-sky') ? requestedReturn : coordinates
      ? getWeatherJourneyLinks({ location: label, coordinates }).forecast : '/',
  }
}
