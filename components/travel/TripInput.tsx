/**
 * TripInput - controlled origin/destination form for the trip planner.
 *
 * Mode, day, requests and result state are owned by the travel page.
 * Autocomplete is sourced from MAJOR_US_AIRPORTS; in drive mode
 * a small set of major US cities is appended for convenience.
 */

'use client';

import React, { useId, useMemo } from 'react';
import { Search, AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAJOR_US_AIRPORTS } from '@/lib/data/major-us-airports';
import type { TripInputs, TripMode } from './trip-types';

interface TripInputProps {
  value: TripInputs;
  onChange: (value: TripInputs) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
  className?: string;
}

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
  value,
  onChange,
  onSubmit,
  isLoading,
  error,
  className,
}: TripInputProps): React.JSX.Element {
  const { mode, origin, destination } = value;
  const reactId = useId();
  const datalistId = `trip-input-options-${reactId}`;
  const options = useMemo(() => buildAutocompleteOptions(mode), [mode]);
  const canSubmit = !isLoading && origin.trim().length > 0 && destination.trim().length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="space-y-3"
      >
        {/* Origin / destination inputs */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={origin}
              onChange={(e) => onChange({ ...value, origin: e.target.value })}
              placeholder={mode === 'fly' ? 'Origin airport (e.g. ATL)' : 'Origin city or airport'}
              list={datalistId}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'min-h-11 w-full pl-10 pr-3 py-2 font-mono text-sm border rounded-lg bg-background border-border',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'placeholder:text-muted-foreground',
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
              onChange={(e) => onChange({ ...value, destination: e.target.value })}
              placeholder={
                mode === 'fly' ? 'Destination airport (e.g. DEN)' : 'Destination city or airport'
              }
              list={datalistId}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'min-h-11 w-full pl-10 pr-3 py-2 font-mono text-sm border rounded-lg bg-background border-border',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'placeholder:text-muted-foreground',
              )}
              data-testid="trip-destination-input"
              aria-label="Destination"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 px-5 py-2 font-mono text-sm font-bold border rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
      </form>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {mode === 'fly'
          ? 'Major U.S. hub airports only. Enter an IATA/ICAO airport code or hub city.'
          : 'Enter cities or airport codes. Driving scores cover supported U.S. interstate corridors.'}
      </p>

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
          className="flex items-center gap-2 p-2 text-sm leading-relaxed rounded-lg border"
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
