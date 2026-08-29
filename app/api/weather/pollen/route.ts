/**
 * 16-Bit Weather Platform - Pollen API
 *
 * Prefer Google Pollen when GOOGLE_POLLEN_API_KEY is set (US coverage).
 * Otherwise use Open-Meteo CAMS pollen (Europe). Never require OpenWeather.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo';
import { mapOpenMeteoPollenHourly } from '@/lib/pollen/open-meteo-pollen';
import { normalizePollenCategories } from '@/lib/pollen/normalize-pollen-categories';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

const unavailableBody = {
  tree: { Tree: 'Unavailable' },
  grass: { Grass: 'Unavailable' },
  weed: { Weed: 'Unavailable' },
  source: 'unavailable' as const,
};

/**
 * Google is optional here, so a missing key is a supported configuration rather
 * than a defect — warn once per lambda instead of opening a Sentry issue per
 * request. It still reaches the runtime logs, which is what separates "the env
 * var never got to this deployment" from "Google rejected the key".
 */
let warnedMissingGoogleKey = false;

/**
 * The same reasoning, applied to Google actually answering and refusing. A
 * broken key fails on every request, and `weather-forecast.ts` passes
 * full-precision coordinates, so each user location is its own cache key and
 * this branch runs on most requests — un-deduped, one misconfigured key becomes
 * a continuous stream of identical Sentry issues that buries everything else.
 * Report each distinct failure shape once per lambda: enough to see it, not
 * enough to drown in it.
 */
const reportedGoogleFailures = new Set<string>();

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const lat = searchParams.get('lat');
      const lon = searchParams.get('lon');

      if (!lat || !lon) {
        return NextResponse.json(
          { error: 'Missing required parameters: lat, lon' },
          { status: 400 },
        );
      }

      const latitude = Number(lat.trim());
      const longitude = Number(lon.trim());

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
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

      if (!googlePollenApiKey && !warnedMissingGoogleKey) {
        warnedMissingGoogleKey = true;
        console.warn(
          '[pollen] GOOGLE_POLLEN_API_KEY is not set in this environment; ' +
            'falling back to Open-Meteo CAMS (Europe only).',
        );
      }

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
                const normalized = normalizePollenCategories(
                  treeBreakdown,
                  grassBreakdown,
                  weedBreakdown,
                );
                return NextResponse.json(
                  {
                    tree: normalized.tree,
                    grass: normalized.grass,
                    weed: normalized.weed,
                    source: 'google',
                  },
                  {
                    headers: {
                      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
                      ...rateLimitHeaders,
                    },
                  },
                );
              }
            }
          } else {
            // A rejected key and an absent key both fall through to Open-Meteo
            // and render identically, which made this failure invisible.
            // Google's own `error.status` separates them: PERMISSION_DENIED (bad
            // or restricted key) vs SERVICE_DISABLED (Pollen API not enabled on
            // the project). Never log the URL — it carries the key, same
            // reasoning as the catch below.
            let googleStatus: string | undefined;
            try {
              const errorBody = (await response.json()) as {
                error?: { status?: string };
              };
              googleStatus = errorBody.error?.status;
            } catch {
              // Non-JSON error body; the HTTP status alone still narrows it.
            }
            const failureShape = `${response.status}:${googleStatus ?? 'unknown'}`;
            if (!reportedGoogleFailures.has(failureShape)) {
              reportedGoogleFailures.add(failureShape);
              logRouteError('pollen', new Error('Google Pollen returned a non-OK response'), {
                upstream: 'pollen.googleapis.com',
                status: response.status,
                googleStatus,
              });
            }
          }
        } catch (error) {
          // googlePollenUrl carries GOOGLE_POLLEN_API_KEY in its query string,
          // and an upstream fetch error can embed the request URL in its
          // message or stack. Report the shape of the failure rather than the
          // error object so the key cannot reach Sentry. (Same reasoning as the
          // NASA DONKI key note in space-weather/flares.)
          logRouteError('pollen', new Error('Google Pollen request failed'), {
            upstream: 'pollen.googleapis.com',
            reason: error instanceof Error ? error.name : typeof error,
          });
        }
      }

      try {
        const aq = await fetchOpenMeteoAirQuality(latitude, longitude);
        const mapped = mapOpenMeteoPollenHourly(aq.hourly, aq.utc_offset_seconds);
        if (mapped.source === 'open-meteo') {
          const normalized = normalizePollenCategories(mapped.tree, mapped.grass, mapped.weed);
          return NextResponse.json(
            {
              tree: normalized.tree,
              grass: normalized.grass,
              weed: normalized.weed,
              source: mapped.source,
            },
            {
              headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
                ...rateLimitHeaders,
              },
            },
          );
        }
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
              ...rateLimitHeaders,
            },
          },
        );
      } catch (error) {
        logRouteError('pollen', error);
        return NextResponse.json(unavailableBody, {
          status: 200,
          headers: rateLimitHeaders,
        });
      }
    } catch (error) {
      logRouteError('pollen', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })
}
