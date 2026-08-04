/**
 * 16-Bit Weather Platform - Flight Lookup Service
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Provider-agnostic flight schedule + live position lookup.
 *
 * Fallback chain:
 *   1. FlightAware AeroAPI (real schedule data; HTTPS, x-apikey header).
 *      Replaced AviationStack on 2026-05-10 — that vendor's free tier only
 *      supported HTTP, which transmitted the access_key in cleartext URLs.
 *   2. OpenSky Network (live position by callsign — enrichment only, not gating)
 *   3. Mock (synthesized routes — last resort, response carries `mock: true`)
 *
 * Server-side cache keeps us under provider quotas. The cache lives in-process,
 * so warm Vercel functions share it; cold starts repopulate.
 */

import { createTtlCache } from '@/lib/cache/ttl-cache';
import { tryIncrementAeroApiUsage } from './aeroapi-usage';

export interface AirlineData {
  name: string;
  iata: string;
  icao: string;
}

export interface AirportData {
  icao: string;
  iata: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
}

export type FlightStatus =
  | 'scheduled'
  | 'active'
  | 'landed'
  | 'cancelled'
  | 'diverted';

export interface LivePosition {
  lat: number;
  lon: number;
  altitudeFt: number | null;
  velocityKt: number | null;
  headingDeg: number | null;
  onGround: boolean;
  fetchedAt: number;
}

export interface FlightLookupResult {
  flightNumber: string;
  airline: AirlineData;
  departure: AirportData;
  arrival: AirportData;
  status: FlightStatus;
  livePosition?: LivePosition;
  /** Which provider returned the schedule data. */
  source: 'aeroapi' | 'mock';
  /** True when route data is synthesized rather than from a live provider. */
  mock: boolean;
}

export interface FlightProvider {
  readonly name: 'aeroapi' | 'mock';
  isAvailable(): boolean;
  lookupFlight(
    airlineCode: string,
    flightNum: string,
  ): Promise<FlightLookupResult | null>;
}

// ───────────────────────────────────────────────────────────────
// Reference data (airlines + airports)
// ───────────────────────────────────────────────────────────────

export const AIRLINES: Record<string, AirlineData> = {
  AA: { name: 'American Airlines', iata: 'AA', icao: 'AAL' },
  UA: { name: 'United Airlines', iata: 'UA', icao: 'UAL' },
  DL: { name: 'Delta Air Lines', iata: 'DL', icao: 'DAL' },
  WN: { name: 'Southwest Airlines', iata: 'WN', icao: 'SWA' },
  B6: { name: 'JetBlue Airways', iata: 'B6', icao: 'JBU' },
  AS: { name: 'Alaska Airlines', iata: 'AS', icao: 'ASA' },
  NK: { name: 'Spirit Airlines', iata: 'NK', icao: 'NKS' },
  F9: { name: 'Frontier Airlines', iata: 'F9', icao: 'FFT' },
  G4: { name: 'Allegiant Air', iata: 'G4', icao: 'AAY' },
  HA: { name: 'Hawaiian Airlines', iata: 'HA', icao: 'HAL' },
};

export const AIRPORTS: Record<string, AirportData> = {
  LAX: { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', lat: 33.9425, lon: -118.408 },
  JFK: { icao: 'KJFK', iata: 'JFK', name: 'John F Kennedy International', city: 'New York', lat: 40.6413, lon: -73.7781 },
  ORD: { icao: 'KORD', iata: 'ORD', name: "O'Hare International", city: 'Chicago', lat: 41.9742, lon: -87.9073 },
  SFO: { icao: 'KSFO', iata: 'SFO', name: 'San Francisco International', city: 'San Francisco', lat: 37.6213, lon: -122.379 },
  DFW: { icao: 'KDFW', iata: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', lat: 32.8998, lon: -97.0403 },
  DEN: { icao: 'KDEN', iata: 'DEN', name: 'Denver International', city: 'Denver', lat: 39.8561, lon: -104.6737 },
  ATL: { icao: 'KATL', iata: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', lat: 33.6407, lon: -84.4277 },
  SEA: { icao: 'KSEA', iata: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', lat: 47.4502, lon: -122.3088 },
  MIA: { icao: 'KMIA', iata: 'MIA', name: 'Miami International', city: 'Miami', lat: 25.7959, lon: -80.2870 },
  BOS: { icao: 'KBOS', iata: 'BOS', name: 'Logan International', city: 'Boston', lat: 42.3656, lon: -71.0096 },
  PHX: { icao: 'KPHX', iata: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', lat: 33.4373, lon: -112.0078 },
  LAS: { icao: 'KLAS', iata: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', lat: 36.0840, lon: -115.1537 },
  MSP: { icao: 'KMSP', iata: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', lat: 44.8848, lon: -93.2223 },
  DTW: { icao: 'KDTW', iata: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', lat: 42.2162, lon: -83.3554 },
  EWR: { icao: 'KEWR', iata: 'EWR', name: 'Newark Liberty International', city: 'Newark', lat: 40.6895, lon: -74.1745 },
  IAH: { icao: 'KIAH', iata: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', lat: 29.9902, lon: -95.3368 },
  SAN: { icao: 'KSAN', iata: 'SAN', name: 'San Diego International', city: 'San Diego', lat: 32.7338, lon: -117.1933 },
  HNL: { icao: 'PHNL', iata: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', lat: 21.3187, lon: -157.9225 },
  MCO: { icao: 'KMCO', iata: 'MCO', name: 'Orlando International', city: 'Orlando', lat: 28.4312, lon: -81.3081 },
  CLT: { icao: 'KCLT', iata: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', lat: 35.2144, lon: -80.9473 },
};

const AIRPORTS_BY_IATA = AIRPORTS;
const AIRPORTS_BY_ICAO: Record<string, AirportData> = Object.fromEntries(
  Object.values(AIRPORTS).map((a) => [a.icao, a]),
);

// ───────────────────────────────────────────────────────────────
// Parsing helpers
// ───────────────────────────────────────────────────────────────

export interface ParsedFlightNumber {
  airlineCode: string;
  flightNum: string;
}

export function parseFlightNumber(input: string): ParsedFlightNumber | null {
  const cleaned = input.replace(/\s+/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{2})(\d{1,4})$/);
  if (!match) return null;
  return { airlineCode: match[1], flightNum: match[2] };
}

// ───────────────────────────────────────────────────────────────
// In-process TTL cache
// ───────────────────────────────────────────────────────────────

const SCHEDULE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const POSITION_TTL_MS = 60 * 1000; // 1 minute

const scheduleCache = createTtlCache<FlightLookupResult>({ ttlMs: SCHEDULE_TTL_MS });
const positionCache = createTtlCache<LivePosition>({ ttlMs: POSITION_TTL_MS });

/** Test helper — clears all cached state. */
export function _resetCacheForTests(): void {
  scheduleCache.clear();
  positionCache.clear();
}

// ───────────────────────────────────────────────────────────────
// FlightAware AeroAPI provider (real schedule data)
//
// Auth: x-apikey header (NEVER in URL — that was the AviationStack bug).
// Endpoint: GET /flights/{ident}?ident_type=designator&max_pages=1
// Spec:    https://www.flightaware.com/commercial/aeroapi/resources/aeroapi-openapi.yml
// Pricing: ~$5/month free credit, pay-per-query, ~$0.005/lookup → ~1000/mo.
//
// Spending guard: AeroAPI charges the credit card on file once the free
// credit is exhausted (no vendor-side cap). lib/services/aeroapi-usage.ts
// tracks per-UTC-month usage in Supabase and gates each call. When the cap
// is hit (or the cap-check RPC fails for any reason), this provider returns
// null and the outer cascade serves mock data — fail-closed.
//
// Field mapping (AeroAPI flight → FlightLookupResult):
//   ident_iata / `${operator_iata}${flight_number}`     → flightNumber
//   operator_iata / operator_icao / operator            → airline (curated AIRLINES preferred)
//   origin.code_iata / origin.code_icao                 → departure (curated AIRPORTS lookup)
//   destination.code_iata / destination.code_icao       → arrival   (curated AIRPORTS lookup)
//   cancelled === true → 'cancelled'
//   diverted === true  → 'diverted'
//   else parsed from `status` string (case-insensitive)
//
// Quota / auth failures (401/402/429/5xx) log a warn and return null so the
// outer cascade falls through to MockProvider — UI shows the existing
// "MOCK DATA" badge instead of a broken page. The usage counter is NOT
// decremented on these failures — they consumed something on FlightAware's
// side even when they fail, and over-counting is the safe direction.
// ───────────────────────────────────────────────────────────────

interface AeroApiAirport {
  code?: string | null;
  code_icao?: string | null;
  code_iata?: string | null;
  name?: string | null;
  city?: string | null;
}

interface AeroApiFlight {
  ident?: string | null;
  ident_iata?: string | null;
  ident_icao?: string | null;
  operator?: string | null;
  operator_iata?: string | null;
  operator_icao?: string | null;
  flight_number?: string | null;
  cancelled?: boolean;
  diverted?: boolean;
  origin?: AeroApiAirport | null;
  destination?: AeroApiAirport | null;
  scheduled_out?: string | null;
  scheduled_in?: string | null;
  status?: string | null;
}

interface AeroApiFlightsResponse {
  flights?: AeroApiFlight[];
}

const AEROAPI_BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';
const AEROAPI_TIMEOUT_MS = 8000;

function mapAeroApiStatus(flight: AeroApiFlight): FlightStatus {
  // Boolean flags take precedence — they're the most authoritative signal.
  if (flight.cancelled === true) return 'cancelled';
  if (flight.diverted === true) return 'diverted';
  const raw = (flight.status || '').toLowerCase();
  if (raw.includes('arrived') || raw.includes('landed') || raw.includes('gate arrival')) return 'landed';
  if (raw.includes('en route') || raw.includes('airborne') || raw.includes('taxi')) return 'active';
  return 'scheduled';
}

function airportFromAeroApi(
  raw: AeroApiAirport | null | undefined,
): AirportData | null {
  if (!raw) return null;
  const iata = raw.code_iata?.toUpperCase();
  const icao = raw.code_icao?.toUpperCase();
  if (iata && AIRPORTS_BY_IATA[iata]) return AIRPORTS_BY_IATA[iata];
  if (icao && AIRPORTS_BY_ICAO[icao]) return AIRPORTS_BY_ICAO[icao];
  return null;
}

class AeroApiProvider implements FlightProvider {
  readonly name = 'aeroapi' as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async lookupFlight(
    airlineCode: string,
    flightNum: string,
  ): Promise<FlightLookupResult | null> {
    if (!this.apiKey) return null;

    // App-side monthly cap: atomic check-and-increment via Supabase RPC.
    // Increment fires BEFORE the fetch so a fetch failure still consumes
    // a slot — over-count is the safe direction, under-count means we
    // could blow past the cap. RPC failure / Supabase down also returns
    // !allowed (fail-closed). See lib/services/aeroapi-usage.ts.
    const usage = await tryIncrementAeroApiUsage();
    if (!usage.allowed) {
      return null;
    }

    const flightIata = `${airlineCode}${flightNum}`;
    const url = `${AEROAPI_BASE_URL}/flights/${encodeURIComponent(flightIata)}?ident_type=designator&max_pages=1`;

    let json: AeroApiFlightsResponse;
    try {
      const res = await this.fetchImpl(url, {
        headers: { 'x-apikey': this.apiKey },
        signal: AbortSignal.timeout(AEROAPI_TIMEOUT_MS),
      });
      if (!res.ok) {
        // 401 = bad key; 402 = quota credit exhausted; 429 = rate limit hit.
        // All three should fall through to MockProvider, not surface as 5xx.
        if (res.status === 401 || res.status === 402 || res.status === 429) {
          console.warn(
            `[flight-lookup] AeroAPI ${res.status} (auth/quota/rate) for ${flightIata}; falling back to mock`,
          );
        } else {
          console.warn(`[flight-lookup] AeroAPI returned ${res.status} for ${flightIata}`);
        }
        return null;
      }
      json = (await res.json()) as AeroApiFlightsResponse;
    } catch (err) {
      console.warn(`[flight-lookup] AeroAPI fetch failed:`, err);
      return null;
    }

    // Pick the first non-cancelled leg whose airports both resolve in our
    // curated AIRPORTS table. Mirrors the AviationStack behavior of dropping
    // unknown airports rather than rendering with lat=0,lon=0.
    const flights = json.flights ?? [];
    let chosen: { flight: AeroApiFlight; departure: AirportData; arrival: AirportData } | null = null;
    for (const flight of flights) {
      if (flight.cancelled === true) continue;
      const departure = airportFromAeroApi(flight.origin);
      const arrival = airportFromAeroApi(flight.destination);
      if (departure && arrival) {
        chosen = { flight, departure, arrival };
        break;
      }
    }
    if (!chosen) return null;

    const { flight, departure, arrival } = chosen;
    const operatorIata = flight.operator_iata?.toUpperCase() || airlineCode;
    const operatorIcao = flight.operator_icao?.toUpperCase();
    const airline: AirlineData = AIRLINES[operatorIata] ?? AIRLINES[airlineCode] ?? {
      name: flight.operator || operatorIata,
      iata: operatorIata,
      icao: operatorIcao || operatorIata,
    };

    const flightNumber =
      (flight.operator_iata && flight.flight_number)
        ? `${flight.operator_iata.toUpperCase()}${flight.flight_number}`
        : (flight.ident_iata?.toUpperCase() || flight.ident?.toUpperCase() || flightIata);

    return {
      flightNumber,
      airline,
      departure,
      arrival,
      status: mapAeroApiStatus(flight),
      source: 'aeroapi',
      mock: false,
    };
  }
}

// ───────────────────────────────────────────────────────────────
// Mock provider (last-resort synthesized data)
// ───────────────────────────────────────────────────────────────

interface MockRoute {
  departure: string;
  arrival: string;
}

const MOCK_ROUTES: Record<string, MockRoute> = {
  AA1: { departure: 'JFK', arrival: 'LAX' },
  AA100: { departure: 'JFK', arrival: 'LAX' },
  AA123: { departure: 'LAX', arrival: 'JFK' },
  AA175: { departure: 'DFW', arrival: 'ORD' },
  AA200: { departure: 'MIA', arrival: 'JFK' },
  AA234: { departure: 'ORD', arrival: 'DFW' },
  AA300: { departure: 'LAX', arrival: 'MIA' },
  AA456: { departure: 'DFW', arrival: 'LAX' },
  AA500: { departure: 'JFK', arrival: 'MIA' },
  AA789: { departure: 'PHX', arrival: 'DFW' },
  UA1: { departure: 'SFO', arrival: 'EWR' },
  UA100: { departure: 'EWR', arrival: 'SFO' },
  UA123: { departure: 'ORD', arrival: 'DEN' },
  UA234: { departure: 'SFO', arrival: 'ORD' },
  UA456: { departure: 'SFO', arrival: 'ORD' },
  UA500: { departure: 'DEN', arrival: 'SFO' },
  UA789: { departure: 'IAH', arrival: 'DEN' },
  DL1: { departure: 'JFK', arrival: 'LAX' },
  DL100: { departure: 'ATL', arrival: 'LAX' },
  DL123: { departure: 'JFK', arrival: 'ATL' },
  DL234: { departure: 'ATL', arrival: 'JFK' },
  DL456: { departure: 'MSP', arrival: 'ATL' },
  DL500: { departure: 'DTW', arrival: 'ATL' },
  DL789: { departure: 'SEA', arrival: 'ATL' },
  WN1: { departure: 'LAS', arrival: 'PHX' },
  WN100: { departure: 'DEN', arrival: 'LAS' },
  WN123: { departure: 'LAX', arrival: 'LAS' },
  WN456: { departure: 'PHX', arrival: 'DEN' },
  WN789: { departure: 'ORD', arrival: 'DEN' },
  B6100: { departure: 'JFK', arrival: 'BOS' },
  B6123: { departure: 'BOS', arrival: 'JFK' },
  B6456: { departure: 'JFK', arrival: 'MCO' },
  B6789: { departure: 'BOS', arrival: 'MCO' },
  AS100: { departure: 'SEA', arrival: 'LAX' },
  AS123: { departure: 'SEA', arrival: 'SFO' },
  AS456: { departure: 'LAX', arrival: 'SEA' },
  HA100: { departure: 'HNL', arrival: 'LAX' },
  HA123: { departure: 'HNL', arrival: 'SFO' },
  HA456: { departure: 'LAX', arrival: 'HNL' },
};

function generateMockRoute(flightNum: string): MockRoute {
  const num = parseInt(flightNum, 10);
  const keys = Object.keys(AIRPORTS_BY_IATA);
  const depIndex = num % keys.length;
  let arrIndex = (num * 7 + 3) % keys.length;
  if (arrIndex === depIndex) arrIndex = (arrIndex + 1) % keys.length;
  return { departure: keys[depIndex], arrival: keys[arrIndex] };
}

class MockProvider implements FlightProvider {
  readonly name = 'mock' as const;

  isAvailable(): boolean {
    return true;
  }

  async lookupFlight(
    airlineCode: string,
    flightNum: string,
  ): Promise<FlightLookupResult | null> {
    const airline = AIRLINES[airlineCode];
    if (!airline) return null;

    const formatted = `${airlineCode}${flightNum}`;
    const route = MOCK_ROUTES[formatted] ?? generateMockRoute(flightNum);
    const departure = AIRPORTS_BY_IATA[route.departure];
    const arrival = AIRPORTS_BY_IATA[route.arrival];
    if (!departure || !arrival) return null;

    return {
      flightNumber: formatted,
      airline,
      departure,
      arrival,
      status: 'scheduled',
      source: 'mock',
      mock: true,
    };
  }
}

// ───────────────────────────────────────────────────────────────
// OpenSky live position enrichment
// ───────────────────────────────────────────────────────────────

// State vector tuple per https://openskynetwork.github.io/opensky-api/rest.html
// 0: icao24, 1: callsign, 2: origin_country, 3: time_position, 4: last_contact,
// 5: longitude, 6: latitude, 7: baro_altitude, 8: on_ground, 9: velocity,
// 10: true_track, 11: vertical_rate, 12: sensors, 13: geo_altitude
type OpenSkyStateVector = readonly unknown[];

interface OpenSkyResponse {
  time: number;
  states: OpenSkyStateVector[] | null;
}

const OPENSKY_BASE_URL = 'https://opensky-network.org/api/states/all';

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export async function fetchLivePosition(
  airlineIcao: string,
  flightNum: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<LivePosition | null> {
  if (!fetchImpl) return null;

  // Callsigns are typically ICAO airline + flight number, padded with spaces.
  const callsignPrefix = `${airlineIcao}${flightNum}`.toUpperCase();
  const cacheKey = `pos:${callsignPrefix}`;
  const cached = positionCache.get(cacheKey);
  if (cached) return cached;

  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;
  const headers: Record<string, string> = {};
  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  let json: OpenSkyResponse;
  try {
    const res = await fetchImpl(OPENSKY_BASE_URL, { headers });
    if (!res.ok) return null;
    json = (await res.json()) as OpenSkyResponse;
  } catch (err) {
    console.warn('[flight-lookup] OpenSky fetch failed:', err);
    return null;
  }

  if (!json.states) return null;

  const match = json.states.find((s) => {
    const callsign = asString(s[1])?.trim().toUpperCase();
    return callsign === callsignPrefix;
  });
  if (!match) return null;

  const lon = asNumber(match[5]);
  const lat = asNumber(match[6]);
  if (lat === null || lon === null) return null;

  const altMeters = asNumber(match[13]) ?? asNumber(match[7]);
  const velocityMs = asNumber(match[9]);
  const heading = asNumber(match[10]);
  const onGround = Boolean(match[8]);

  const position: LivePosition = {
    lat,
    lon,
    altitudeFt: altMeters !== null ? Math.round(altMeters * 3.28084) : null,
    velocityKt: velocityMs !== null ? Math.round(velocityMs * 1.94384) : null,
    headingDeg: heading,
    onGround,
    fetchedAt: Date.now(),
  };

  positionCache.set(cacheKey, position);
  return position;
}

// ───────────────────────────────────────────────────────────────
// Public lookup entry point
// ───────────────────────────────────────────────────────────────

export interface LookupOptions {
  /** When false, skip OpenSky live position enrichment. Default: true */
  includeLivePosition?: boolean;
  /** Override providers (test injection). */
  providers?: FlightProvider[];
  /** Override fetch (test injection). */
  fetchImpl?: typeof fetch;
  /** When true, ignore cache for this lookup. */
  bypassCache?: boolean;
  /**
   * When true, skip real providers and return mock data directly. Used by the
   * user-facing "Demo mode" toggle so screenshots/demos don't burn quota.
   */
  forceMock?: boolean;
}

export type LookupErrorCode =
  | 'INVALID_FLIGHT_NUMBER'
  | 'UNKNOWN_AIRLINE'
  | 'FLIGHT_NOT_FOUND';

export interface LookupError {
  code: LookupErrorCode;
  message: string;
}

export type LookupOutcome =
  | { ok: true; result: FlightLookupResult }
  | { ok: false; error: LookupError };

function defaultProviders(fetchImpl: typeof fetch = globalThis.fetch): FlightProvider[] {
  return [
    new AeroApiProvider(process.env.AEROAPI_KEY, fetchImpl),
    new MockProvider(),
  ];
}

export async function lookupFlight(
  rawFlightNumber: string,
  options: LookupOptions = {},
): Promise<LookupOutcome> {
  const parsed = parseFlightNumber(rawFlightNumber);
  if (!parsed) {
    return {
      ok: false,
      error: {
        code: 'INVALID_FLIGHT_NUMBER',
        message:
          'Invalid flight number format. Use airline code + number (e.g., AA123, UA456).',
      },
    };
  }

  const { airlineCode, flightNum } = parsed;
  if (!AIRLINES[airlineCode]) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN_AIRLINE',
        message: `Unknown airline code: ${airlineCode}. Supported airlines: ${Object.keys(AIRLINES).join(', ')}.`,
      },
    };
  }

  // Demo-mode lookups bypass cache entirely so toggling on/off shows the
  // change immediately, and we never want a live result to satisfy a mock
  // request (or vice versa).
  const cacheKey = `flight:${airlineCode}${flightNum}`;
  if (!options.bypassCache && !options.forceMock) {
    const cached = scheduleCache.get(cacheKey);
    if (cached) return { ok: true, result: cached };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const allProviders = options.providers ?? defaultProviders(fetchImpl);
  const providers = options.forceMock
    ? allProviders.filter((p) => p.name === 'mock')
    : allProviders;

  for (const provider of providers) {
    if (!provider.isAvailable()) continue;
    try {
      const result = await provider.lookupFlight(airlineCode, flightNum);
      if (result) {
        // Only cache when the result came from a real provider. The mock
        // path is now reachable from transient AeroAPI failures (cap hit,
        // 401/402/429, RPC failure) — caching that mock would pin
        // synthetic data for SCHEDULE_TTL_MS even after the underlying
        // condition cleared. Same condition we already use to skip live-
        // position enrichment on mock results.
        if (!options.forceMock && !result.mock) {
          scheduleCache.set(cacheKey, result);
        }

        if (options.includeLivePosition !== false && !result.mock) {
          const livePosition = await fetchLivePosition(
            result.airline.icao,
            flightNum,
            fetchImpl,
          ).catch(() => null);
          if (livePosition) {
            const enriched = { ...result, livePosition };
            if (!options.forceMock && !result.mock) {
              scheduleCache.set(cacheKey, enriched);
            }
            return { ok: true, result: enriched };
          }
        }

        return { ok: true, result };
      }
    } catch (err) {
      console.warn(`[flight-lookup] Provider ${provider.name} threw:`, err);
    }
  }

  return {
    ok: false,
    error: {
      code: 'FLIGHT_NOT_FOUND',
      message: 'Flight not found. Check the flight number and try again.',
    },
  };
}
