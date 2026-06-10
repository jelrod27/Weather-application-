import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { fetchOpenMeteoForecast } from '@/lib/open-meteo';

// GET /api/open-meteo/forecast?lat=..&lon=..&days=7
export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const sp = request.nextUrl.searchParams;
    const lat = sp.get('lat');
    const lon = sp.get('lon');
    const days = sp.get('days');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates provided' },
        { status: 400 }
      );
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Allowlist unit values — they're forwarded into the upstream Open-Meteo URL.
    const tempUnitParam = sp.get('temperature_unit');
    const windUnitParam = sp.get('wind_speed_unit');
    const precipUnitParam = sp.get('precipitation_unit');
    const temperatureUnit: 'celsius' | 'fahrenheit' =
      tempUnitParam === 'celsius' ? 'celsius' : 'fahrenheit';
    const windSpeedUnit: 'mph' | 'kmh' | 'ms' | 'kn' =
      windUnitParam === 'kmh' || windUnitParam === 'ms' || windUnitParam === 'kn'
        ? windUnitParam
        : 'mph';
    const precipitationUnit: 'inch' | 'mm' = precipUnitParam === 'mm' ? 'mm' : 'inch';

    const parsedDays = days ? parseInt(days, 10) : 7;
    const forecastDays = Number.isNaN(parsedDays) ? 7 : Math.min(Math.max(parsedDays, 1), 16);
    const data = await fetchOpenMeteoForecast(latitude, longitude, {
      forecastDays,
      temperatureUnit,
      windSpeedUnit,
      precipitationUnit,
    });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=900, s-maxage=900',
        ...rateLimit.headers,
      },
    });
  } catch (error) {
    console.error('[Open-Meteo Forecast API] Error:', error);
    return NextResponse.json(
      { error: 'Weather service unavailable' },
      { status: 502 }
    );
  }
}
