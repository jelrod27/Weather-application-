import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { fetchOpenMeteoForecast } from '@/lib/open-meteo'
import { getWMOCondition, getWMODescription } from '@/lib/wmo-codes'

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

function buildCurrent(
  forecast: Awaited<ReturnType<typeof fetchOpenMeteoForecast>>,
  units: 'metric' | 'imperial',
) {
  const current = forecast.current
  const hourly = forecast.hourly

  const now = Date.now()
  let visibilityRaw = 10000
  if (hourly?.time && hourly?.visibility) {
    for (let i = 0; i < hourly.time.length; i++) {
      if (Date.parse(hourly.time[i]!) >= now) {
        visibilityRaw = hourly.visibility[i] ?? 10000
        break
      }
    }
  }
  const visibility =
    units === 'metric'
      ? Math.round(visibilityRaw / 1000)
      : Math.round(visibilityRaw / 1609)

  return {
    temperature: Math.round(current?.temperature_2m ?? 0),
    description: getWMODescription(current?.weather_code ?? 0).toLowerCase(),
    humidity: current?.relative_humidity_2m ?? 0,
    windSpeed: Math.round(current?.wind_speed_10m ?? 0),
    icon: wmoToIcon(current?.weather_code ?? 0, current?.is_day ?? 1),
    feelsLike: Math.round(current?.apparent_temperature ?? 0),
    pressure: Math.round(current?.surface_pressure ?? 1013),
    visibility,
    units,
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) {
      return rateLimit.response
    }

    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const units = searchParams.get('units') === 'metric' ? 'metric' : 'imperial'
    const detail = searchParams.get('detail') === '1' || searchParams.get('detail') === 'true'

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const forecast = await fetchOpenMeteoForecast(latitude, longitude, {
      forecastDays: detail ? 7 : 1,
      temperatureUnit: units === 'metric' ? 'celsius' : 'fahrenheit',
      windSpeedUnit: units === 'metric' ? 'kmh' : 'mph',
      precipitationUnit: units === 'metric' ? 'mm' : 'inch',
    })

    const current = buildCurrent(forecast, units)

    if (!detail) {
      return NextResponse.json(current, {
        headers: {
          'Cache-Control': 'public, max-age=600, s-maxage=600',
          ...rateLimit.headers,
        },
      })
    }

    const daily = forecast.daily
    const days: Array<{
      day: string
      highTemp: number
      lowTemp: number
      condition: string
      description: string
    }> = []

    if (daily?.time?.length) {
      const count = Math.min(daily.time.length, 5)
      for (let i = 0; i < count; i++) {
        const code = daily.weather_code?.[i] ?? 0
        const date = new Date(`${daily.time[i]}T12:00:00`)
        days.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          highTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
          lowTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
          condition: getWMOCondition(code),
          description: getWMODescription(code).toLowerCase(),
        })
      }
    }

    const uvIndex = Math.round(forecast.current?.uv_index ?? daily?.uv_index_max?.[0] ?? 0)

    return NextResponse.json(
      {
        current,
        forecast: days,
        uvIndex,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=600, s-maxage=600',
          ...rateLimit.headers,
        },
      },
    )
  } catch (error) {
    console.error('[dashboard-weather]', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 },
    )
  }
}
