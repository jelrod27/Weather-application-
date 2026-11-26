import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withApiRoute } from '@/lib/api/with-api-route';
import { fetchUpcomingLaunches } from '@/lib/stargazer/launches';

export async function GET(request: NextRequest): Promise<Response> {
  return withApiRoute(request, async () => {
    const launches = await fetchUpcomingLaunches();
    return launches === null
      ? NextResponse.json({ error: 'Launch schedule unavailable' }, { status: 502 })
      : NextResponse.json(launches);
  }, { rateLimitBucket: 'content' });
}
