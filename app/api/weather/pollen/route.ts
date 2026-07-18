/**
 * 16-Bit Weather Platform - Pollen API
 *
 * Prefer Google Pollen when GOOGLE_POLLEN_API_KEY is set (US coverage).
 * Otherwise use Open-Meteo CAMS pollen (Europe). Never require OpenWeather.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo';
import { mapOpenMeteoPollenHourly } from '@/lib/pollen/open-meteo-pollen';

const unavailableBody = {
  tree: { Tree: 'Unavailable' },
  grass: { Grass: 'Unavailable' },
  weed: { Weed: 'Unavailable' },
  source: 'unavailable' as const,
};

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 },
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates provided' },
        { status: 400 },
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 },
      );
    }

    const googlePollenApiKey = process.env.GOOGLE_POLLEN_API_KEY;

    if (googlePollenApiKey) {
      try {
        const googlePollenUrl =
          `https://pollen.googleapis.com/v1/forecast:lookup?key=${googlePollenApiKey}` +
          `&location.latitude=${latitude}&location.longitude=${longitude}&days=1`;

        const response = await fetchWithTimeout(googlePollenUrl, { signal: request.signal });

        if (response.ok) {
          const data = await response.json();
          const dailyInfo = data.dailyInfo?.[0];

          if (dailyInfo) {
            const getPollenCategory = (value: number): string => {
              if (value === 0) return 'None';
              if (value <= 2) return 'Low';
              if (value <= 5) return 'Moderate';
              if (value <= 8) return 'High';
              return 'Very High';
            };

            const treePlants = [
              'MAPLE', 'ELM', 'COTTONWOOD', 'ALDER', 'BIRCH', 'ASH', 'PINE', 'OAK', 'JUNIPER',
            ];
            const grassPlants = ['GRAMINALES'];
            const weedPlants = ['RAGWEED', 'WEED'];

            interface PlantInfo {
              code?: string;
              displayName?: string;
              indexInfo?: { value?: number; category?: string };
            }

            interface PollenTypeInfo {
              code?: string;
              indexInfo?: { value?: number; category?: string };
            }

            const categoryFromIndex = (
              indexInfo?: { value?: number; category?: string },
            ): string | undefined => {
              if (indexInfo?.category) return indexInfo.category;
              if (typeof indexInfo?.value === 'number') {
                return getPollenCategory(indexInfo.value);
              }
              return undefined;
            };

            const extractPlantCategories = (
              plants: PlantInfo[],
              group: string[],
            ): Record<string, string> => {
              const result: Record<string, string> = {};
              plants?.forEach((p) => {
                const code = p.code || p.displayName || '';
                if (group.some((type) => code.includes(type))) {
                  const category = categoryFromIndex(p.indexInfo);
                  if (category) result[p.displayName || code] = category;
                }
              });
              return result;
            };

            const plantInfo: PlantInfo[] = dailyInfo.plantInfo || [];
            const treeBreakdown = extractPlantCategories(plantInfo, treePlants);
            const grassBreakdown = extractPlantCategories(plantInfo, grassPlants);
            const weedBreakdown = extractPlantCategories(plantInfo, weedPlants);

            const pollenTypeTree: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find(
              (p: PollenTypeInfo) => p.code === 'TREE',
            );
            const pollenTypeGrass: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find(
              (p: PollenTypeInfo) => p.code === 'GRASS',
            );
            const pollenTypeWeed: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find(
              (p: PollenTypeInfo) => p.code === 'WEED',
            );

            if (Object.keys(treeBreakdown).length === 0 && pollenTypeTree) {
              const category = categoryFromIndex(pollenTypeTree.indexInfo);
              if (category) treeBreakdown.Tree = category;
            }
            if (Object.keys(grassBreakdown).length === 0 && pollenTypeGrass) {
              const category = categoryFromIndex(pollenTypeGrass.indexInfo);
              if (category) grassBreakdown.Grass = category;
            }
            if (Object.keys(weedBreakdown).length === 0 && pollenTypeWeed) {
              const category = categoryFromIndex(pollenTypeWeed.indexInfo);
              if (category) weedBreakdown.Weed = category;
            }

            const hasGoogleData =
              Object.keys(treeBreakdown).length > 0 ||
              Object.keys(grassBreakdown).length > 0 ||
              Object.keys(weedBreakdown).length > 0;

            if (hasGoogleData) {
              return NextResponse.json(
                {
                  tree: treeBreakdown,
                  grass: grassBreakdown,
                  weed: weedBreakdown,
                  source: 'google',
                },
                {
                  headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
                    ...rateLimit.headers,
                  },
                },
              );
            }
          }
        }
      } catch (error) {
        console.error('[pollen] Google Pollen failed, trying Open-Meteo', error);
      }
    }

    try {
      const aq = await fetchOpenMeteoAirQuality(latitude, longitude);
      const mapped = mapOpenMeteoPollenHourly(aq.hourly, aq.utc_offset_seconds);
      return NextResponse.json(
        {
          tree: mapped.tree,
          grass: mapped.grass,
          weed: mapped.weed,
          source: mapped.source,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
            ...rateLimit.headers,
          },
        },
      );
    } catch (error) {
      console.error('[pollen] Open-Meteo pollen failed', error);
      return NextResponse.json(unavailableBody, {
        status: 200,
        headers: rateLimit.headers,
      });
    }
  } catch (error) {
    console.error('[pollen]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
