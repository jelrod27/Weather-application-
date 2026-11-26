import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withApiRoute } from '@/lib/api/with-api-route';
import { parseStargazerCoordinates } from '@/lib/stargazer/context';
import { fetchUpcomingISSPasses } from '@/lib/stargazer/iss-passes';

export async function GET(request: NextRequest): Promise<Response> {
  return withApiRoute(request, async () => {
    const params = request.nextUrl.searchParams;
    const coordinates = parseStargazerCoordinates(params.get('lat'), params.get('lon'));
    if (!coordinates) {
      return NextResponse.json({ error: 'Valid lat and lon query parameters are required' }, { status: 400 });
    }
    const passes = await fetchUpcomingISSPasses(coordinates.lat, coordinates.lon);
    return passes === null
      ? NextResponse.json({ error: 'ISS pass data unavailable' }, { status: 502 })
      : NextResponse.json(passes);
  }, { rateLimitBucket: 'content' });
}
