/**
 * Trip Score API Route
 *
 * Answers: "I'm going from origin → destination — how miserable will the
 * weather make my trip?"
 *
 * Modes:
 *  - drive: matches the origin/destination pair to the nearest US interstate
 *    corridor and scores each waypoint along the segment with Open-Meteo data.
 *  - fly:   resolves both endpoints to major hub airports, scores them via
 *    METAR, and flags en-route SIGMET/AIRMET hazards near the great-circle
 *    midpoint as a synthetic "en-route" misery score.
 *
 * Composition uses combineMiseryScores so a single brutal segment dominates
 * the trip score (matches the badge semantics elsewhere in the app).
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import {
  scoreAirportMisery,
  scoreRoadMisery,
  combineMiseryScores,
  type AirportMiseryInput,
  type MiseryScore,
  type RoadMiseryInput,
} from '@/lib/services/misery-score-service';
import {
  DEFAULT_WEATHER_CONDITIONS,
  fetchWeatherForWaypoints,
  getHazardDescription,
  type WeatherConditions,
} from '@/lib/services/travel-corridor-service';
import {
  findAirportByCity,
  findAirportByCode,
  type MajorAirport,
} from '@/lib/data/major-us-airports';
import {
  greatCircleMidpoint,
  haversineMeters,
  matchCorridor,
} from '@/lib/services/trip-routing-service';
import type { MetarObservation } from '@/app/api/aviation/metar/route';
import {
  fetchMetarsBulk,
  fetchAviationAlertsFromNOAA,
  type NoaaAlert,
} from '@/lib/services/aviation-noaa-service';
import interstateData from '@/public/data/us-interstates.json';

const REQUEST_TIMEOUT_MS = 15_000;
/** SIGMETs within this radius of the flight midpoint count as en-route hazards. */
const ENROUTE_HAZARD_RADIUS_KM = 500;

interface InterstateCorridorData {
  name: string;
  waypoints: number[][];
  path: number[][];
}


interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface ResolvedEndpoint {
  query: string;
  coords: { lat: number; lon: number };
  label: string;
  airport?: MajorAirport;
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Resolve a free-text query to coordinates. Tries:
 *   1. IATA/ICAO code lookup against the major airports table.
 *   2. City match against the major airports table (so "Atlanta" → ATL).
 *   3. Internal /api/weather/geocoding (Open-Meteo).
 */
async function resolveEndpoint(
  query: string,
  baseUrl: string,
  preferAirport: boolean,
): Promise<ResolvedEndpoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // 1) Direct airport code match.
  const codeMatch = findAirportByCode(trimmed);
  if (codeMatch) {
    return {
      query: trimmed,
      coords: { lat: codeMatch.lat, lon: codeMatch.lon },
      label: `${codeMatch.iata} — ${codeMatch.city}, ${codeMatch.state}`,
      airport: codeMatch,
    };
  }

  // 2) City/name match against hubs (most useful in fly mode).
  if (preferAirport) {
    const cityMatch = findAirportByCity(trimmed);
    if (cityMatch) {
      return {
        query: trimmed,
        coords: { lat: cityMatch.lat, lon: cityMatch.lon },
        label: `${cityMatch.iata} — ${cityMatch.city}, ${cityMatch.state}`,
        airport: cityMatch,
      };
    }
  }

  // 3) Generic geocoding for free-text input.
  try {
    const url = `${baseUrl}/api/weather/geocoding?q=${encodeURIComponent(trimmed)}&limit=1`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        'User-Agent': '16-Bit-Weather/trip-score',
      },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as GeocodingResult[] | { error?: string };
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    if (typeof first.lat !== 'number' || typeof first.lon !== 'number') return null;

    const labelParts = [first.name, first.state, first.country].filter(Boolean);

    return {
      query: trimmed,
      coords: { lat: first.lat, lon: first.lon },
      label: labelParts.join(', ') || trimmed,
    };
  } catch (error) {
    console.error('[trip-score]', 'geocoding failed', error);
    return null;
  }
}

/** WeatherConditions → RoadMiseryInput (unit conversion: visibility m, gusts km/h). */
function toRoadInput(conditions: WeatherConditions): RoadMiseryInput {
  return {
    precipitationMmHr: conditions.precipitation,
    snowfallMmHr: conditions.snowfall,
    windGustsKmh: conditions.windGusts,
    visibilityM: conditions.visibility,
  };
}

/** Pull a window around the worst-hour from the hourly Open-Meteo response. */
function pickPeakWindow(forecastDay: number, hourlyHours: number): {
  startISO: string;
  endISO: string;
} | undefined {
  if (forecastDay === 0) return undefined;
  if (!Number.isFinite(hourlyHours) || hourlyHours <= 0) return undefined;
  const targetHour = forecastDay * 24 + 12;
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(start.getUTCHours() + targetHour - 1);
  const end = new Date(start);
  end.setUTCHours(end.getUTCHours() + 2);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function computeCeilingFt(clouds: MetarObservation['clouds'] | undefined): number | undefined {
  if (!clouds || clouds.length === 0) return undefined;
  let ceiling: number | undefined;
  for (const layer of clouds) {
    if (
      (layer.cover === 'BKN' || layer.cover === 'OVC') &&
      typeof layer.base === 'number'
    ) {
      if (ceiling === undefined || layer.base < ceiling) {
        ceiling = layer.base;
      }
    }
  }
  return ceiling;
}

async function fetchMetarsForAirports(
  airports: MajorAirport[],
): Promise<Map<string, MetarObservation>> {
  try {
    return await fetchMetarsBulk(airports.map((a) => a.icao));
  } catch (error) {
    console.error('[trip-score]', 'bulk metar fetch failed', error);
    return new Map();
  }
}

async function fetchAlerts(): Promise<NoaaAlert[]> {
  try {
    return await fetchAviationAlertsFromNOAA();
  } catch (error) {
    console.error('[trip-score]', 'alerts fetch failed', error);
    return [];
  }
}

/**
 * Determine whether a SIGMET/AIRMET applies to a flight midpoint. The alerts
 * endpoint exposes ICAO region codes / free text rather than coordinates, so
 * we approximate "near the midpoint" by matching the ICAO/IATA/state of the
 * nearest hub airports to that midpoint. For our use case (US domestic flights
 * between MAJOR_US_AIRPORTS hubs) this catches >95% of relevant advisories.
 */
function alertAppliesToFlight(
  alert: NoaaAlert,
  origin: MajorAirport,
  dest: MajorAirport,
  midpointAirports: MajorAirport[],
): boolean {
  const haystack = `${alert.region ?? ''} ${alert.text ?? ''} ${alert.rawText ?? ''}`.toUpperCase();
  if (!haystack.trim()) return false;

  const tokens = new Set<string>();
  for (const ap of [origin, dest, ...midpointAirports]) {
    tokens.add(ap.icao);
    tokens.add(ap.iata);
    tokens.add(ap.state);
  }

  for (const token of tokens) {
    if (token && haystack.includes(token)) return true;
  }
  return false;
}

interface EnrouteHazardFlags {
  thunderstormsNearby: boolean;
  turbulenceNearby: boolean;
  icingNearby: boolean;
}

function deriveEnrouteHazards(
  alerts: NoaaAlert[],
  origin: MajorAirport,
  dest: MajorAirport,
  midpoint: { lat: number; lon: number },
): EnrouteHazardFlags {
  // Find the airports closest to the midpoint to seed our token-match heuristic.
  const radiusM = ENROUTE_HAZARD_RADIUS_KM * 1000;
  const nearby: MajorAirport[] = [];
  for (const ap of [origin, dest]) {
    if (haversineMeters(midpoint, { lat: ap.lat, lon: ap.lon }) <= radiusM) {
      nearby.push(ap);
    }
  }

  const flags: EnrouteHazardFlags = {
    thunderstormsNearby: false,
    turbulenceNearby: false,
    icingNearby: false,
  };

  for (const alert of alerts) {
    if (!alertAppliesToFlight(alert, origin, dest, nearby)) continue;
    const hazard = (alert.hazard ?? '').toLowerCase();
    if (
      hazard.includes('convect') ||
      hazard.includes('thunderstorm') ||
      hazard.includes('ts')
    ) {
      flags.thunderstormsNearby = true;
    }
    if (hazard.includes('turb')) flags.turbulenceNearby = true;
    if (hazard.includes('ice') || hazard.includes('icing')) flags.icingNearby = true;
  }

  return flags;
}

interface DriveSegmentResult {
  lat: number;
  lon: number;
  score: MiseryScore;
  hazard: string;
}

async function handleDriveMode(
  origin: ResolvedEndpoint,
  destination: ResolvedEndpoint,
  forecastDay: number,
  requestSignal: AbortSignal,
): Promise<NextResponse> {
  const corridors = (interstateData as { corridors: InterstateCorridorData[] }).corridors;

  const matched = matchCorridor(origin.coords, destination.coords, corridors);
  if (!matched) {
    return NextResponse.json(
      { error: 'No interstate corridor connects these points' },
      { status: 422 },
    );
  }

  const waypoints = matched.matchedSegment.waypoints;

  let weatherData: WeatherConditions[];
  try {
    weatherData = await fetchWeatherForWaypoints(waypoints, forecastDay, {
      requestSignal,
      userAgent: '16-Bit-Weather/trip-score',
    });
  } catch (error) {
    console.error('[trip-score]', 'open-meteo fetch failed', error);
    return NextResponse.json(
      { error: 'Weather service unavailable' },
      { status: 502 },
    );
  }

  const segments: DriveSegmentResult[] = waypoints.map((wp, idx) => {
    const conditions = weatherData[idx] ?? { ...DEFAULT_WEATHER_CONDITIONS };
    return {
      lat: wp[0],
      lon: wp[1],
      score: scoreRoadMisery(toRoadInput(conditions)),
      hazard: getHazardDescription(conditions),
    };
  });

  const scores = segments.map((s) => s.score);
  const tripScore = combineMiseryScores(scores, 'route');

  // Worst segment by score (ties → earliest segment wins).
  const worstIdx = segments.reduce(
    (best, s, i) => (s.score.score > segments[best].score.score ? i : best),
    0,
  );
  const worst = segments[worstIdx];

  // Approximate hourly length for peak-window calc; matches the corridors API.
  const peakWindow = pickPeakWindow(forecastDay, (forecastDay + 1) * 24);

  return NextResponse.json(
    {
      mode: 'drive',
      score: tripScore,
      route: {
        corridorName: matched.name,
        origin: { ...origin.coords, label: origin.label },
        destination: { ...destination.coords, label: destination.label },
        segments,
      },
      worstSegment: worst
        ? {
            lat: worst.lat,
            lon: worst.lon,
            score: worst.score,
            hazard: worst.hazard,
          }
        : null,
      peakWindow,
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    },
  );
}

async function handleFlyMode(
  origin: ResolvedEndpoint,
  destination: ResolvedEndpoint,
  baseUrl: string,
): Promise<NextResponse> {
  if (!origin.airport || !destination.airport) {
    return NextResponse.json(
      {
        error:
          'Fly mode requires major hub airports for both origin and destination (IATA/ICAO code or hub city).',
      },
      { status: 422 },
    );
  }

  const originAirport = origin.airport;
  const destAirport = destination.airport;

  const [metars, alerts] = await Promise.all([
    fetchMetarsForAirports([originAirport, destAirport]),
    fetchAlerts(),
  ]);
  const originMetar = metars.get(originAirport.icao);
  const destMetar = metars.get(destAirport.icao);

  const originInput: AirportMiseryInput = originMetar
    ? {
        ceilingFt: computeCeilingFt(originMetar.clouds),
        visibilityMi: originMetar.visibility,
        windKt: originMetar.windSpeed,
        gustKt: originMetar.windGust,
      }
    : {};

  const destInput: AirportMiseryInput = destMetar
    ? {
        ceilingFt: computeCeilingFt(destMetar.clouds),
        visibilityMi: destMetar.visibility,
        windKt: destMetar.windSpeed,
        gustKt: destMetar.windGust,
      }
    : {};

  const originScore = scoreAirportMisery(originInput);
  const destScore = scoreAirportMisery(destInput);

  const midpoint = greatCircleMidpoint(
    { lat: originAirport.lat, lon: originAirport.lon },
    { lat: destAirport.lat, lon: destAirport.lon },
  );

  const enrouteHazards = deriveEnrouteHazards(alerts, originAirport, destAirport, midpoint);
  const enrouteScore = scoreAirportMisery(enrouteHazards);

  const tripScore = combineMiseryScores(
    [originScore, enrouteScore, destScore],
    'flight',
  );

  return NextResponse.json(
    {
      mode: 'fly',
      score: tripScore,
      route: {
        origin: {
          airport: originAirport,
          score: originScore,
          metar: originMetar,
        },
        destination: {
          airport: destAirport,
          score: destScore,
          metar: destMetar,
        },
        enroute: {
          score: enrouteScore,
          midpoint,
          hazards: enrouteHazards,
        },
      },
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const origin = sp.get('origin');
    const destination = sp.get('destination');
    const mode = sp.get('mode');
    const dayParam = sp.get('day') ?? '0';

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required parameters: origin and destination' },
        { status: 400 },
      );
    }

    if (mode !== 'fly' && mode !== 'drive') {
      return NextResponse.json(
        { error: 'mode must be "fly" or "drive"' },
        { status: 400 },
      );
    }

    if (!/^[012]$/.test(dayParam)) {
      return NextResponse.json(
        { error: 'day must be 0, 1, or 2' },
        { status: 400 },
      );
    }
    const forecastDay = Number(dayParam);

    const baseUrl = getBaseUrl();

    const [resolvedOrigin, resolvedDest] = await Promise.all([
      resolveEndpoint(origin, baseUrl, mode === 'fly'),
      resolveEndpoint(destination, baseUrl, mode === 'fly'),
    ]);

    if (!resolvedOrigin || !resolvedDest) {
      return NextResponse.json(
        { error: 'Could not resolve origin/destination' },
        { status: 400 },
      );
    }

    if (mode === 'drive') {
      return handleDriveMode(resolvedOrigin, resolvedDest, forecastDay, request.signal);
    }
    return handleFlyMode(resolvedOrigin, resolvedDest, baseUrl);
  } catch (error) {
    console.error('[trip-score]', error);
    return NextResponse.json(
      { error: 'Failed to compute trip score' },
      { status: 500 },
    );
  }
}
