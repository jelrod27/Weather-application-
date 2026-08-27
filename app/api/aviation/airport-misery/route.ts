/**
 * 16-Bit Weather Platform - Airport Misery Board API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Aggregates METAR observations + SIGMET/AIRMET advisories across the top US
 * hub airports, scores each one with the unified misery model, and returns a
 * sortable board for the aviation page.
 *
 * Data fetches go directly to NOAA via aviation-noaa-service so we don't have
 * to spawn 30 self-fetched serverless invocations per request (which silently
 * failed on Vercel when NEXT_PUBLIC_BASE_URL was misconfigured to localhost).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  MAJOR_US_AIRPORTS,
  type MajorAirport,
} from '@/lib/data/major-us-airports';
import {
  scoreAirportMisery,
  type AirportMiseryInput,
  type MiseryScore,
} from '@/lib/services/misery-score-service';
import {
  fetchMetarsBulk,
  fetchAviationAlertsFromNOAA,
  type NoaaAlert,
} from '@/lib/services/aviation-noaa-service';
import type { MetarObservation } from '@/lib/aviation/metar'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface AirportMiseryRow {
  airport: MajorAirport;
  score: MiseryScore;
  metar?: MetarObservation;
  isStale?: boolean;
}

interface AirportMiseryResponse {
  airports: AirportMiseryRow[];
  fetchedAt: string;
}

/**
 * Compute ceiling (in feet AGL) from METAR cloud layers.
 * Ceiling = base of the lowest BKN or OVC layer.
 */
function computeCeilingFt(
  clouds: MetarObservation['clouds'] | undefined,
): number | undefined {
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

/**
 * Determine whether an active SIGMET/AIRMET applies to a given airport.
 * Heuristic: text mentions the airport's ICAO, IATA, or state code.
 */
function alertAppliesToAirport(alert: NoaaAlert, airport: MajorAirport): boolean {
  const haystack = `${alert.region ?? ''} ${alert.text ?? ''} ${alert.rawText ?? ''}`.toUpperCase();
  if (!haystack.trim()) return false;

  if (haystack.includes(airport.icao) || haystack.includes(airport.iata)) return true;
  return haystack.includes(airport.state);
}

interface HazardFlags {
  thunderstormsNearby: boolean;
  turbulenceNearby: boolean;
  icingNearby: boolean;
}

function hazardFlagsFor(airport: MajorAirport, alerts: NoaaAlert[]): HazardFlags {
  const flags: HazardFlags = {
    thunderstormsNearby: false,
    turbulenceNearby: false,
    icingNearby: false,
  };

  for (const alert of alerts) {
    if (!alertAppliesToAirport(alert, airport)) continue;
    const hazard = (alert.hazard ?? '').toLowerCase();
    if (
      hazard.includes('convect') ||
      hazard.includes('thunderstorm') ||
      hazard.includes('ts')
    ) {
      flags.thunderstormsNearby = true;
    }
    if (hazard.includes('turb')) {
      flags.turbulenceNearby = true;
    }
    if (hazard.includes('ice') || hazard.includes('icing')) {
      flags.icingNearby = true;
    }
  }

  return flags;
}

function buildRow(
  airport: MajorAirport,
  observation: MetarObservation | undefined,
  alerts: NoaaAlert[],
): AirportMiseryRow {
  const hazards = hazardFlagsFor(airport, alerts);

  if (!observation) {
    return {
      airport,
      score: scoreAirportMisery({ ...hazards }),
      isStale: true,
    };
  }

  const input: AirportMiseryInput = {
    ceilingFt: computeCeilingFt(observation.clouds),
    visibilityMi: observation.visibility,
    windKt: observation.windSpeed,
    gustKt: observation.windGust,
    ...hazards,
  };

  return {
    airport,
    score: scoreAirportMisery(input),
    metar: observation,
    isStale: false,
  };
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const icaos = MAJOR_US_AIRPORTS.map((a) => a.icao);

    const [metars, alerts] = await Promise.all([
      fetchMetarsBulk(icaos),
      fetchAviationAlertsFromNOAA(),
    ]);

    const rows = MAJOR_US_AIRPORTS.map((airport) =>
      buildRow(airport, metars.get(airport.icao), alerts),
    );

    const payload: AirportMiseryResponse = {
      airports: rows,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
          ...rateLimitHeaders,
      },
    });
  } catch (error) {
    logRouteError('airport-misery', error);
    return NextResponse.json(
      { error: 'Failed to build airport misery board' },
      { status: 500 },
    );
  }
  }, { context: 'airport-misery' });
}
