import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo';

// GET /api/open-meteo/air-quality?lat=..&lon=..
export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const sp = request.nextUrl.searchParams;
    const lat = sp.get('lat');
    const lon = sp.get('lon');

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

    const data = await fetchOpenMeteoAirQuality(latitude, longitude);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        ...rateLimit.headers,
      },
    });
  } catch (error) {
    console.error('[Open-Meteo Air Quality API] Error:', error);
    return NextResponse.json(
      { error: 'Air quality service unavailable' },
      { status: 502 }
    );
  }
}
