/**
 * 16-Bit Weather Platform - Coronagraph Frames API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Provides SOHO LASCO coronagraph image URLs for animation
 * Primary: Animated GIFs from NASA showing 48-hour loops
 * Secondary: Archive frames when available
 */

import { NextResponse } from 'next/server';
import { logRouteError } from '@/lib/error-utils'

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

// Animated GIF URLs (always available, NASA-provided 48hr loops)
const ANIMATED_GIFS = {
  c2: {
    full: 'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.gif',
    small: 'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',
  },
  c3: {
    full: 'https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.gif',
    small: 'https://soho.nascom.nasa.gov/data/LATEST/current_c3small.gif',
  },
};

// Latest static images (always available)
const LATEST_IMAGES = {
  c2: 'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg',
  c3: 'https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.jpg',
};

/**
 * Generate frame URLs using SOHO archive structure
 * Note: SOHO archive URLs are not always reliable for realtime access
 * The archive structure is: /data/REPROCESSING/Completed/YYYY/cN/YYYYMMDD/
 * We generate these URLs but mark them as potentially unavailable
 */
function generateArchiveFrameUrls(camera: 'c2' | 'c3', count: number = 12): CoronagraphFrame[] {
  const frames: CoronagraphFrame[] = [];
  const now = new Date();

  // Generate timestamps for last ~2-3 hours (12 frames at 12-min intervals)
  for (let i = count - 1; i >= 0; i--) {
    const frameTime = new Date(now.getTime() - i * 12 * 60 * 1000);

    // Format for SOHO archive (uses UTC)
    const year = frameTime.getUTCFullYear();
    const month = String(frameTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(frameTime.getUTCDate()).padStart(2, '0');
    const hour = String(frameTime.getUTCHours()).padStart(2, '0');
    const minute = String(Math.floor(frameTime.getUTCMinutes() / 12) * 12).padStart(2, '0');

    // Archive URL structure - these may not exist in realtime
    frames.push({
      timestamp: frameTime.toISOString(),
      url: `https://soho.nascom.nasa.gov/data/realtime/${camera}/512/${year}${month}${day}_${hour}${minute}_${camera}_512.jpg`,
      camera,
      available: false, // Mark as potentially unavailable - client should verify
    });
  }

  return frames;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraParam = searchParams.get('camera') as 'c2' | 'c3' | null;
    const frameParam = searchParams.get('frames');
    const parsedFrames = frameParam ? parseInt(frameParam, 10) : 12;
    // Guard against NaN - use default if parseInt fails
    const frameCount = Number.isFinite(parsedFrames) ? parsedFrames : 12;

    // Validate camera parameter, default to c2
    const camera: 'c2' | 'c3' = cameraParam === 'c3' ? 'c3' : 'c2';

    // Limit frame count to reasonable range
    const safeFrameCount = Math.min(Math.max(frameCount, 6), 24);

    // Generate archive frame URLs (may not be available)
    const archiveFrames = generateArchiveFrameUrls(camera, safeFrameCount);

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
        // Recommend using animated GIF since archive frames are unreliable
        useAnimatedGif: true,
      },
      source: 'SOHO LASCO (NASA/ESA)',
      note: `LASCO ${camera.toUpperCase()} coronagraph. Individual archive frames may not be available in realtime - use animatedGif or fallbackGif for reliable animation. The animated GIF shows a 48-hour loop of actual coronagraph images.`,
    };

    return NextResponse.json(response);

  } catch (error) {
    logRouteError('space-weather/coronagraph', error);

    const cameraParam = new URL(request.url).searchParams.get('camera');
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
      note: 'Error generating frame URLs. Use fallbackGif for animation.',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
