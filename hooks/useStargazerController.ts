'use client';

import React, { useEffect, useState, useCallback, startTransition, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocationContext } from '@/components/location-context';
import type { StargazerData } from '@/lib/stargazer/types';
import type { StargazerTabId } from '@/components/stargazer/StargazerNav';

const VALID_TABS: StargazerTabId[] = ['conditions', 'targets', 'events', 'launches'];

function getTabFromHash(): StargazerTabId {
  if (typeof window === 'undefined') return 'conditions';
  const hash = window.location.hash.replace('#', '') as StargazerTabId;
  return VALID_TABS.includes(hash) ? hash : 'conditions';
}

function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

async function geocodeLabel(label: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const geoRes = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(label)}&limit=1`);
    if (!geoRes.ok) return null;
    const geoData = await geoRes.json();
    const result = Array.isArray(geoData) ? geoData[0] : geoData;
    if (result?.lat != null && result?.lon != null) {
      return { lat: result.lat, lon: result.lon };
    }
  } catch {
    return null;
  }
  return null;
}

export type UseStargazerControllerResult = {
  data: StargazerData | null;
  isLoading: boolean;
  error: string | null;
  activeTab: StargazerTabId;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isSearching: boolean;
  handleTabChange: (tab: StargazerTabId) => void;
  handleLocationSearch: (e: React.FormEvent) => Promise<void>;
};

export function useStargazerController(): UseStargazerControllerResult {
  const searchParams = useSearchParams();
  const { currentLocation, locationInput } = useLocationContext();
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const qParam = searchParams.get('q')?.trim() ?? '';
  const [data, setData] = useState<StargazerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StargazerTabId>('conditions');
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [isSearching, setIsSearching] = useState(false);
  const lastLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (qParam) setSearchQuery(qParam);
  }, [qParam]);

  // Read hash on mount
  useEffect(() => {
    setActiveTab(getTabFromHash());

    const handleHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash on tab change
  const handleTabChange = useCallback((tab: StargazerTabId) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  const fetchData = useCallback(async (customLat?: number, customLon?: number, options?: { usedFallback?: boolean }) => {
    try {
      setIsLoading(true);
      setError(null);

      let latitude: number;
      let longitude: number;
      let usedFallback = options?.usedFallback ?? false;

      if (customLat != null && customLon != null) {
        latitude = customLat;
        longitude = customLon;
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {
          latitude = 40.7128;
          longitude = -74.006;
          usedFallback = true;
        }
      }

      const response = await fetch(
        `/api/stargazer?lat=${latitude}&lon=${longitude}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      setData(json);

      if (usedFallback) {
        setError(
          'Could not determine your location. Showing forecast for New York City. Enable location access for personalized forecasts.'
        );
      }
    } catch (err) {
      console.error('[Stargazer]', err);
      setError(
        'Failed to load stargazer forecast. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveAndLoad = useCallback(async () => {
    const urlLat = parseCoord(latParam);
    const urlLon = parseCoord(lonParam);
    const loadKey = `${urlLat ?? ''},${urlLon ?? ''},${qParam},${locationInput},${currentLocation}`;

    if (lastLoadedKeyRef.current === loadKey) return;
    lastLoadedKeyRef.current = loadKey;

    if (qParam) {
      setSearchQuery(qParam);
    } else {
      const contextLabel = (locationInput || currentLocation)?.trim();
      if (contextLabel) setSearchQuery(contextLabel);
    }

    if (urlLat != null && urlLon != null) {
      await fetchData(urlLat, urlLon);
      return;
    }

    const contextLabel = (locationInput || currentLocation)?.trim();
    if (contextLabel) {
      const coords = await geocodeLabel(contextLabel);
      if (coords) {
        await fetchData(coords.lat, coords.lon);
        return;
      }
    }

    await fetchData();
  }, [latParam, lonParam, qParam, locationInput, currentLocation, fetchData]);

  const handleLocationSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const geoRes = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(searchQuery.trim())}&limit=1`);
      if (!geoRes.ok) {
        setError('Location not found. Try a different search.');
        return;
      }
      const geoData = await geoRes.json();
      const result = Array.isArray(geoData) ? geoData[0] : geoData;
      if (result?.lat != null && result?.lon != null) {
        setSearchQuery('');
        await fetchData(result.lat, result.lon);
      } else {
        setError('Location not found. Try a different search.');
      }
    } catch {
      setError('Failed to search location.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, fetchData]);

  useEffect(() => {
    startTransition(() => {
      void resolveAndLoad();
    });
  }, [resolveAndLoad]);

  return {
    data,
    isLoading,
    error,
    activeTab,
    searchQuery,
    setSearchQuery,
    isSearching,
    handleTabChange,
    handleLocationSearch,
  };
}
