import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export type AircraftRouteInfo = {
  callsign: string;
  origin: string | null;
  destination: string | null;
  raw: unknown;
};

/**
 * Proxy adsb.lol routeset. Response shape varies; we extract common airport codes.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) return rateLimit.response;

    const callsign = request.nextUrl.searchParams.get('callsign')?.trim().toUpperCase() ?? '';
    const lat = Number(request.nextUrl.searchParams.get('lat'));
    const lon = Number(request.nextUrl.searchParams.get('lon'));
    if (!callsign || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: 'callsign, lat, and lon are required' },
        { status: 400, headers: rateLimit.headers },
      );
    }

    const res = await fetchWithTimeout('https://api.adsb.lol/api/0/routeset', {
      method: 'POST',
      timeoutMs: 8_000,
      maxRetries: 1,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planes: [{ callsign, lat, lon }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Routeset upstream ${res.status}`, origin: null, destination: null },
        { status: 502, headers: rateLimit.headers },
      );
    }

    const raw = await res.json();
    const parsed = parseRouteset(callsign, raw);
    return NextResponse.json(
      { ...parsed, raw },
      {
        headers: {
          ...rateLimit.headers,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      },
    );
  } catch (err) {
    console.error('[aviation/aircraft/route]', err);
    return NextResponse.json(
      { error: 'Route lookup failed', origin: null, destination: null },
      { status: 502 },
    );
  }
}

function parseRouteset(callsign: string, raw: unknown): AircraftRouteInfo {
  let origin: string | null = null;
  let destination: string | null = null;

  const candidates: unknown[] = [];
  if (Array.isArray(raw)) candidates.push(...raw);
  else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['routes', 'data', 'planes', 'aircraft']) {
      if (Array.isArray(obj[key])) candidates.push(...(obj[key] as unknown[]));
    }
    candidates.push(obj);
  }

  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const cs = String(row.callsign ?? row.flight ?? '').trim().toUpperCase();
    if (cs && cs !== callsign) continue;
    origin =
      asAirport(row._airport ?? row.origin ?? row.from ?? row.dep ?? row.airport_from) ?? origin;
    destination =
      asAirport(
        row._airport_dest
          ?? row.destination
          ?? row.to
          ?? row.arr
          ?? row.airport_to
          ?? row._airport,
      ) ?? destination;

    // Some payloads use "XXXX-YYYY" in a single field
    const routeStr = asAirport(row.route ?? row._route ?? row.path);
    if (routeStr?.includes('-')) {
      const [o, d] = routeStr.split('-');
      origin = origin ?? asAirport(o);
      destination = destination ?? asAirport(d);
    }
  }

  return { callsign, origin, destination, raw };
}

function asAirport(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim().toUpperCase();
  if (/^[A-Z]{3,4}$/.test(t)) return t;
  if (/^[A-Z]{3,4}-[A-Z]{3,4}$/.test(t)) return t;
  return null;
}
