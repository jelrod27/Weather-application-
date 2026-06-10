/**
 * 16-Bit Weather Platform - Aviation Turbulence API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches real Graphical AIRMET (G-AIRMET) turbulence forecasts from
 * NOAA AWC. CONUS + Alaska/Hawaii coverage. Returns GeoJSON-style polygons
 * normalized for client consumption.
 *
 * Endpoint reference: https://aviationweather.gov/api/data/gairmet?type=turb&format=json
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export type TurbulenceSeverity =
  | 'smooth'
  | 'light'
  | 'moderate'
  | 'severe'
  | 'extreme';

export interface TurbulencePolygon {
  /** Stable id for keyed React rendering. */
  id: string;
  /** GeoJSON-style coordinate ring(s). Outer ring first. */
  coordinates: number[][][];
  severity: TurbulenceSeverity;
  /** Raw severity string from AWC (e.g., "MOD-SEV"). */
  rawSeverity: string;
  /** Hazard label (always "TURB" for this endpoint). */
  hazard: string;
  /** Forecast hour offset (0, 3, 6, 9, ...). */
  forecastHour: number;
  /** ISO timestamp the forecast becomes valid. */
  validFrom: string;
  /** ISO timestamp the forecast expires. */
  validTo: string;
  /** Top of layer (hundreds of feet). null when omitted. */
  topFt: number | null;
  /** Base of layer (hundreds of feet). null when omitted. */
  baseFt: number | null;
}

export interface TurbulenceResponse {
  success: boolean;
  data: {
    polygons: TurbulencePolygon[];
    fetchedAt: string;
    source: 'NOAA AWC G-AIRMET';
    coverage: 'CONUS+AK+HI';
  };
  error?: string;
}

const AWC_GAIRMET_URL =
  'https://aviationweather.gov/api/data/gairmet?type=turb&format=json';

const FETCH_TIMEOUT_MS = 8000;

function mapSeverity(raw: string | undefined | null): TurbulenceSeverity {
  if (!raw) return 'smooth';
  const upper = raw.toUpperCase();
  if (upper.includes('EXTRM') || upper.includes('EXTREME')) return 'extreme';
  if (upper.includes('SEV')) return 'severe';
  if (upper.includes('MOD')) return 'moderate';
  if (upper.includes('LGT') || upper.includes('LIGHT')) return 'light';
  return 'smooth';
}

interface RawGairmetFeature {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: {
    hazard?: string;
    severity?: string;
    fcstHr?: number | string;
    validTime?: string;
    forecast?: string;
    expireTime?: string;
    top?: number | string;
    base?: number | string;
    icao?: string;
  };
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Coerce AWC's polygon coordinates into [[[lon,lat], ...]] form. */
function normalizeCoordinates(raw: unknown): number[][][] | null {
  if (!Array.isArray(raw)) return null;

  // Polygon: [[[lon,lat], ...], (holes...)]
  // MultiPolygon: [[[[lon,lat], ...]], ...]
  // Sometimes AWC returns a flat ring [[lon,lat], ...] for older payloads.
  if (raw.length === 0) return null;

  const first = raw[0];
  // Flat ring (number[][]) → wrap once
  if (Array.isArray(first) && typeof first[0] === 'number') {
    return [raw as number[][]];
  }
  // Polygon with rings (number[][][]) → use as-is
  if (Array.isArray(first) && Array.isArray(first[0]) && typeof first[0][0] === 'number') {
    return raw as number[][][];
  }
  // MultiPolygon → flatten to outer rings only
  if (Array.isArray(first) && Array.isArray(first[0]) && Array.isArray(first[0][0])) {
    const outerRings: number[][][] = [];
    for (const polygon of raw as number[][][][]) {
      if (polygon[0]) outerRings.push(polygon[0]);
    }
    return outerRings.length > 0 ? outerRings : null;
  }
  return null;
}

function parseGairmetFeatures(raw: unknown): TurbulencePolygon[] {
  const features = Array.isArray(raw) ? raw : [];
  const polygons: TurbulencePolygon[] = [];

  features.forEach((feature: RawGairmetFeature, index) => {
    const coords = normalizeCoordinates(feature.geometry?.coordinates);
    if (!coords) return;

    const props = feature.properties ?? {};
    const rawSeverity = props.severity ?? '';
    const fcstHr = asFiniteNumber(props.fcstHr) ?? 0;
    const validFrom = props.validTime ?? props.forecast ?? new Date().toISOString();
    const validTo = props.expireTime ?? validFrom;

    polygons.push({
      id: `gairmet-${fcstHr}-${index}`,
      coordinates: coords,
      severity: mapSeverity(rawSeverity),
      rawSeverity,
      hazard: props.hazard ?? 'TURB',
      forecastHour: fcstHr,
      validFrom,
      validTo,
      topFt: asFiniteNumber(props.top),
      baseFt: asFiniteNumber(props.base),
    });
  });

  return polygons;
}

export async function GET(_request: NextRequest) {
  try {
    const res = await fetchWithTimeout(AWC_GAIRMET_URL, {
      timeoutMs: FETCH_TIMEOUT_MS,
      next: { revalidate: 600 }, // 10-min CDN cache
    });

    if (!res.ok) {
      console.error(`[API] AWC G-AIRMET returned ${res.status}`);
      return NextResponse.json<TurbulenceResponse>(
        {
          success: false,
          data: {
            polygons: [],
            fetchedAt: new Date().toISOString(),
            source: 'NOAA AWC G-AIRMET',
            coverage: 'CONUS+AK+HI',
          },
          error: `Upstream NOAA AWC returned ${res.status}`,
        },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const polygons = parseGairmetFeatures(raw);

    const response: TurbulenceResponse = {
      success: true,
      data: {
        polygons,
        fetchedAt: new Date().toISOString(),
        source: 'NOAA AWC G-AIRMET',
        coverage: 'CONUS+AK+HI',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('[API] Turbulence (G-AIRMET) error:', error);
    return NextResponse.json<TurbulenceResponse>(
      {
        success: false,
        data: {
          polygons: [],
          fetchedAt: new Date().toISOString(),
          source: 'NOAA AWC G-AIRMET',
          coverage: 'CONUS+AK+HI',
        },
        error: 'Unable to fetch turbulence data. Please try again later.',
      },
      { status: 500 },
    );
  }
}
