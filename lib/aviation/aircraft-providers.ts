/**
 * ADS-B provider chain: adsb.lol → airplanes.live → adsb.fi
 * Near-point results are cached briefly to protect free upstream quotas.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import {
  MAX_AIRCRAFT_RADIUS_NM,
  type Aircraft,
  type AircraftNearResponse,
  type AircraftSource,
} from './aircraft-types';
import { normalizeAircraftList } from './normalize-aircraft';

export type AircraftProvider = {
  readonly name: AircraftSource;
  getAircraftNear(lat: number, lon: number, radiusNm: number): Promise<Aircraft[]>;
  getByCallsign?(callsign: string): Promise<Aircraft[]>;
};

type CacheEntry = {
  expiresAt: number;
  value: AircraftNearResponse;
};

const nearCache = new Map<string, CacheEntry>();
const NEAR_CACHE_TTL_MS = 3_000;

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

export function nearCacheKey(lat: number, lon: number, radiusNm: number): string {
  return `${roundCoord(lat)}:${roundCoord(lon)}:${Math.round(radiusNm)}`;
}

export function clampRadiusNm(radiusNm: number): number {
  if (!Number.isFinite(radiusNm) || radiusNm <= 0) return 100;
  return Math.min(MAX_AIRCRAFT_RADIUS_NM, Math.max(1, Math.round(radiusNm)));
}

async function fetchV2Ac(
  url: string,
  source: AircraftSource,
): Promise<Aircraft[]> {
  const res = await fetchWithTimeout(url, {
    timeoutMs: 8_000,
    maxRetries: 1,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`${source} HTTP ${res.status}`);
  }
  const json = (await res.json()) as { ac?: unknown };
  return normalizeAircraftList(json.ac, source);
}

export class AdsbLolProvider implements AircraftProvider {
  readonly name = 'adsb.lol' as const;

  async getAircraftNear(lat: number, lon: number, radiusNm: number): Promise<Aircraft[]> {
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radiusNm}`;
    return fetchV2Ac(url, this.name);
  }

  async getByCallsign(callsign: string): Promise<Aircraft[]> {
    const q = encodeURIComponent(callsign.trim().toUpperCase());
    const url = `https://api.adsb.lol/v2/callsign/${q}`;
    return fetchV2Ac(url, this.name);
  }
}

export class AirplanesLiveProvider implements AircraftProvider {
  readonly name = 'airplanes.live' as const;

  async getAircraftNear(lat: number, lon: number, radiusNm: number): Promise<Aircraft[]> {
    const url = `https://api.airplanes.live/v2/point/${lat}/${lon}/${radiusNm}`;
    return fetchV2Ac(url, this.name);
  }
}

export class AdsbFiProvider implements AircraftProvider {
  readonly name = 'adsb.fi' as const;

  async getAircraftNear(lat: number, lon: number, radiusNm: number): Promise<Aircraft[]> {
    const url = `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${radiusNm}`;
    return fetchV2Ac(url, this.name);
  }
}

const defaultProviders: AircraftProvider[] = [
  new AdsbLolProvider(),
  new AirplanesLiveProvider(),
  new AdsbFiProvider(),
];

export type GetAircraftNearOptions = {
  providers?: AircraftProvider[];
  skipCache?: boolean;
  now?: number;
};

export async function getAircraftNear(
  lat: number,
  lon: number,
  radiusNm: number,
  options: GetAircraftNearOptions = {},
): Promise<AircraftNearResponse> {
  const radius = clampRadiusNm(radiusNm);
  const key = nearCacheKey(lat, lon, radius);
  const now = options.now ?? Date.now();

  if (!options.skipCache) {
    const hit = nearCache.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }
  }

  const providers = options.providers ?? defaultProviders;
  let lastError: unknown;
  let primaryFailed = false;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]!;
    try {
      const aircraft = await provider.getAircraftNear(lat, lon, radius);
      const value: AircraftNearResponse = {
        aircraft,
        source: provider.name,
        degraded: primaryFailed || i > 0,
        count: aircraft.length,
        fetchedAt: now,
      };
      nearCache.set(key, { expiresAt: now + NEAR_CACHE_TTL_MS, value });
      return value;
    } catch (err) {
      lastError = err;
      if (i === 0) primaryFailed = true;
      console.warn(`[aircraft-providers] ${provider.name} failed:`, err);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All aircraft providers failed');
}

export async function getAircraftByCallsign(
  callsign: string,
  providers: AircraftProvider[] = defaultProviders,
): Promise<{ aircraft: Aircraft[]; source: AircraftSource; degraded: boolean }> {
  const q = callsign.trim().toUpperCase();
  if (!q) {
    return { aircraft: [], source: 'adsb.lol', degraded: false };
  }

  const withCallsign = providers.filter((p) => typeof p.getByCallsign === 'function');
  const chain = withCallsign.length > 0 ? withCallsign : providers;
  let primaryFailed = false;
  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i]!;
    try {
      const aircraft = provider.getByCallsign
        ? await provider.getByCallsign(q)
        : (await provider.getAircraftNear(39.5, -98.35, 250)).filter(
            (a) => a.callsign === q,
          );
      return {
        aircraft,
        source: provider.name,
        degraded: primaryFailed || i > 0,
      };
    } catch (err) {
      lastError = err;
      if (i === 0) primaryFailed = true;
      console.warn(`[aircraft-providers] callsign ${provider.name} failed:`, err);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All callsign providers failed');
}

/** Test helper — clear in-process near cache. */
export function clearAircraftNearCache(): void {
  nearCache.clear();
}
