import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { fetchOpenMeteoForecast } from '@/lib/open-meteo'
import { getWMODescription } from '@/lib/wmo-codes'

/**
 * Map WMO weather code + is_day to an OWM-style icon code
 * so getWeatherIcon() in lib/dashboard-weather.ts returns the correct emoji.
 */
function wmoToOWMIcon(code: number, isDay: number): string {
  const d = isDay ? 'd' : 'n';
  if (code === 0) return `01${d}`;                          // clear
  if (code === 1) return `02${d}`;                          // mainly clear
  if (code === 2) return `03${d}`;                          // partly cloudy
  if (code === 3) return `04${d}`;                          // overcast
  if (code === 45 || code === 48) return `50${d}`;          // fog
  if (code >= 51 && code <= 57) return `09${d}`;            // drizzle
  if (code >= 61 && code <= 67) return `10${d}`;            // rain
  if (code >= 71 && code <= 77) return `13${d}`;            // snow
  if (code >= 80 && code <= 82) return `09${d}`;            // rain showers
  if (code >= 85 && code <= 86) return `13${d}`;            // snow showers
  if (code >= 95) return `11${d}`;                          // thunderstorm
  return `02${d}`;
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

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    // Phase 2: Use Open-Meteo instead of OpenWeatherMap
    const forecast = await fetchOpenMeteoForecast(latitude, longitude, {
      forecastDays: 1,
      temperatureUnit: units === 'metric' ? 'celsius' : 'fahrenheit',
      windSpeedUnit: units === 'metric' ? 'kmh' : 'mph',
      precipitationUnit: units === 'metric' ? 'mm' : 'inch',
    })

    const current = forecast.current
    const hourly = forecast.hourly

    // Find current hour's visibility (Open-Meteo returns meters regardless of unit prefs)
    const now = new Date()
    let visibilityRaw = 10000
    if (hourly?.time && hourly?.visibility) {
      for (let i = 0; i < hourly.time.length; i++) {
        if (new Date(hourly.time[i]) >= now) {
          visibilityRaw = hourly.visibility[i] ?? 10000
          break
        }
      }
    }
    const visibility =
      units === 'metric'
        ? Math.round(visibilityRaw / 1000) // km
        : Math.round(visibilityRaw / 1609) // miles

    // Transform to dashboard format (same shape as before)
    const dashboardWeather = {
      temperature: Math.round(current?.temperature_2m ?? 0),
      description: getWMODescription(current?.weather_code ?? 0).toLowerCase(),
      humidity: current?.relative_humidity_2m ?? 0,
      windSpeed: Math.round(current?.wind_speed_10m ?? 0),
      icon: wmoToOWMIcon(current?.weather_code ?? 0, current?.is_day ?? 1),
      feelsLike: Math.round(current?.apparent_temperature ?? 0),
      pressure: Math.round(current?.surface_pressure ?? 1013),
      visibility,
      units,
    }

    return NextResponse.json(dashboardWeather, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=600',
        ...rateLimit.headers,
      },
    })

  } catch (error) {
    console.error('Dashboard weather API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    )
  }
}
