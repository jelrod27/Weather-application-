'use client';

/**
 * 16-Bit Weather Platform - Travel Hub Page
 *
 * Shared inputs drive the trip form, result and national outlook.
 * Input edits abort pending lookups before the selected view can change.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useInView } from 'react-intersection-observer';
import PageWrapper from '@/components/page-wrapper';
import { MapSkeleton } from '@/components/skeletons/map-skeleton';
import WorstCorridors from '@/components/travel/WorstCorridors';
import DailyOutlookImages from '@/components/travel/DailyOutlookImages';
import TravelHub from '@/components/travel/TravelHub';
import TripInput from '@/components/travel/TripInput';
import TripScoreCard from '@/components/travel/TripScoreCard';
import { AirportMiseryBoard } from '@/components/aviation';
import { ShareButtons } from '@/components/share-buttons';
import type { TripDay, TripInputs, TripMode, TripScoreResponse } from '@/components/travel/trip-types';
import type { SeverityLevel } from '@/lib/services/travel-corridor-service';

const TravelCorridorMap = dynamic(() => import('@/components/travel/TravelCorridorMap'), {
  ssr: false,
  loading: () => <MapSkeleton height="h-[500px]" />,
});

interface CorridorData {
  name: string;
  score: number;
  level: SeverityLevel;
  color: string;
  hazard: string;
  path: number[][];
  segments: Array<{ lat: number; lon: number; score: number; level: SeverityLevel; color: string }>;
}

interface CorridorsResponse {
  corridors: CorridorData[];
  worstCorridors: CorridorData[];
  forecastDay: number;
  fetchedAt: string;
}

const MODE_STORAGE_KEY = 'travel-hub-mode';

export default function TravelPage(): React.JSX.Element {
  const [inputs, setInputs] = useState<TripInputs>({ mode: 'drive', day: 0, origin: '', destination: '' });
  const [tripResult, setTripResult] = useState<TripScoreResponse | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripError, setTripError] = useState<string | null>(null);
  const tripAbortRef = useRef<AbortController | null>(null);

  const changeInputs = useCallback((next: TripInputs) => {
    // Abort synchronously with the edit. Even a response already being parsed
    // must not repopulate the result (or error) for the previous inputs.
    tripAbortRef.current?.abort();
    setInputs(next);
    setTripResult(null);
    setTripError(null);
    setTripLoading(false);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
      if (stored === 'fly' || stored === 'drive') {
        setInputs((current) => ({ ...current, mode: stored, day: 0 }));
      }
    } catch {
      // Private browsing may make storage unavailable.
    }
    return () => tripAbortRef.current?.abort();
  }, []);

  const changeMode = (mode: TripMode) => {
    if (mode === inputs.mode) return;
    changeInputs({ ...inputs, mode, day: mode === 'fly' ? 0 : inputs.day });
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // The selected mode still works when storage is unavailable.
    }
  };

  const submitTrip = async () => {
    tripAbortRef.current?.abort();
    setTripResult(null);
    setTripError(null);
    const origin = inputs.origin.trim();
    const destination = inputs.destination.trim();
    if (!origin || !destination) {
      setTripLoading(false);
      setTripError('Enter both an origin and a destination.');
      return;
    }

    const controller = new AbortController();
    tripAbortRef.current = controller;
    setTripLoading(true);
    try {
      const params = new URLSearchParams({ origin, destination, mode: inputs.mode, day: String(inputs.day) });
      const res = await fetch(`/api/travel/trip-score?${params.toString()}`, { signal: controller.signal });
      const payload = (await res.json().catch(() => null)) as TripScoreResponse | { error?: string } | null;
      if (controller.signal.aborted) return;
      if (!res.ok || !payload || 'error' in payload) {
        setTripError((payload && 'error' in payload && payload.error) || `Trip lookup failed (${res.status})`);
        return;
      }
      setTripResult(payload as TripScoreResponse);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('[Travel trip]', error);
      setTripError('Unable to score this trip. Please try again.');
    } finally {
      if (!controller.signal.aborted) setTripLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <TravelHub
          mode={inputs.mode}
          day={inputs.day}
          onModeChange={changeMode}
          onDayChange={(day) => {
            if (day !== inputs.day) changeInputs({ ...inputs, day });
          }}
          tripInput={
            <TripInput
              value={inputs}
              onChange={changeInputs}
              onSubmit={submitTrip}
              isLoading={tripLoading}
              error={tripError}
            />
          }
          tripResult={tripResult || tripLoading ? (
            <TripScoreCard result={tripResult ?? createPlaceholder()} day={inputs.day} isLoading={tripLoading} />
          ) : null}
          flyContent={<FlyContent />}
          driveContent={<DriveContent key={inputs.day} day={inputs.day} />}
        />
        <ShareButtons
          config={{
            title: 'Travel Hub',
            text: 'Plan your trip — flight delays, road conditions, and weather misery scoring at 16bitweather.co',
            url: 'https://www.16bitweather.co/travel',
          }}
          className="mt-6 justify-center"
        />
      </div>
    </PageWrapper>
  );
}

/* Placeholder used while tripLoading is true and we don't yet have a result.
   TripScoreCard will render its skeleton state and ignore the placeholder shape. */
function createPlaceholder(): TripScoreResponse {
  const placeholderMisery = {
    score: 0,
    level: 'green' as const,
    color: '#22c55e',
    label: 'SMOOTH',
    drivers: [],
    context: 'route' as const,
  };
  return {
    mode: 'drive',
    score: placeholderMisery,
    route: { corridorName: '', segments: [] },
    worstSegment: { lat: 0, lon: 0, score: placeholderMisery, hazard: '' },
  };
}

/* -------------------------------------------------------------------------- */
/* Fly mode content                                                            */
/* -------------------------------------------------------------------------- */

function FlyContent(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <AirportMiseryBoard />
      <div className="text-center">
        <Link
          href="/aviation"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Aviation details: alerts, turbulence & airport reports →
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Drive mode content (preserves existing corridor map + outlooks UI)          */
/* -------------------------------------------------------------------------- */

function DriveContent({ day }: { day: TripDay }): React.JSX.Element {
  const [data, setData] = useState<CorridorsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px',
    threshold: 0,
  });

  const fetchCorridors = useCallback(async (forecastDay: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/travel/corridors?day=${forecastDay}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to fetch corridor data');
      const result: CorridorsResponse = await res.json();
      if (controller.signal.aborted) return;
      setData(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('[Travel]', err);
      setError('Unable to load travel corridor data');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCorridors(day);
  }, [day, fetchCorridors]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div ref={ref} style={{ minHeight: '500px', contain: 'layout style paint' }}>
        {inView ? (
          <TravelCorridorMap corridors={data?.corridors ?? []} isLoading={isLoading} />
        ) : (
          <MapSkeleton height="h-[500px]" />
        )}
      </div>

      {!error && (
        <WorstCorridors corridors={data?.worstCorridors ?? []} isLoading={isLoading} />
      )}

      <DailyOutlookImages day={day} />

      {data?.fetchedAt && (
        <p className="text-center text-xs font-mono text-muted-foreground">
          Last updated: {new Date(data.fetchedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
