'use client';

import { useRemoteData } from '@/hooks/useRemoteData';
import type { WeatherData } from '@/lib/types';
import type { HubUserLocation } from '@/lib/home/hub-utils';

type Coords = { lat: number; lon: number };

/** Resolved labels change rarely; an hour is plenty and bounds the memory. */
const GEOCODE_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Resolve lat/lon for the home hub even when the weather cache stripped
 * coordinates.
 *
 * The module-scope geocode Map this used to keep is now the shared cache in
 * useRemoteData, which also brings the cancellation this hook only approximated
 * with a `cancelled` flag — the request itself was never aborted.
 */
export function useHubLocation(weather: WeatherData | null): HubUserLocation | null {
  const label = weather?.location ?? null;
  const lat = weather?.coordinates?.lat;
  const lon = weather?.coordinates?.lon;
  const hasCoords = lat != null && lon != null;

  const { data: geocoded } = useRemoteData<Coords | null>({
    // Only geocode when the weather payload arrived without coordinates.
    key: label && !hasCoords ? `geocode:${label.toLowerCase().trim()}` : null,
    cacheTtlMs: GEOCODE_CACHE_TTL_MS,
    fetcher: async (signal) => {
      const res = await fetch(
        `/api/weather/geocoding?q=${encodeURIComponent(label ?? '')}&limit=1`,
        { signal },
      );
      if (!res.ok) return null;

      const body = (await res.json()) as
        | Array<{ lat?: number; lon?: number }>
        | { lat?: number; lon?: number };
      const first = Array.isArray(body) ? body[0] : body;
      if (first?.lat == null || first?.lon == null) return null;

      return { lat: first.lat, lon: first.lon };
    },
  });

  if (!label) return null;

  const coords: Coords | null = hasCoords ? { lat, lon } : geocoded ?? null;
  if (!coords) return null;

  return {
    lat: coords.lat,
    lon: coords.lon,
    locationLabel: label,
    country: weather?.country ?? '',
  };
}
