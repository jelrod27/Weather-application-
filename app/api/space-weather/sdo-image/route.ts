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
import { withApiRoute } from '@/lib/api/with-api-route';

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
interface ImageSource {
  url: string;
  source: string;
  wavelength: string;
}

const suvi = (band: string): ImageSource => ({
  url: `https://services.swpc.noaa.gov/images/animations/suvi/primary/${band}/latest.png`,
  source: 'NOAA GOES SUVI', wavelength: String(Number(band)),
});
const aia = (band: string): ImageSource => ({
  url: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_${band}.jpg`,
  source: 'NASA SDO AIA', wavelength: String(Number(band)),
});
const lasco = (camera: 'c2' | 'c3', size: number): ImageSource => ({
  url: `https://soho.nascom.nasa.gov/data/realtime/${camera}/${size}/latest.jpg`,
  source: `NASA/ESA SOHO LASCO ${camera.toUpperCase()}`, wavelength: 'white-light',
});
const WAVELENGTH_CONFIG: Record<string, ImageSource[]> = {
  '0304': [suvi('304'), aia('0304')],
  '0193': [suvi('195'), aia('0193')],
  '0171': [suvi('171'), aia('0171')],
  '0131': [suvi('131'), aia('0131')],
  // SDO AIA has no 284 Å channel.
  '0284': [suvi('284')],
  '0094': [suvi('094'), aia('0094')],
  HMIIF: [
    {url: 'https://services.swpc.noaa.gov/images/animations/sdo-hmii/latest.jpg', source: 'NASA SDO HMI', wavelength: 'visible'},
    {url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIF.jpg', source: 'NASA SDO HMI', wavelength: 'visible'},
  ],
  LASCOC2: [lasco('c2', 512), lasco('c2', 1024)],
  LASCOC3: [lasco('c3', 512), lasco('c3', 1024)],
};

/** Require the declared raster type to match its signature; HTML error pages can return 200. */
function validImageType(response: Response, data: ArrayBuffer): string | null {
  const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  const bytes = new Uint8Array(data);
  if (type === 'image/jpeg' && bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return type;
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (type === 'image/png' && bytes.length > png.length && png.every((byte, index) => bytes[index] === byte)) return type;
  return null;
}

/**
 * GET /api/space-weather/sdo-image?wavelength=0304
 *
 * Returns the latest solar image for the given wavelength.
 * The `size` param is accepted for backwards compatibility but ignored
 * since SUVI images come in a single resolution.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  const searchParams = request.nextUrl.searchParams;
  const wavelength = searchParams.get('wavelength');

  if (!wavelength || !WAVELENGTH_CONFIG[wavelength]) {
    return NextResponse.json(
      { error: `Invalid wavelength. Must be one of: ${Object.keys(WAVELENGTH_CONFIG).join(', ')}` },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const config = WAVELENGTH_CONFIG[wavelength];

  // Try primary source (NOAA SWPC), then fallback (NASA SDO)
  for (const { url, source, wavelength: actualWavelength } of config) {
    try {
      const response = await fetchSwpc(url, { timeoutMs: 8000 });

      if (!response.ok) {
        console.warn(`[sdo-image] ${url} returned ${response.status}`);
        continue;
      }

      const imageData = await response.arrayBuffer();
      const contentType = validImageType(response, imageData);
      if (!contentType) continue;

      return new NextResponse(imageData, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300',
          'X-Source': source,
          'X-Wavelength': actualWavelength,
          'X-Content-Type-Options': 'nosniff',
          ...rateLimitHeaders,
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
    { status: 502, headers: rateLimitHeaders }
  );
  }, { context: 'sdo-image' });
}
