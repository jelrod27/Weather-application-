import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logRouteError } from '@/lib/error-utils';
import { withApiRoute } from '@/lib/api/with-api-route';
import { parseStargazerCoordinates } from '@/lib/stargazer/context';
import {
  buildStargazerPayload,
  StargazerWeatherUnavailableError,
} from '@/lib/stargazer/build-payload';

export const revalidate = 900;

export async function GET(request: NextRequest) {
  return withApiRoute(request, async () => {
    const { searchParams } = request.nextUrl;
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    if (!latStr || !lonStr) {
      return NextResponse.json(
        { error: 'lat and lon query parameters are required' },
        { status: 400 },
      );
    }

    const coordinates = parseStargazerCoordinates(latStr, lonStr);
    if (!coordinates) {
      return NextResponse.json(
        { error: 'Invalid lat/lon values. lat must be -90..90, lon must be -180..180' },
        { status: 400 },
      );
    }

    try {
      const data = await buildStargazerPayload(coordinates.lat, coordinates.lon);
      return NextResponse.json(data);
    } catch (error) {
      if (error instanceof StargazerWeatherUnavailableError) {
        return NextResponse.json(
          { error: 'Failed to fetch weather data from Open-Meteo' },
          { status: 502 },
        );
      }
      logRouteError('Stargazer', error);
      return NextResponse.json(
        { error: 'Internal server error while computing stargazer forecast' },
        { status: 500 },
      );
    }
  }, { rateLimitBucket: 'content' });
}
