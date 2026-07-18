import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) return rateLimit.response;

    const hex = request.nextUrl.searchParams.get('hex')?.trim().toLowerCase() ?? '';
    if (!/^[0-9a-f]{6}$/.test(hex)) {
      return NextResponse.json(
        { error: 'hex must be a 6-char ICAO24' },
        { status: 400, headers: rateLimit.headers },
      );
    }

    const res = await fetchWithTimeout(
      `https://api.planespotters.net/pub/photos/hex/${hex}`,
      { timeoutMs: 8_000, maxRetries: 1, headers: { Accept: 'application/json' } },
    );

    if (!res.ok) {
      return NextResponse.json(
        { photos: [], error: `Photo upstream ${res.status}` },
        { status: 502, headers: rateLimit.headers },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        ...rateLimit.headers,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[aviation/aircraft/photo]', err);
    return NextResponse.json({ photos: [], error: 'Photo lookup failed' }, { status: 502 });
  }
}
