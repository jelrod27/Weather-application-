'use client';

import React from 'react';
import { Plane, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRIP_DAY_LABELS } from './trip-types';
import type { ReactNode } from 'react';
import type { TripDay, TripMode } from './trip-types';

export interface TravelHubProps {
  mode: TripMode;
  day: TripDay;
  onModeChange: (mode: TripMode) => void;
  onDayChange: (day: TripDay) => void;
  tripInput: ReactNode;
  tripResult: ReactNode;
  flyContent: ReactNode;
  driveContent: ReactNode;
  className?: string;
}

const DAYS: TripDay[] = [0, 1, 2];
const CONTROL_CLASS = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 font-mono text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function TravelHub({
  mode,
  day,
  onModeChange,
  onDayChange,
  tripInput,
  tripResult,
  flyContent,
  driveContent,
  className,
}: TravelHubProps): React.JSX.Element {
  return (
    <div className={cn('space-y-6', className)}>
      <header className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wide text-primary">Weather for your journey</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Travel Hub</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Check your route, then explore the bigger picture across U.S. roads and airports.
        </p>
      </header>

      <section aria-label="Plan your trip" className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <fieldset className="space-y-2">
            <legend className="text-xs font-mono text-muted-foreground">Travel mode</legend>
            <div className="flex gap-2">
              {(['drive', 'fly'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => onModeChange(option)}
                  className={cn(CONTROL_CLASS, 'flex-1 sm:flex-none', mode === option
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted')}
                >
                  {option === 'fly' ? <Plane className="h-4 w-4" aria-hidden="true" /> : <Car className="h-4 w-4" aria-hidden="true" />}
                  {option === 'fly' ? 'Fly' : 'Drive'}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2" aria-describedby={mode === 'fly' ? 'travel-live-note' : undefined}>
            <legend className="text-xs font-mono text-muted-foreground">Day</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={day === option}
                  disabled={mode === 'fly' && option !== 0}
                  onClick={() => onDayChange(option)}
                  className={cn(CONTROL_CLASS, 'px-3 disabled:cursor-not-allowed disabled:opacity-50', day === option
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground enabled:hover:bg-muted')}
                >
                  {TRIP_DAY_LABELS[option]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        {mode === 'fly' && (
          <p id="travel-live-note" className="text-xs leading-relaxed text-muted-foreground">
            Fly uses live airport observations and current aviation alerts. Future-day flight forecasts are unavailable.
          </p>
        )}
        {tripInput}
      </section>

      <div aria-live="polite" aria-atomic="true">{tripResult}</div>

      <section aria-labelledby="travel-national-heading" className="space-y-4 border-t border-border pt-5">
        <div className="space-y-1">
          <h2 id="travel-national-heading" className="text-lg font-bold tracking-tight">
            {mode === 'fly' ? 'U.S. airport conditions · Live' : `U.S. driving outlook · ${TRIP_DAY_LABELS[day]}`}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {mode === 'fly'
              ? 'Current weather risk at major hubs, with more detail in Aviation.'
              : 'Weather at sampled points along major interstates, plus the national forecast chart.'}
          </p>
        </div>
        {mode === 'fly' ? flyContent : driveContent}
      </section>
    </div>
  );
}
