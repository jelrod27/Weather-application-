/**
 * 16-Bit Weather Platform - METAR API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches METAR (Meteorological Aerodrome Report) data for airports
 * from NOAA Aviation Weather Center
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';

// Simple in-memory cache with 10-minute TTL
const metarCache = new Map<string, { data: MetarResponse; expires: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface MetarObservation {
  raw: string;
  icao: string;
  name?: string;
  observationTime: string;
  temperature?: number; // Celsius
  dewpoint?: number; // Celsius
  windDirection?: number; // Degrees
  windSpeed?: number; // Knots
  windGust?: number; // Knots
  visibility?: number; // Statute miles
  altimeter?: number; // inHg
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN';
  clouds: Array<{
    cover: string;
    base?: number; // Feet AGL
  }>;
  weather?: string[];
}

export interface MetarResponse {
  station: string;
  observation?: MetarObservation;
  error?: string;
  timestamp: string;
}

// Parse METAR raw text into structured data
function parseMetar(raw: string): Partial<MetarObservation> {
  const result: Partial<MetarObservation> = {
    raw,
    clouds: [],
  };

  const parts = raw.split(' ');

  // Extract ICAO code (first 4-letter group)
  const icaoMatch = raw.match(/\b([A-Z]{4})\b/);
  if (icaoMatch) {
    result.icao = icaoMatch[1];
  }

  // Extract observation time (format: DDHHMMz)
  const timeMatch = raw.match(/\b(\d{6})Z\b/);
  if (timeMatch) {
    const day = parseInt(timeMatch[1].slice(0, 2));
    const hour = parseInt(timeMatch[1].slice(2, 4));
    const minute = parseInt(timeMatch[1].slice(4, 6));
    const now = new Date();

    // Start with current year/month
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth();

    let obsTime = new Date(Date.UTC(year, month, day, hour, minute));

    // If obsTime is in the future, it means we crossed a month boundary
    // Roll back one month (METAR day is from previous month)
    if (obsTime > now) {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
      obsTime = new Date(Date.UTC(year, month, day, hour, minute));
    }

    result.observationTime = obsTime.toISOString();
  }

  // Extract wind (format: DDDSSKt or DDDSSGGGKt)
  const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (windMatch) {
    if (windMatch[1] !== 'VRB') {
      result.windDirection = parseInt(windMatch[1]);
    }
    result.windSpeed = parseInt(windMatch[2]);
    if (windMatch[3]) {
      result.windGust = parseInt(windMatch[3]);
    }
  }

  // Extract visibility (formats: SM, P6SM, M1/4SM, 1/2SM, 1 1/2SM, 10SM)
  // P prefix means "greater than" (P6SM = >6 statute miles)
  // M prefix means "less than" (M1/4SM = <1/4 statute miles)
  const visMatch = raw.match(/\b([PM])?(\d+)?\s*(\d+\/\d+)?\s*SM\b/);
  if (visMatch) {
    const prefix = visMatch[1];
    const isGreaterThan = prefix === 'P';
    const isLessThan = prefix === 'M';
    const wholePart = visMatch[2] ? parseInt(visMatch[2]) : 0;
    const fractionPart = visMatch[3];

    let visibility: number;
    
    if (fractionPart) {
      // Handle fractions like 1/2 or mixed like wholePart + fraction
      const [num, denom] = fractionPart.split('/').map(Number);
      visibility = wholePart + (num / denom);
    } else {
      visibility = wholePart;
    }

    if (isGreaterThan) {
      // P6SM means greater than 6 (use 6 as minimum)
      result.visibility = visibility || 6;
    } else if (isLessThan) {
      // M1/4SM means less than 1/4 (reduce slightly to indicate "less than")
      result.visibility = Math.max(0, visibility - 0.01);
    } else {
      result.visibility = visibility;
    }
  }

  // Extract temperature and dewpoint (format: TT/DD or MTT/MDD for negative)
  const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
  if (tempMatch) {
    const temp = tempMatch[1].replace('M', '-');
    const dewp = tempMatch[2].replace('M', '-');
    result.temperature = parseInt(temp);
    result.dewpoint = parseInt(dewp);
  }

  // Extract altimeter (format: AXXXX)
  const altMatch = raw.match(/\bA(\d{4})\b/);
  if (altMatch) {
    result.altimeter = parseInt(altMatch[1]) / 100;
  }

  // Extract cloud layers (FEW, SCT, BKN, OVC followed by height)
  const cloudPattern = /\b(FEW|SCT|BKN|OVC|CLR|SKC)(\d{3})?\b/g;
  let cloudMatch;
  while ((cloudMatch = cloudPattern.exec(raw)) !== null) {
    const cover = cloudMatch[1];
    const base = cloudMatch[2] ? parseInt(cloudMatch[2]) * 100 : undefined;
    result.clouds?.push({ cover, base });
  }

  // Determine flight category
  result.flightCategory = determineFlightCategory(result.visibility, result.clouds);

  // Extract weather phenomena
  const weatherCodes = [
    'RA', 'SN', 'DZ', 'SH', 'TS', 'FG', 'BR', 'HZ', 'FU', 'DU', 'SA',
    'GR', 'GS', 'IC', 'PL', 'SG', 'UP', 'FC', 'SS', 'DS', 'SQ', 'PO'
  ];
  const intensities = ['\\+', '-', ''];
  const descriptors = ['MI', 'PR', 'BC', 'DR', 'BL', 'SH', 'TS', 'FZ', 'VC'];

  // Build a regex to properly match weather codes (not substrings of ICAO codes)
  // Weather format: [intensity][descriptor][weather code(s)]
  // Examples: -RA, +TSRA, FZRA, VCSH, BR, HZ
  const weatherRegex = new RegExp(
    `^(?:\\+|-)?(?:${descriptors.join('|')})?(?:${weatherCodes.join('|')})+$`
  );

  const weather: string[] = [];
  for (const part of parts) {
    // Skip ICAO station codes (4-letter codes at start)
    if (/^[A-Z]{4}$/.test(part)) continue;
    
    // Check if part matches weather pattern
    if (weatherRegex.test(part)) {
      weather.push(part);
    }
  }
  if (weather.length > 0) {
    result.weather = weather;
  }

  return result;
}

// Determine flight category based on ceiling and visibility
function determineFlightCategory(
  visibility: number | undefined,
  clouds: Array<{ cover: string; base?: number }> | undefined
): 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN' {
  // Find ceiling (lowest BKN or OVC layer)
  let ceiling: number | undefined;
  for (const cloud of clouds || []) {
    if ((cloud.cover === 'BKN' || cloud.cover === 'OVC') && cloud.base !== undefined) {
      if (ceiling === undefined || cloud.base < ceiling) {
        ceiling = cloud.base;
      }
    }
  }

  // LIFR: Ceiling < 500ft or Visibility < 1 SM
  if ((ceiling !== undefined && ceiling < 500) || (visibility !== undefined && visibility < 1)) {
    return 'LIFR';
  }

  // IFR: Ceiling 500-999ft or Visibility 1-2.99 SM
  if ((ceiling !== undefined && ceiling < 1000) || (visibility !== undefined && visibility < 3)) {
    return 'IFR';
  }

  // MVFR: Ceiling 1000-2999ft or Visibility 3-4.99 SM
  if ((ceiling !== undefined && ceiling < 3000) || (visibility !== undefined && visibility < 5)) {
    return 'MVFR';
  }

  // VFR: Ceiling >= 3000ft and Visibility >= 5 SM (or no ceiling/unlimited visibility)
  if (visibility === undefined && ceiling === undefined) {
    return 'UNKNOWN';
  }

  return 'VFR';
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const sp = request.nextUrl.searchParams;
    const station = sp.get('station')?.toUpperCase();

    if (!station) {
      return NextResponse.json(
        { error: 'Missing required parameter: station (ICAO code)' },
        { status: 400 }
      );
    }

    // Validate station format (4-letter ICAO code)
    if (!/^[A-Z]{4}$/.test(station)) {
      return NextResponse.json(
        { error: 'Invalid station format. Must be 4-letter ICAO code (e.g., KJFK)' },
        { status: 400 }
      );
    }

    // Check cache
    const cached = metarCache.get(station);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      });
    }

    // Fetch METAR from NOAA Aviation Weather Center
    // Using the Text Data Server API
    const url = `https://aviationweather.gov/api/data/metar?ids=${station}&format=raw&taf=false`;

    const response = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': '16-Bit-Weather/1.0',
      },
      cache: 'no-store', // Don't cache at edge, we manage our own cache
      signal: request.signal,
    });

    if (!response.ok) {
      console.error(`[METAR API] AWC returned ${response.status} for ${station}`);
      return NextResponse.json({
        station,
        error: 'Unable to fetch METAR data',
        timestamp: new Date().toISOString(),
      }, { status: 502 });
    }

    const rawText = await response.text();

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({
        station,
        error: 'No METAR data available for this station',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Parse the METAR
    const parsed = parseMetar(rawText.trim());

    const result: MetarResponse = {
      station,
      observation: {
        raw: rawText.trim(),
        icao: parsed.icao || station,
        observationTime: parsed.observationTime || new Date().toISOString(),
        temperature: parsed.temperature,
        dewpoint: parsed.dewpoint,
        windDirection: parsed.windDirection,
        windSpeed: parsed.windSpeed,
        windGust: parsed.windGust,
        visibility: parsed.visibility,
        altimeter: parsed.altimeter,
        flightCategory: parsed.flightCategory || 'UNKNOWN',
        clouds: parsed.clouds || [],
        weather: parsed.weather,
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    metarCache.set(station, {
      data: result,
      expires: Date.now() + CACHE_TTL_MS,
    });

    // Clean old cache entries
    const now = Date.now();
    const entries = Array.from(metarCache.entries());
    for (const [key, value] of entries) {
      if (value.expires < now) {
        metarCache.delete(key);
      }
    }

    return NextResponse.json(result, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });

  } catch (error) {
    console.error('[METAR API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch METAR data' },
      { status: 500 }
    );
  }
}
