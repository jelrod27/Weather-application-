/**
 * 16-Bit Weather Platform - Coronagraph Frames API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Provides SOHO LASCO coronagraph image URLs for animation
 * Provider-listed frames from NOAA SWPC, with NASA animation fallback.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface CoronagraphFrame {
  timestamp: string;
  url: string;
  camera: 'c2' | 'c3';
  available: boolean;
}

export interface CoronagraphApiResponse {
  success: boolean;
  data: {
    frames: CoronagraphFrame[];
    fallbackGif: string;
    latestImage: string;
    animatedGif: string;
    camera: 'c2' | 'c3';
    frameCount: number;
    useAnimatedGif: boolean;
  };
  source: string;
  note: string;
}

// Provider animations; duration and availability depend on upstream coverage.
const ANIMATED_GIFS = {
  c2: {
    full: 'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',
    small: 'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',
  },
  c3: {
    full: 'https://soho.nascom.nasa.gov/data/LATEST/current_c3small.gif',
    small: 'https://soho.nascom.nasa.gov/data/LATEST/current_c3small.gif',
  },
};

// Latest static images (availability depends on the provider).
const LATEST_IMAGES = {
  c2: 'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg',
  c3: 'https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.jpg',
};

/** Only provider-listed frames carry an acquisition time. Never infer missing exposures. */
function manifestFrames(manifest: unknown, camera: 'c2' | 'c3'): CoronagraphFrame[] {
  if (!Array.isArray(manifest)) return [];
  const frames = new Map<string, CoronagraphFrame>();
  const pattern = new RegExp(`^/images/animations/lasco-${camera}/(\\d{8})_(\\d{4})_${camera}_512\\.jpg$`);
  for (const entry of manifest) {
    if (!entry || typeof entry !== 'object' || typeof entry.url !== 'string') continue;
    const match = entry.url.match(pattern);
    if (!match) continue;
    const [, date, time] = match;
    const timestamp = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${time.slice(0,2)}:${time.slice(2,4)}:00.000Z`;
    const parsed = new Date(timestamp);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== timestamp) continue;
    frames.set(entry.url, {url: `https://services.swpc.noaa.gov${entry.url}`, timestamp, camera, available: true});
  }
  return [...frames.values()].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const { searchParams } = request.nextUrl;
    const cameraParam = searchParams.get('camera') as 'c2' | 'c3' | null;
    const frameParam = searchParams.get('frames');
    const parsedFrames = frameParam ? parseInt(frameParam, 10) : 12;
    // Guard against NaN - use default if parseInt fails
    const frameCount = Number.isFinite(parsedFrames) ? parsedFrames : 12;

    // Validate camera parameter, default to c2
    const camera: 'c2' | 'c3' = cameraParam === 'c3' ? 'c3' : 'c2';

    // Limit frame count to reasonable range
    const safeFrameCount = Math.min(Math.max(frameCount, 6), 24);

    // Fetch actual exposures listed by NOAA; never extrapolate a cadence.
    const manifest = await fetchSwpcJson<unknown>(`https://services.swpc.noaa.gov/products/animations/lasco-${camera}.json`);
    const archiveFrames = manifestFrames(manifest, camera).slice(-safeFrameCount);
    if (archiveFrames.length === 0) throw new Error('No valid LASCO manifest frames');

    // Build response following PRD section 6.1 format
    const response: CoronagraphApiResponse = {
      success: true,
      data: {
        frames: archiveFrames,
        fallbackGif: ANIMATED_GIFS[camera].small,
        latestImage: LATEST_IMAGES[camera],
        animatedGif: ANIMATED_GIFS[camera].full,
        camera,
        frameCount: archiveFrames.length,
        // Provider-listed frames support manual playback.
        useAnimatedGif: false,
      },
      source: 'SOHO LASCO (NASA/ESA)',
      note: `LASCO ${camera.toUpperCase()} coronagraph. Frames and acquisition times are from the NOAA SWPC animation manifest. The GIF is a separate provider animation.`,
    };

    return NextResponse.json(response, { headers: rateLimitHeaders });

  } catch (error) {
    logRouteError('space-weather/coronagraph', error);

    const cameraParam = request.nextUrl.searchParams.get('camera');
    const camera: 'c2' | 'c3' = cameraParam === 'c3' ? 'c3' : 'c2';

    // Return error response with fallback data
    const errorResponse: CoronagraphApiResponse = {
      success: false,
      data: {
        frames: [],
        fallbackGif: ANIMATED_GIFS[camera].small,
        latestImage: LATEST_IMAGES[camera],
        animatedGif: ANIMATED_GIFS[camera].full,
        camera,
        frameCount: 0,
        useAnimatedGif: true,
      },
      source: 'SOHO LASCO (NASA/ESA)',
      note: 'Frame manifest unavailable. The provider animation may still be available.',
    };

    return NextResponse.json(errorResponse, { status: 502, headers: rateLimitHeaders });
  }
  }, { context: 'space-weather/coronagraph' });
}
