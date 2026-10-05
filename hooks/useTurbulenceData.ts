/**
 * 16-Bit Weather Platform - Turbulence Data Hook
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches both real PIREP turbulence reports and G-AIRMET forecast polygons
 * for the aviation TurbulenceMap. Handles client-side caching, request
 * cancellation on unmount/refresh, and a 1-minute "now" tick used by the
 * age-based filter on the consumer side.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { safeStorage } from '@/lib/safe-storage';
import type { TurbulencePolygon } from '@/lib/aviation/turbulence';

export interface PIREPData {
  id: string;
  receiptTime: string;
  observationTime: string;
  aircraftRef: string;
  latitude: number;
  longitude: number;
  altitudeFt: number;
  turbulenceType: string | null;
  turbulenceIntensity: string | null;
  turbulenceBaseFt: number | null;
  turbulenceTopFt: number | null;
  icingType: string | null;
  icingIntensity: string | null;
  icingBaseFt: number | null;
  icingTopFt: number | null;
  tempC: number | null;
  windDir: number | null;
  windSpeedKt: number | null;
  reportType: string;
  rawText: string;
}

export interface UseTurbulenceDataResult {
  pireps: PIREPData[];
  polygons: TurbulencePolygon[];
  fetchedAt: string | null;
  isLoading: boolean;
  error: string | null;
  /** Re-fetch from the server, bypassing client cache. */
  refresh: () => void;
  /** Now() tick that updates each minute — used to keep the age filter fresh. */
  currentTime: number;
}

const PIREP_CACHE_KEY = 'bitweather_pirep_cache';
const PIREP_CACHE_TTL = 5 * 60 * 1000;
const TIME_TICK_MS = 60_000;

interface PirepCacheEntry {
  pireps: PIREPData[];
  fetchedAt: string;
  expiresAt: number;
}

function readCache(): PirepCacheEntry | null {
  try {
    const raw = safeStorage.getItem(PIREP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PirepCacheEntry;
    if (Date.now() < parsed.expiresAt) return parsed;
    safeStorage.removeItem(PIREP_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function writeCache(pireps: PIREPData[], fetchedAt: string): void {
  try {
    safeStorage.setItem(
      PIREP_CACHE_KEY,
      JSON.stringify({
        pireps,
        fetchedAt,
        expiresAt: Date.now() + PIREP_CACHE_TTL,
      } satisfies PirepCacheEntry),
    );
  } catch {
    // Ignore quota errors — cache is best-effort.
  }
}

export function useTurbulenceData(): UseTurbulenceDataResult {
  const [pireps, setPireps] = useState<PIREPData[]>([]);
  const [polygons, setPolygons] = useState<TurbulencePolygon[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (forceRefresh: boolean) => {
    // Try cache for PIREPs (only) — G-AIRMET is server-cached and cheap to refetch.
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setPireps(cached.pireps);
        setFetchedAt(cached.fetchedAt);
        setIsLoading(false);
        setError(null);
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const [pirepRes, turbRes] = await Promise.all([
        fetch('/api/aviation/pireps?hours=6&turbulenceOnly=false', {
          signal: controller.signal,
        }),
        fetch('/api/aviation/turbulence', {
          signal: controller.signal,
        }),
      ]);

      if (controller.signal.aborted) return;

      if (!pirepRes.ok) throw new Error(`PIREPs returned ${pirepRes.status}`);
      const pirepJson = await pirepRes.json();
      if (!pirepJson.success) throw new Error(pirepJson.error || 'PIREP fetch failed');

      const nextPireps = (pirepJson.data?.pireps ?? []) as PIREPData[];
      const nextFetchedAt = (pirepJson.data?.fetchedAt as string) ?? new Date().toISOString();
      setPireps(nextPireps);
      setFetchedAt(nextFetchedAt);
      writeCache(nextPireps, nextFetchedAt);

      // G-AIRMET is best-effort: if it fails, still show PIREPs.
      if (turbRes.ok) {
        const turbJson = await turbRes.json();
        if (turbJson.success && Array.isArray(turbJson.data?.polygons)) {
          setPolygons(turbJson.data.polygons as TurbulencePolygon[]);
        } else {
          setPolygons([]);
        }
      } else {
        setPolygons([]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[useTurbulenceData] fetch failed:', err);
      setError('Unable to load turbulence data');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial load + cleanup
  useEffect(() => {
    load(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  // Time tick for the consumer-side age filter
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), TIME_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  return {
    pireps,
    polygons,
    fetchedAt,
    isLoading,
    error,
    refresh,
    currentTime,
  };
}
