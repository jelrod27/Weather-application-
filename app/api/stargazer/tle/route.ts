import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export const revalidate = 86400;

const CELESTRAK_ISS_URL =
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';

export async function GET() {
  try {
    const res = await fetchWithTimeout(CELESTRAK_ISS_URL, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.error('[TLE Proxy] CelesTrak HTTP error:', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch TLE data from CelesTrak' },
        { status: 502 },
      );
    }

    const text = await res.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('[TLE Proxy] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching TLE data' },
      { status: 500 },
    );
  }
}
