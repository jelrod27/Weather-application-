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

  // Monotonic load id + in-flight abort. This surface resolves coordinates
  // through geolocation, a geocode, or an imperative search box, so loads can
  // overlap: without this guard a slow earlier response lands after a fast
  // later one and overwrites it. useRemoteData applies the same rule for the
  // surfaces whose load is a single keyed request.
  const loadIdRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);

  // loadIdRef alone only covers work *inside* fetchData. Both callers below do
  // async work (a geocode) BEFORE calling it, so an abandoned run's slow geocode
  // would resolve late and start a brand-new load that then wins — a race the
  // monotonic counter cannot see, because the stale work starts a fresh load
  // rather than finishing an old one. intentRef versions the user-visible
  // intent, and each caller re-checks it after every await.
  const intentRef = useRef(0);

  useEffect(() => {
    return () => {
      loadIdRef.current += 1;
      inFlightRef.current?.abort();
    };
  }, []);

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
    const loadId = ++loadIdRef.current;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;
    const isCurrent = () => loadId === loadIdRef.current;

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

      if (!isCurrent()) return;

      const response = await fetch(
        `/api/stargazer?lat=${latitude}&lon=${longitude}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (!isCurrent()) return;
      setData(json);

      if (usedFallback) {
        setError(
          'Could not determine your location. Showing forecast for New York City. Enable location access for personalized forecasts.'
        );
      }
    } catch (err) {
      // A load superseded by a newer one is not a failure to report.
      if (controller.signal.aborted || !isCurrent()) return;
      console.error('[Stargazer]', err);
      setError(
        'Failed to load stargazer forecast. Please try again later.'
      );
    } finally {
      if (isCurrent()) setIsLoading(false);
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

    const intent = ++intentRef.current;

    if (urlLat != null && urlLon != null) {
      await fetchData(urlLat, urlLon);
      return;
    }

    const contextLabel = (locationInput || currentLocation)?.trim();
    if (contextLabel) {
      const coords = await geocodeLabel(contextLabel);
      // A newer resolve started while this geocode was in flight.
      if (intent !== intentRef.current) return;
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

    const intent = ++intentRef.current;
    const isCurrent = () => intent === intentRef.current;

    setIsSearching(true);
    try {
      const geoRes = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(searchQuery.trim())}&limit=1`);
      // A superseded search must not write "not found" over a newer result.
      if (!isCurrent()) return;
      if (!geoRes.ok) {
        setError('Location not found. Try a different search.');
        return;
      }
      const geoData = await geoRes.json();
      if (!isCurrent()) return;
      const result = Array.isArray(geoData) ? geoData[0] : geoData;
      if (result?.lat != null && result?.lon != null) {
        setSearchQuery('');
        await fetchData(result.lat, result.lon);
      } else {
        setError('Location not found. Try a different search.');
      }
    } catch {
      if (!isCurrent()) return;
      setError('Failed to search location.');
    } finally {
      // Only the newest search owns the spinner.
      if (isCurrent()) setIsSearching(false);
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
