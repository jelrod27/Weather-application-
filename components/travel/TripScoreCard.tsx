/**
 * TripScoreCard - renders the unified misery score for a planned trip.
 *
 * Handles both `fly` and `drive` shapes from /api/travel/trip-score:
 * - Drive: corridor name + worst-stretch callout + corridor overview limits.
 * - Fly: origin / en-route / destination sub-cards.
 */

'use client';

import React from 'react';
import { Plane, Car, AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiseryBadge, MiseryDriverList } from '@/components/ui/misery-badge';
import { TRIP_DAY_LABELS } from './trip-types';
import type {
  DriveTripScore,
  FlyTripScore,
  TripScoreResponse,
  TripDay,
} from './trip-types';

interface TripScoreCardProps {
  result: TripScoreResponse;
  day: TripDay;
  isLoading?: boolean;
  className?: string;
}

export default function TripScoreCard({
  result,
  day,
  isLoading = false,
  className,
}: TripScoreCardProps): React.JSX.Element {
  if (isLoading) {
    return <TripScoreCardSkeleton className={className} />;
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4',
        className,
      )}
      data-testid="trip-score-card"
    >
      {result.mode === 'drive' ? (
        <DriveBody result={result} day={day} />
      ) : (
        <FlyBody result={result} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Drive                                                                       */
/* -------------------------------------------------------------------------- */

function DriveBody({ result, day }: { result: DriveTripScore; day: TripDay }) {
  const { score, route, worstSegment } = result;

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Car className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-mono text-muted-foreground">
              Drive · {TRIP_DAY_LABELS[day]}
            </p>
            <h3
              className="font-bold text-lg truncate"
              title={route.corridorName}
            >
              {route.corridorName}
            </h3>
          </div>
        </div>
        <MiseryBadge score={score} size="lg" />
      </header>

      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Top drivers
        </p>
        <MiseryDriverList score={score} />
      </div>

      <WorstStretchCallout segment={worstSegment} />

      <p className="text-xs leading-relaxed text-muted-foreground border-t border-border pt-3">
        Corridor weather overview from sampled locations. Peak travel time is unavailable;
        this score does not account for your departure time or progress along the route.
      </p>
    </>
  );
}

function WorstStretchCallout({
  segment,
}: {
  segment: DriveTripScore['worstSegment'];
}) {
  const place = segment.nearestPlace?.trim();
  return (
    <div
      className="flex items-start gap-3 rounded border border-border bg-card/40 p-3"
      data-testid="trip-worst-segment"
    >
      <AlertTriangle
        className="w-4 h-4 mt-0.5 shrink-0"
        style={{ color: 'var(--severity-extreme)' }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs font-mono text-muted-foreground">
          Worst stretch
        </p>
        <p className="font-mono text-sm font-bold">
          {segment.hazard}
          {place && (
            <>
              <span className="text-muted-foreground"> — near </span>
              {place}
            </>
          )}
        </p>
        <p className="text-xs font-mono text-muted-foreground">
          {segment.lat.toFixed(2)}°, {segment.lon.toFixed(2)}°
        </p>
      </div>
      <MiseryBadge score={segment.score} size="sm" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fly                                                                         */
/* -------------------------------------------------------------------------- */

function FlyBody({ result }: { result: FlyTripScore }) {
  const { score, route } = result;
  const routeSummary = `${route.origin.airport.iata} → ${route.destination.airport.iata}`;

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Plane className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-mono text-muted-foreground">
              Fly · Live
            </p>
            <h3 className="font-bold text-lg">
              {routeSummary}
            </h3>
            <p className="text-xs font-mono text-muted-foreground truncate">
              {route.origin.airport.city} to {route.destination.airport.city}
            </p>
          </div>
        </div>
        <MiseryBadge score={score} size="lg" />
      </header>

      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Top drivers
        </p>
        <MiseryDriverList score={score} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <FlyLegCard
          label="Origin"
          primary={route.origin.airport.iata}
          secondary={route.origin.airport.city}
          score={route.origin.score}
        />
        <FlyLegCard
          label="En-route"
          primary="Midpoint"
          secondary={`${route.enroute.midpoint.lat.toFixed(2)}°, ${route.enroute.midpoint.lon.toFixed(2)}°`}
          score={route.enroute.score}
        />
        <FlyLegCard
          label="Destination"
          primary={route.destination.airport.iata}
          secondary={route.destination.airport.city}
          score={route.destination.score}
        />
      </div>
      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        Live observations at major U.S. hub airports and a midpoint check of current aviation alerts.
        This is a weather overview, not a full flight-path or departure-time forecast.
      </p>
    </>
  );
}

function FlyLegCard({
  label,
  primary,
  secondary,
  score,
}: {
  label: string;
  primary: string;
  secondary: string;
  score: FlyTripScore['route']['origin']['score'];
}) {
  return (
    <div
      className="rounded border border-border bg-card/40 p-3 space-y-2"
      data-testid={`trip-fly-leg-${label.toLowerCase()}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
        <MapPin className="w-3 h-3" aria-hidden="true" />
        {label}
      </div>
      <div className="font-mono">
        <p className="text-sm font-bold leading-tight">{primary}</p>
        <p className="text-xs text-muted-foreground truncate" title={secondary}>
          {secondary}
        </p>
      </div>
      <MiseryBadge score={score} size="sm" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function TripScoreCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4 animate-pulse',
        className,
      )}
      data-testid="trip-score-card-skeleton"
      aria-busy="true"
    >
      <span className="sr-only">Checking trip weather…</span>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted/60" />
          <div className="h-6 w-48 rounded bg-muted/60" />
        </div>
        <div className="h-9 w-24 rounded bg-muted/60" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted/60" />
        <div className="flex gap-1.5">
          <div className="h-5 w-20 rounded bg-muted/60" />
          <div className="h-5 w-24 rounded bg-muted/60" />
          <div className="h-5 w-16 rounded bg-muted/60" />
        </div>
      </div>
      <div className="h-16 rounded bg-muted/60" />
    </div>
  );
}
