/**
 * The space-weather series route shape.
 *
 * Several routes in this group are the same handler with different field names:
 * fetch one SWPC JSON array, drop rows that fail a check, round a value, wrap
 * the rest in `{ data, source }`, attach a cache header, and on failure log and
 * return `{ error }` at 500. magnetometer and proton-flux were line-for-line
 * identical apart from the field they read and the log tag.
 *
 * Routes whose transform is real domain logic (flare classing, solar-cycle
 * phase, range-windowed joins of two feeds) are deliberately NOT forced through
 * here — they share the cache tiers and the SWPC fetch helpers instead.
 */

import { NextResponse } from 'next/server';
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils';

/** Attribution strings echoed back to clients. */
export const SWPC_SOURCE = 'NOAA Space Weather Prediction Center';
export const SWPC_GOES_SOURCE = 'NOAA Space Weather Prediction Center (GOES)';

/**
 * Cache tiers for this group. Previously freehand `s-maxage=...` strings
 * repeated across route files with no shared definition.
 */
export const SPACE_WEATHER_CACHE = {
  /** Fast-moving series — solar wind, plasma. */
  realtime: 'public, s-maxage=60, stale-while-revalidate=30',
  /** The default for GOES instrument series. */
  standard: 'public, s-maxage=300, stale-while-revalidate=60',
  /** Slow series — sunspot / solar-cycle indices. */
  slow: 'public, s-maxage=3600, stale-while-revalidate=7200',
} as const;

export interface SwpcSeriesConfig<Raw, Point> {
  /** Log and Sentry tag, e.g. 'Magnetometer'. */
  context: string;
  /** SWPC JSON array endpoint. */
  url: string;
  /** Attribution echoed in the response body. */
  source: string;
  /** Client-facing message when the fetch or transform fails. */
  errorMessage: string;
  cacheControl?: string;
  /** Maps one upstream row to a point, or null to drop it. */
  toPoint: (raw: Raw) => Point | null;
}

/**
 * Builds a GET handler for a SWPC JSON array endpoint.
 *
 * Failure behaviour matches what these routes already did: log (now to Sentry
 * too, via logRouteError) and return `{ error }` at 500.
 */
export function swpcSeriesRoute<Raw, Point>(
  config: SwpcSeriesConfig<Raw, Point>,
): () => Promise<NextResponse> {
  const {
    context,
    url,
    source,
    errorMessage,
    cacheControl = SPACE_WEATHER_CACHE.standard,
    toPoint,
  } = config;

  return async function GET(): Promise<NextResponse> {
    try {
      const rows = await fetchSwpcJson<Raw[]>(url);
      const data: Point[] = [];

      for (const row of rows) {
        const point = toPoint(row);
        if (point !== null) data.push(point);
      }

      return NextResponse.json({ data, source }, { headers: { 'Cache-Control': cacheControl } });
    } catch (error) {
      logRouteError(context, error);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  };
}

/** Rounds to `places` decimals, or null when the value is not usable. */
export function finiteRounded(value: unknown, places = 2): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
