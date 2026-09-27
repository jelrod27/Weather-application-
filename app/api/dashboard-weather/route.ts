import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { dashboardWeatherService } from '@/lib/dashboard-weather-service'
import type { OpenMeteoForecastResponse } from '@/lib/open-meteo-types'
import { openMeteoLocalTimeToEpoch } from '@/lib/pollen/open-meteo-pollen'
import { getWMOCondition, getWMODescription } from '@/lib/wmo-codes'
import { parseCoordinates } from '@/lib/api/query-params'
import { withApiRoute } from '@/lib/api/with-api-route'

/**
 * Map WMO weather code + is_day to a compact icon code
 * so getWeatherIcon() in lib/dashboard-weather.ts returns the correct emoji.
 */
function wmoToIcon(code: number, isDay: number): string {
  const d = isDay ? 'd' : 'n'
  if (code === 0) return `01${d}`
  if (code === 1) return `02${d}`
  if (code === 2) return `03${d}`
  if (code === 3) return `04${d}`
  if (code === 45 || code === 48) return `50${d}`
  if (code >= 51 && code <= 57) return `09${d}`
  if (code >= 61 && code <= 67) return `10${d}`
  if (code >= 71 && code <= 77) return `13${d}`
  if (code >= 80 && code <= 82) return `09${d}`
  if (code >= 85 && code <= 86) return `13${d}`
  if (code >= 95) return `11${d}`
  return `02${d}`
}

const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null
const rounded = (value: unknown): number | null => {
  const number = finite(value)
  return number === null ? null : Math.round(number)
}

function buildCurrent(
  forecast: OpenMeteoForecastResponse,
  units: 'metric' | 'imperial',
  windUnit: 'mph' | 'kmh' | 'ms',
) {
  const current = forecast.current
  const hourly = forecast.hourly

  const now = Date.now()
  const utcOffsetSeconds = forecast.utc_offset_seconds ?? 0
  let visibilityRaw: number | null = null
  if (hourly?.time && hourly?.visibility) {
    for (let i = 0; i < hourly.time.length; i++) {
      const hourEpoch = openMeteoLocalTimeToEpoch(hourly.time[i]!, utcOffsetSeconds)
      if (!Number.isNaN(hourEpoch) && hourEpoch >= now) {
        visibilityRaw = finite(hourly.visibility[i])
        break
      }
    }
  }
  const visibility = visibilityRaw === null ? null :
    units === 'metric'
      ? Math.round(visibilityRaw / 1000)
      : Math.round(visibilityRaw / 1609)

  return {
    temperature: Math.round(current!.temperature_2m),
    description: getWMODescription(current!.weather_code).toLowerCase(),
    humidity: finite(current?.relative_humidity_2m),
    windSpeed: rounded(current?.wind_speed_10m),
    icon: wmoToIcon(current!.weather_code, current?.is_day ?? 1),
    feelsLike: rounded(current?.apparent_temperature),
    pressure: rounded(current?.surface_pressure),
    visibility,
    units,
    windUnit,
    observedAt: current?.time && Number.isFinite(openMeteoLocalTimeToEpoch(current.time, utcOffsetSeconds))
      ? new Date(openMeteoLocalTimeToEpoch(current.time, utcOffsetSeconds)).toISOString() : null,
  }
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const { searchParams } = new URL(request.url)
      const lat = searchParams.get('lat')
      const lon = searchParams.get('lon')
      const units = searchParams.get('units') === 'metric' ? 'metric' : 'imperial'
      const detail = searchParams.get('detail') === '1' || searchParams.get('detail') === 'true'

      const coords = parseCoordinates(lat, lon)
      if (!coords.ok) {
        return NextResponse.json({ error: coords.error }, { status: 400 })
      }
      const { latitude, longitude } = coords

      const windParam = searchParams.get('wind_unit')
      const windUnit = windParam === 'mph' || windParam === 'kmh' || windParam === 'ms'
        ? windParam : units === 'metric' ? 'kmh' : 'mph'
      const refresh = searchParams.get('refresh') === '1'
      const { forecast, fetchedAt, stale } = await dashboardWeatherService.load({ latitude, longitude, units, windUnit, detail, refresh })
      const current = { ...buildCurrent(forecast, units, windUnit), fetchedAt, stale }
      // The service owns the original receipt time. Avoid a second cache extending freshness.
      const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders }

      if (!detail) {
        return NextResponse.json(current, {
          headers,
        })
      }

      const daily = forecast.daily
      const days: Array<{
        day: string
        highTemp: number | null
        lowTemp: number | null
        condition: string
        description: string
      }> = []

      if (daily?.time?.length) {
        const count = Math.min(daily.time.length, 5)
        for (let i = 0; i < count; i++) {
          const code = finite(daily.weather_code?.[i])
          const date = new Date(`${daily.time[i]}T12:00:00`)
          days.push({
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            highTemp: rounded(daily.temperature_2m_max?.[i]),
            lowTemp: rounded(daily.temperature_2m_min?.[i]),
            condition: code === null ? 'Unavailable' : getWMOCondition(code),
            description: code === null ? 'Unavailable' : getWMODescription(code).toLowerCase(),
          })
        }
      }

      const uvIndex = rounded(forecast.current?.uv_index ?? daily?.uv_index_max?.[0])

      return NextResponse.json(
        {
          current,
          forecast: days,
          uvIndex,
        },
        {
          headers,
        },
      )
    } catch {
      return NextResponse.json(
        { error: 'Weather is temporarily unavailable. Please retry.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  })
}
