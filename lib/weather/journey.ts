import { locationInputToSlug } from '@/lib/city-slug'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'
import type { WeatherData } from '@/lib/types'

type JourneyLocation = Pick<WeatherData, 'location' | 'coordinates' | 'timezone'>
export type WeatherLesson = 'clouds' | 'storms' | 'radar'

/** Limit explanation returns to weather views, using the same redirect guard as the rest of the app. */
export function getWeatherReturnHref(value: string | null): string | null {
  if (!value || value.length > 4096 || /[\u0000-\u0020\u007f]/.test(value)) return null
  const safe = validateRedirectPath(value, '')
  if (!safe) return null
  const url = new URL(safe, 'https://www.16bitweather.co')
  if (url.origin !== 'https://www.16bitweather.co') return null
  if (!['/', '/hourly', '/radar'].includes(url.pathname) && !/^\/weather\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)) return null
  return `${url.pathname}${url.search}${url.hash}`
}

export function getWeatherLessonHref(lesson: WeatherLesson, returnTo: string): string {
  const params = new URLSearchParams({ lesson })
  const safe = getWeatherReturnHref(returnTo)
  if (safe) params.set('returnTo', safe)
  return `/education/weather-skills?${params}`
}

export function getWeatherJourneyLinks(viewed: JourneyLocation): { forecast: string; hourly: string; radar: string } {
  const { coordinates, location } = viewed
  const validCoordinates = coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon) &&
    Math.abs(coordinates.lat) <= 90 && Math.abs(coordinates.lon) <= 180
  const locationQuery = validCoordinates ? `${coordinates.lat},${coordinates.lon}` : location
  const forecast = `/weather/${locationInputToSlug(location)}?${new URLSearchParams({ location: locationQuery })}`
  const hourlyParams = new URLSearchParams({ city: location })
  const radarParams = new URLSearchParams()
  if (validCoordinates) {
    for (const params of [hourlyParams, radarParams]) {
      params.set('lat', String(coordinates.lat))
      params.set('lon', String(coordinates.lon))
    }
    radarParams.set('label', location)
    if (viewed.timezone) radarParams.set('tz', viewed.timezone)
  } else {
    radarParams.set('location', location)
  }
  radarParams.set('returnTo', forecast)
  return { forecast, hourly: `/hourly?${hourlyParams}`, radar: `/radar?${radarParams}` }
}
