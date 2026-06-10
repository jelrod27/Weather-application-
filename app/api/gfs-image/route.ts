/**
 * 16-Bit Weather Platform - GFS Image Proxy
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Proxy route to fetch GFS model images from NOAA servers.
 * This avoids 403 Forbidden errors when users access images directly.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/gfs-image?run=18z&region=us
 *
 * Fetches GFS model images from NOAA and returns them.
 * This proxy is necessary because NOAA blocks direct browser access to /data/gfs/ directory.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const run = searchParams.get('run'); // e.g., "18z"
  const region = searchParams.get('region'); // e.g., "us", "wus", "eus", "tropatl", "epac"

  // Validate parameters
  if (!run || !region) {
    return NextResponse.json(
      { error: 'Missing required parameters: run and region' },
      { status: 400 }
    );
  }

  // Validate run format (00z, 06z, 12z, 18z)
  const validRuns = ['00z', '06z', '12z', '18z'];
  if (!validRuns.includes(run)) {
    return NextResponse.json(
      { error: 'Invalid run. Must be one of: 00z, 06z, 12z, 18z' },
      { status: 400 }
    );
  }

  // Validate region format (security measure)
  const validRegions = ['us', 'wus', 'eus', 'tropatl', 'epac', 'conus'];
  if (!validRegions.includes(region)) {
    return NextResponse.json(
      { error: `Invalid region. Must be one of: ${validRegions.join(', ')}` },
      { status: 400 }
    );
  }

  // Construct NOAA image URL
  const imageUrl = `https://mag.ncep.noaa.gov/data/gfs/${run}/gfs_mslp_precip_${region}_1.gif`;

  try {
    // Fetch image from NOAA
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': '16BitWeather/1.0 (https://www.16bitweather.co)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(`Failed to fetch GFS image: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch GFS image from NOAA', status: response.status },
        { status: response.status }
      );
    }

    // Get image data
    const imageData = await response.arrayBuffer();

    // Return image with appropriate headers. s-maxage lets the CDN absorb
    // repeat traffic: run/region are strict enums (24 possible URLs), so
    // shared caching is the abuse control here — a per-isolate in-memory
    // limiter is ineffective on the edge runtime where isolates are many
    // and short-lived.
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        'X-Source': 'NOAA GFS',
      },
    });
  } catch (error) {
    console.error('Error fetching GFS image:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching GFS image' },
      { status: 500 }
    );
  }
}
