/**
 * Resolve callsign → origin/destination using adsb.lol standing-data
 * (vradarserver routes), with optional plausible-route GET as fallback.
 *
 * POST /api/0/routeset currently returns empty 201 bodies in production,
 * so we do not rely on it as the primary source.
 */

import {
  aviationUrl,
  fetchAviationUpstream,
  sanitizeCallsign,
} from './fetch-aviation-upstream';

export type ResolvedAirport = {
  icao: string;
  iata: string | null;
  name: string | null;
  lat: number | null;
  lon: number | null;
};

export type ResolvedRoute = {
  callsign: string;
  origin: string | null;
  destination: string | null;
  originAirport: ResolvedAirport | null;
  destinationAirport: ResolvedAirport | null;
  airportCodes: string | null;
  source: 'standing-data' | 'adsb-route' | 'unknown';
};

function asAirport(raw: unknown): ResolvedAirport | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const icao = typeof row.icao === 'string' ? row.icao.trim().toUpperCase() : '';
  if (!icao) return null;
  const lat = typeof row.lat === 'number' ? row.lat : null;
  const lon = typeof row.lon === 'number' ? row.lon : null;
  return {
    icao,
    iata: typeof row.iata === 'string' ? row.iata.trim().toUpperCase() : null,
    name: typeof row.name === 'string' ? row.name : null,
    lat,
    lon,
  };
}

export function fromStandingPayload(callsign: string, raw: unknown): ResolvedRoute | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const codes =
    typeof row.airport_codes === 'string' ? row.airport_codes.trim().toUpperCase() : '';
  if (!codes || codes === 'UNKNOWN') return null;

  const airports = Array.isArray(row._airports)
    ? row._airports.map(asAirport).filter((a): a is ResolvedAirport => a != null)
    : [];

  let origin: string | null = null;
  let destination: string | null = null;
  if (codes.includes('-')) {
    const [o, d] = codes.split('-');
    origin = o?.trim() || null;
    destination = d?.trim() || null;
  }

  const originAirport = airports[0] ?? null;
  const destinationAirport = airports[airports.length - 1] ?? null;

  return {
    callsign,
    origin: originAirport?.iata ?? originAirport?.icao ?? origin,
    destination: destinationAirport?.iata ?? destinationAirport?.icao ?? destination,
    originAirport,
    destinationAirport,
    airportCodes: codes,
    source: 'standing-data',
  };
}

/** Standing-data path uses airline prefix folder (first 2 chars of callsign). */
export function standingDataRouteUrl(callsign: string): URL {
  const cs = sanitizeCallsign(callsign) ?? '';
  const folder = cs.slice(0, 2);
  return aviationUrl(
    'https://vrs-standing-data.adsb.lol',
    `/routes/${folder}/${cs}.json`,
  );
}

export async function resolveRouteForCallsign(
  callsign: string,
  lat?: number,
  lng?: number,
): Promise<ResolvedRoute> {
  const cs = sanitizeCallsign(callsign) ?? '';
  const empty: ResolvedRoute = {
    callsign: cs || callsign.trim().toUpperCase(),
    origin: null,
    destination: null,
    originAirport: null,
    destinationAirport: null,
    airportCodes: null,
    source: 'unknown',
  };
  if (!cs) return empty;

  try {
    const res = await fetchAviationUpstream(standingDataRouteUrl(cs), {
      timeoutMs: 6_000,
      maxRetries: 1,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const parsed = fromStandingPayload(cs, await res.json());
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('[resolve-route] standing-data failed:', err);
  }

  // Fallback: GET /api/0/route/{callsign}/{lat}/{lng}
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      const url = aviationUrl(
        'https://api.adsb.lol',
        `/api/0/route/${cs}/${lat}/${lng}`,
      );
      const res = await fetchAviationUpstream(url, {
        timeoutMs: 6_000,
        maxRetries: 1,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const parsed = fromStandingPayload(cs, await res.json());
        if (parsed) return { ...parsed, source: 'adsb-route' };
      }
    } catch (err) {
      console.warn('[resolve-route] adsb route GET failed:', err);
    }
  }

  return empty;
}
