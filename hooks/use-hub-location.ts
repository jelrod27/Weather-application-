'use client';

import { useEffect, useState } from 'react';
import type { WeatherData } from '@/lib/types';
import type { HubUserLocation } from '@/lib/home/hub-utils';

const geocodeCache = new Map<string, { lat: number; lon: number }>();

async function geocodeLabel(label: string): Promise<{ lat: number; lon: number } | null> {
  const key = label.toLowerCase().trim();
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(label)}&limit=1`);
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: number; lon?: number }> | { lat?: number; lon?: number };
    const first = Array.isArray(data) ? data[0] : data;
    if (first?.lat == null || first?.lon == null) return null;
    const coords = { lat: first.lat, lon: first.lon };
    geocodeCache.set(key, coords);
    return coords;
  } catch {
    return null;
  }
}

/** Resolve lat/lon for the home hub even when weather cache stripped coordinates. */
export function useHubLocation(weather: WeatherData | null): HubUserLocation | null {
  const [resolved, setResolved] = useState<HubUserLocation | null>(null);

  useEffect(() => {
    if (!weather?.location) {
      setResolved(null);
      return;
    }

    const lat = weather.coordinates?.lat;
    const lon = weather.coordinates?.lon;
    if (lat != null && lon != null) {
      setResolved({
        lat,
        lon,
        locationLabel: weather.location,
        country: weather.country ?? '',
      });
      return;
    }

    let cancelled = false;
    void geocodeLabel(weather.location).then((coords) => {
      if (cancelled || !coords) {
        if (!cancelled) setResolved(null);
        return;
      }
      setResolved({
        lat: coords.lat,
        lon: coords.lon,
        locationLabel: weather.location,
        country: weather.country ?? '',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [weather?.location, weather?.country, weather?.coordinates?.lat, weather?.coordinates?.lon]);

  return resolved;
}
