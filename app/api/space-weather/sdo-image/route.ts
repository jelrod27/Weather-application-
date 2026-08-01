/**
 * 16-Bit Weather Platform - Solar Image Proxy
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Proxy route to fetch solar imagery from NOAA SWPC.
 * Uses GOES SUVI (Solar Ultraviolet Imager) for EUV wavelengths and
 * SWPC's SDO HMI mirror for magnetogram/sunspot imagery.
 *
 * Primary source: services.swpc.noaa.gov (NOAA, highly reliable)
 * Fallback: sdo.gsfc.nasa.gov (NASA, intermittently unreachable)
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';

export const runtime = 'edge';

/**
 * Wavelength configuration mapping our IDs to upstream sources.
 *
 * GOES SUVI replaces SDO AIA for operational solar monitoring:
 * - SUVI 304 ≈ AIA 304 (He II, chromosphere ~50,000K)
 * - SUVI 195 ≈ AIA 193 (Fe XII, corona ~1.2MK)
 * - SUVI 171 ≈ AIA 171 (Fe IX, corona ~600,000K)
 * - SDO HMI Intensitygram for visible-light sunspot imagery
 */
const WAVELENGTH_CONFIG: Record<string, {
  primary: string;
  fallback: string;
}> = {
  '0304': {
    primary: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/304/latest.png',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg',
  },
  '0193': {
    // SUVI 195 is the closest match to AIA 193 (both Fe XII coronal line)
    primary: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg',
  },
  '0171': {
    primary: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/171/latest.png',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0171.jpg',
  },
  'HMIIF': {
    primary: 'https://services.swpc.noaa.gov/images/animations/sdo-hmii/latest.jpg',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIF.jpg',
  },
  '0131': {
    primary: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/131/latest.png',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0131.jpg',
  },
  '0284': {
    primary: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/284/latest.png',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0284.jpg',
  },
  '0094': {
    primary: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/094/latest.png',
    fallback: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0094.jpg',
  },
  'LASCOC2': {
    primary: 'https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg',
    fallback: 'https://soho.nascom.nasa.gov/data/realtime/c2/1024/latest.jpg',
  },
  'LASCOC3': {
    primary: 'https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.jpg',
    fallback: 'https://soho.nascom.nasa.gov/data/realtime/c3/1024/latest.jpg',
  },
};

/** Derive Content-Type from the upstream response or URL extension. */
function getContentType(response: Response, url: string): string {
  const upstream = response.headers.get('Content-Type');
  if (upstream && upstream.startsWith('image/')) return upstream;
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/**
 * GET /api/space-weather/sdo-image?wavelength=0304
 *
 * Returns the latest solar image for the given wavelength.
 * The `size` param is accepted for backwards compatibility but ignored
 * since SUVI images come in a single resolution.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wavelength = searchParams.get('wavelength');

  if (!wavelength || !WAVELENGTH_CONFIG[wavelength]) {
    return NextResponse.json(
      { error: `Invalid wavelength. Must be one of: ${Object.keys(WAVELENGTH_CONFIG).join(', ')}` },
      { status: 400 }
    );
  }

  const config = WAVELENGTH_CONFIG[wavelength];

  // Try primary source (NOAA SWPC), then fallback (NASA SDO)
  for (const url of [config.primary, config.fallback]) {
    try {
      const response = await fetchSwpc(url, { timeoutMs: 8000 });

      if (!response.ok) {
        console.warn(`[sdo-image] ${url} returned ${response.status}`);
        continue;
      }

      const imageData = await response.arrayBuffer();
      const upstreamHost = new URL(url).hostname;

      return new NextResponse(imageData, {
        headers: {
          'Content-Type': getContentType(response, url),
          'Cache-Control': 'public, max-age=300',
          'X-Source': upstreamHost === 'services.swpc.noaa.gov' ? 'NOAA SWPC SUVI' : 'NASA SDO',
        },
      });
    } catch (error) {
      console.warn(`[sdo-image] ${url} failed:`, error);
      continue;
    }
  }

  // Both sources failed
  console.error(`[sdo-image] All sources failed for wavelength=${wavelength}`);
  return NextResponse.json(
    { error: 'Unable to reach solar imagery servers' },
    { status: 502 }
  );
}
