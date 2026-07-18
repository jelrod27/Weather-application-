/**
 * NOAA-only flight weather brief for an origin/destination airport pair.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { findAirportByCode } from '@/lib/data/major-us-airports';
import {
  fetchAviationAlertsFromNOAA,
  fetchMetarsBulk,
} from '@/lib/services/aviation-noaa-service';
import { scoreFlightBrief, type FlightCategory } from '@/lib/aviation/brief-score';
import { pointNearCorridor, sampleGreatCircle } from '@/lib/aviation/route-corridor';
import { buildWeatherDrivers } from '@/lib/aviation/weather-drivers';

function normalizeCategory(value: string | undefined): FlightCategory {
  const v = (value ?? 'UNKNOWN').toUpperCase();
  if (v === 'VFR' || v === 'MVFR' || v === 'IFR' || v === 'LIFR') return v;
  return 'UNKNOWN';
}

function resolveAirport(code: string) {
  const found = findAirportByCode(code);
  if (found) return found;
  // Allow raw ICAO even if not in hub list — METAR fetch may still work
  const upper = code.trim().toUpperCase();
  if (/^K?[A-Z]{3,4}$/.test(upper)) {
    return {
      iata: upper.length === 4 && upper.startsWith('K') ? upper.slice(1) : upper.slice(0, 3),
      icao: upper.length === 3 ? `K${upper}` : upper,
      name: upper,
      city: upper,
      state: '',
      lat: NaN,
      lon: NaN,
      tzOffset: 0,
    };
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) return rateLimit.response;

    const originParam = request.nextUrl.searchParams.get('origin')?.trim() ?? '';
    const destParam = request.nextUrl.searchParams.get('dest')?.trim() ?? '';
    if (!originParam || !destParam) {
      return NextResponse.json(
        { error: 'origin and dest airport codes are required' },
        { status: 400, headers: rateLimit.headers },
      );
    }

    const origin = resolveAirport(originParam);
    const dest = resolveAirport(destParam);
    if (!origin || !dest) {
      return NextResponse.json(
        { error: 'Could not resolve origin/dest airports' },
        { status: 400, headers: rateLimit.headers },
      );
    }

    const [metars, alerts] = await Promise.all([
      fetchMetarsBulk([origin.icao, dest.icao]),
      fetchAviationAlertsFromNOAA(),
    ]);

    const originMetar = metars.get(origin.icao) ?? null;
    const destMetar = metars.get(dest.icao) ?? null;
    const originCategory = normalizeCategory(originMetar?.flightCategory);
    const destCategory = normalizeCategory(destMetar?.flightCategory);

    const hasCoords =
      Number.isFinite(origin.lat)
      && Number.isFinite(origin.lon)
      && Number.isFinite(dest.lat)
      && Number.isFinite(dest.lon);

    const corridor = hasCoords
      ? sampleGreatCircle(
          { lat: origin.lat, lon: origin.lon },
          { lat: dest.lat, lon: dest.lon },
          20,
        )
      : [];

    // Alerts lack reliable polygons here — use midpoint heuristic via region text + count
    // Prefer intersecting when we can parse coords from raw text (rare). Otherwise count active SIGMETs.
    const intersecting = alerts.filter((a) => {
      if (!hasCoords || corridor.length === 0) return a.type === 'SIGMET';
      // Without geometry, treat SIGMETs as corridor-relevant; AIRMETs only if severe-ish
      if (a.type === 'SIGMET') return true;
      return a.severity === 'severe' || a.severity === 'extreme';
    });

    // If we somehow have lat/lon tokens in region, filter tighter
    const refined = intersecting.filter((a) => {
      const m = a.region.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
      if (!m || !hasCoords) return true;
      const lat = Number(m[1]);
      const lon = Number(m[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return true;
      return pointNearCorridor({ lat, lon }, corridor, 150);
    });

    const hasSevere = refined.some(
      (a) => a.severity === 'severe' || a.severity === 'extreme' || a.type === 'SIGMET',
    );

    const brief = scoreFlightBrief({
      originCategory,
      destCategory,
      intersectingHazardCount: refined.length,
      hasSevereHazard: hasSevere,
    });

    const drivers = buildWeatherDrivers({
      originIata: origin.iata,
      destIata: dest.iata,
      originCategory,
      destCategory,
      hazards: refined.slice(0, 5).map((a) => ({
        type: a.type,
        hazard: a.hazard,
        severity: a.severity,
      })),
    });

    return NextResponse.json(
      {
        origin: {
          iata: origin.iata,
          icao: origin.icao,
          category: originCategory,
          metar: originMetar?.raw ?? null,
        },
        destination: {
          iata: dest.iata,
          icao: dest.icao,
          category: destCategory,
          metar: destMetar?.raw ?? null,
        },
        level: brief.level,
        summary: brief.summary,
        score: brief.score,
        drivers,
        hazards: refined.slice(0, 8).map((a) => ({
          id: a.id,
          type: a.type,
          hazard: a.hazard,
          severity: a.severity,
          validTo: a.validTo,
          text: a.text,
        })),
        validUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
        disclaimer: 'Educational weather context only — not for operational dispatch or flight planning.',
      },
      {
        headers: {
          ...rateLimit.headers,
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error('[aviation/flight-brief]', err);
    return NextResponse.json({ error: 'Flight brief unavailable' }, { status: 502 });
  }
}
