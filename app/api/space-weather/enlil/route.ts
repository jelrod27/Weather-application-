/**
 * 16-Bit Weather Platform - ENLIL Solar Wind Model API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches ENLIL model animation frames from NOAA SWPC
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

const ENLIL_BASE_URL = 'https://services.swpc.noaa.gov/images/animations/enlil/';
const ENLIL_LATEST_URL = 'https://services.swpc.noaa.gov/images/animations/enlil/latest.jpg';

// Pattern: enlil_com2_NNNNN_YYYYMMDDTHHMMSS.jpg
const FRAME_PATTERN = /enlil_com2_\d+_\d{8}T\d{6}\.jpg/g;

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const response = await fetchSwpc(ENLIL_BASE_URL);

    if (!response.ok) {
      throw new Error(`NOAA ENLIL directory returned ${response.status}`);
    }

    const html = await response.text();

    // Parse image URLs from the directory listing
    const matches = html.match(FRAME_PATTERN);
    const frames: string[] = [];

    if (matches && matches.length > 0) {
      // Deduplicate and sort
      const unique = [...new Set(matches)];
      unique.sort();

      for (const filename of unique) {
        frames.push(`${ENLIL_BASE_URL}${filename}`);
      }
    }

    return NextResponse.json(
      {
        data: {
          frames,
          frameCount: frames.length,
          latest: frames.length > 0 ? frames[frames.length - 1] : ENLIL_LATEST_URL,
          fallback: ENLIL_LATEST_URL,
        },
        source: 'NOAA Space Weather Prediction Center (ENLIL Model)',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
          ...rateLimitHeaders,
        },
      }
    );
  } catch (error) {
    logRouteError('ENLIL', error);

    return NextResponse.json(
      { error: 'Failed to fetch ENLIL model data' },
      { status: 500 }
    );
  }
  }, { context: 'ENLIL' });
}
