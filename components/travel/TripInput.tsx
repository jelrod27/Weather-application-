/**
 * TripInput - origin/destination + mode + day selector for the trip planner.
 *
 * Submits to /api/travel/trip-score and lifts the parsed `TripScoreResponse`
 * via callback. Autocomplete is sourced from MAJOR_US_AIRPORTS; in drive mode
 * a small set of major US cities is appended for convenience.
 */

'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Plane, Car, Search, AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAJOR_US_AIRPORTS } from '@/lib/data/major-us-airports';
import type { TripDay, TripMode, TripScoreResponse } from './trip-types';


interface TripInputProps {
  defaultMode?: TripMode;
  defaultDay?: TripDay;
  onResult: (result: TripScoreResponse) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: string) => void;
  className?: string;
}

const DAY_LABELS: Record<TripDay, string> = {
  0: 'Today',
  1: 'Tomorrow',
  2: 'Day 3',
};

const DAYS: TripDay[] = [0, 1, 2];

/**
 * Lightweight set of additional drive-mode destinations. Keep this small —
 * the airport list is the canonical autocomplete; cities are just a convenience.
 */
const MAJOR_US_CITIES: Array<{ city: string; state: string }> = [
  { city: 'Atlanta', state: 'GA' },
  { city: 'Austin', state: 'TX' },
  { city: 'Boston', state: 'MA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Dallas', state: 'TX' },
  { city: 'Denver', state: 'CO' },
  { city: 'Detroit', state: 'MI' },
  { city: 'Houston', state: 'TX' },
  { city: 'Indianapolis', state: 'IN' },
  { city: 'Kansas City', state: 'MO' },
  { city: 'Las Vegas', state: 'NV' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Memphis', state: 'TN' },
  { city: 'Miami', state: 'FL' },
  { city: 'Minneapolis', state: 'MN' },
  { city: 'Nashville', state: 'TN' },
  { city: 'New Orleans', state: 'LA' },
  { city: 'New York', state: 'NY' },
  { city: 'Oklahoma City', state: 'OK' },
  { city: 'Omaha', state: 'NE' },
  { city: 'Philadelphia', state: 'PA' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Pittsburgh', state: 'PA' },
  { city: 'Portland', state: 'OR' },
  { city: 'Salt Lake City', state: 'UT' },
  { city: 'San Antonio', state: 'TX' },
  { city: 'San Diego', state: 'CA' },
  { city: 'San Francisco', state: 'CA' },
  { city: 'Seattle', state: 'WA' },
  { city: 'St. Louis', state: 'MO' },
  { city: 'Tampa', state: 'FL' },
  { city: 'Washington', state: 'DC' },
];

interface AutocompleteOption {
  value: string;
  label: string;
}

function buildAutocompleteOptions(mode: TripMode): AutocompleteOption[] {
  // value = bare IATA code so picking from the dropdown puts only "DEN"
  // into the field. The full "DEN — Denver, CO" label still renders in
  // the dropdown for searchability (chrome/edge match label too) and
  // visual confirmation. Submitting the bare code matches what the
  // server resolver expects without prefix-parsing gymnastics.
  const airportOptions: AutocompleteOption[] = MAJOR_US_AIRPORTS.map((a) => ({
    value: a.iata,
    label: `${a.iata} — ${a.city}, ${a.state}`,
  }));

  if (mode === 'fly') return airportOptions;

  const cityOptions: AutocompleteOption[] = MAJOR_US_CITIES.map((c) => ({
    value: `${c.city}, ${c.state}`,
    label: `${c.city}, ${c.state}`,
  }));

  // De-dupe on value so airport-city overlap doesn't render twice.
  const seen = new Set<string>();
  return [...airportOptions, ...cityOptions].filter((opt) => {
    if (seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  });
}

export default function TripInput({
  defaultMode = 'fly',
  defaultDay = 0,
  onResult,
  onLoadingChange,
  onError,
  className,
}: TripInputProps) {
  const [mode, setMode] = useState<TripMode>(defaultMode);
  const [day, setDay] = useState<TripDay>(defaultDay);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const reactId = useId();
  const datalistId = `trip-input-options-${reactId}`;

  const options = useMemo(() => buildAutocompleteOptions(mode), [mode]);

  // Tear down any in-flight request when the component unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const setLoading = useCallback(
    (value: boolean) => {
      setIsLoading(value);
      onLoadingChange?.(value);
    },
    [onLoadingChange],
  );

  const reportError = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const o = origin.trim();
      const d = destination.trim();
      if (!o || !d) {
        reportError('Enter both an origin and a destination.');
        return;
      }

      // Cancel any prior request before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setLoading(true);
      try {
        const params = new URLSearchParams({
          origin: o,
          destination: d,
          mode,
          day: String(day),
        });
        const res = await fetch(`/api/travel/trip-score?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await res.json().catch(() => null)) as
          | TripScoreResponse
          | { error?: string }
          | null;

        if (controller.signal.aborted) return;

        if (!res.ok || !payload || 'error' in payload) {
          const message =
            (payload && 'error' in payload && payload.error) ||
            `Trip lookup failed (${res.status})`;
          reportError(message);
          return;
        }

        onResult(payload as TripScoreResponse);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('[TripInput]', err);
        reportError('Unable to score this trip. Please try again.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [origin, destination, mode, day, onResult, reportError, setLoading],
  );

  const canSubmit = !isLoading && origin.trim().length > 0 && destination.trim().length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode toggle */}
      <div
        className="inline-flex rounded border-2 border-border overflow-hidden font-mono text-sm"
        role="tablist"
        aria-label="Trip mode"
      >
        {(['fly', 'drive'] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/50 text-muted-foreground hover:bg-card/80',
              )}
              data-testid={`trip-mode-${m}`}
            >
              {m === 'fly' ? <Plane className="w-4 h-4" /> : <Car className="w-4 h-4" />}
              {m === 'fly' ? 'Fly' : 'Drive'}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Origin / destination inputs */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                if (error) setError(null);
              }}
              placeholder={mode === 'fly' ? 'Origin airport (e.g. ATL)' : 'Origin city or airport'}
              list={datalistId}
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'w-full pl-10 pr-3 py-2 font-mono text-sm border-2 rounded bg-card border-border',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'placeholder:text-muted-foreground',
                isLoading && 'opacity-50 cursor-not-allowed',
              )}
              data-testid="trip-origin-input"
              aria-label="Origin"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                mode === 'fly' ? 'Destination airport (e.g. DEN)' : 'Destination city or airport'
              }
              list={datalistId}
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'w-full pl-10 pr-3 py-2 font-mono text-sm border-2 rounded bg-card border-border',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'placeholder:text-muted-foreground',
                isLoading && 'opacity-50 cursor-not-allowed',
              )}
              data-testid="trip-destination-input"
              aria-label="Destination"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'flex items-center justify-center gap-2 px-5 py-2 font-mono text-sm font-bold border-2 rounded uppercase tracking-wider transition-colors',
              'border-border min-w-[120px]',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed',
            )}
            data-testid="trip-submit"
            aria-label="Plan trip"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            {isLoading ? 'Scoring…' : 'Plan Trip'}
          </button>
        </div>

        {/* Day selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            When:
          </span>
          {DAYS.map((d) => {
            const active = day === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={cn(
                  'px-3 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider transition-colors border',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card/50 text-muted-foreground hover:bg-card/80 border-border',
                )}
                aria-pressed={active}
                data-testid={`trip-day-${d}`}
              >
                {DAY_LABELS[d]}
              </button>
            );
          })}
        </div>
      </form>

      {/* Datalist (shared between both inputs) */}
      <datalist id={datalistId}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </datalist>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 p-2 text-xs font-mono rounded border"
          style={{
            color: 'var(--severity-extreme)',
            backgroundColor: 'var(--severity-extreme-bg)',
            borderColor: 'var(--severity-extreme)',
          }}
          role="alert"
          aria-live="polite"
          data-testid="trip-input-error"
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
