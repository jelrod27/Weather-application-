'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocationContext } from '@/components/location-context';
import { getStargazerHref, parseStargazerCoordinates, readStargazerContext } from '@/lib/stargazer/context';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { StargazerContext, StargazerCoordinates } from '@/lib/stargazer/context';
import type { StargazerData } from '@/lib/stargazer/types';
import type { StargazerTabId } from '@/components/stargazer/StargazerNav';

const VALID_TABS: StargazerTabId[] = ['conditions', 'targets', 'events', 'launches'];
function getTabFromHash(): StargazerTabId {
  const hash = window.location.hash.slice(1) as StargazerTabId;
  return VALID_TABS.includes(hash) ? hash : 'conditions';
}

async function geocodeLabel(label: string, signal: AbortSignal): Promise<StargazerCoordinates | null> {
  const res = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(label)}&limit=1`, { signal });
  if (!res.ok) return null;
  const body = await res.json();
  const place = Array.isArray(body) ? body[0] : body;
  return parseStargazerCoordinates(String(place?.lat ?? ''), String(place?.lon ?? ''));
}

export interface UseStargazerControllerResult {
  data: StargazerData | null;
  receivedAt: number | null;
  isLoading: boolean;
  error: string | null;
  activeTab: StargazerTabId;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  isSearching: boolean;
  handleTabChange: (tab: StargazerTabId) => void;
  handleLocationSearch: (event: FormEvent) => Promise<void>;
  handleDeviceLocation: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStargazerController(): UseStargazerControllerResult {
  const params = useSearchParams();
  const lat = params.get('lat');
  const lon = params.get('lon');
  const query = params.get('q') ?? '';
  const { currentLocation, locationInput } = useLocationContext();
  const storedLabel = locationInput || currentLocation;
  const [data, setData] = useState<StargazerData | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(query);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<StargazerTabId>('conditions');
  const intent = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const loadedKey = useRef('');
  const attempted = useRef<{ context: StargazerContext; device: boolean; history: 'push' | 'replace' } | null>(null);

  useEffect(() => {
    const update = () => setActiveTab(getTabFromHash());
    update();
    window.addEventListener('hashchange', update);
    return () => { window.removeEventListener('hashchange', update); loadedKey.current = ''; intent.current += 1; pending.current?.abort(); };
  }, []);

  const load = useCallback(async (context: StargazerContext, history: 'push' | 'replace' = 'replace', device = false) => {
    const version = ++intent.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const current = () => version === intent.current && !controller.signal.aborted;
    attempted.current = { context, device, history };
    setData(null);
    setReceivedAt(null);
    setError(null);
    setIsLoading(true);
    try {
      if (context.invalidCoordinates) throw new Error('Invalid location coordinates. Search for a city.');
      let coordinates = context.coordinates;
      if (device) {
        if (!navigator.geolocation) throw new Error('Location access is unavailable. Search for a city.');
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
        coordinates = parseStargazerCoordinates(String(position.coords.latitude), String(position.coords.longitude));
      } else if (!coordinates && context.label) {
        coordinates = await geocodeLabel(context.label, controller.signal);
        if (!coordinates) throw new Error('Location not found. Try a different city.');
      }
      if (!current() || !coordinates) return;
      attempted.current = { context: { ...context, coordinates }, device: false, history };
      const res = await fetch(`/api/stargazer?lat=${coordinates.lat}&lon=${coordinates.lon}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Forecast unavailable. Retry or choose a different location.');
      const payload: StargazerData = await res.json();
      if (!current()) return;
      setData(payload);
      setReceivedAt(Date.now());
      const resolved: StargazerContext = { ...context, coordinates, invalidCoordinates: false,
        label: payload.location.displayName || payload.location.name || context.label,
        timeZone: payload.location.timezone };
      setSearchQuery(resolved.label);
      loadedKey.current = JSON.stringify([String(coordinates.lat), String(coordinates.lon), resolved.label]);
      // Next's native history integration updates useSearchParams without a page reload.
      const href = getStargazerHref(resolved) + window.location.hash;
      if (history === 'push') window.history.pushState(null, '', href);
      else window.history.replaceState(null, '', href);
    } catch (failure) {
      if (!current()) return;
      setError(device ? 'Could not access your location. Search for a city instead.'
        : failure instanceof Error ? failure.message : 'Could not load this location. Please retry.');
    } finally {
      if (current()) { setIsLoading(false); setIsSearching(false); }
    }
  }, []);

  useEffect(() => {
    const key = JSON.stringify([lat, lon, query]);
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    const context = readStargazerContext(new URLSearchParams(window.location.search));
    if (!context.label && !context.coordinates && !context.invalidCoordinates) context.label = storedLabel;
    setSearchQuery(context.label);
    void load(context);
  }, [lat, lon, query, storedLabel, load]);

  const handleLocationSearch = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    await load({ ...readStargazerContext(new URLSearchParams(window.location.search)),
      coordinates: null, invalidCoordinates: false, label: searchQuery.trim(), at: null }, 'push');
  }, [load, searchQuery]);

  const handleDeviceLocation = useCallback(async () => {
    await load({ ...readStargazerContext(new URLSearchParams(window.location.search)),
      coordinates: null, invalidCoordinates: false, label: '', at: null }, 'push', true);
  }, [load]);
  const refresh = useCallback(async () => {
    if (data) await load(readStargazerContext(new URLSearchParams(window.location.search)));
    else if (attempted.current) await load(attempted.current.context, attempted.current.history, attempted.current.device);
  }, [data, load]);
  const handleTabChange = useCallback((tab: StargazerTabId) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  return { data, receivedAt, isLoading, error, activeTab, searchQuery, setSearchQuery, isSearching,
    handleTabChange, handleLocationSearch, handleDeviceLocation, refresh };
}
