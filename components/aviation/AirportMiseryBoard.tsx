/**
 * 16-Bit Weather Platform - Airport Misery Board
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Sortable retro terminal board ranking the top US hub airports by
 * weather-driven delay risk (the unified "misery score"). Sits above the
 * detail flight conditions terminal on /aviation.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Clock, Plane, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format-time-ago';
import { MiseryBadge, MiseryDriverList } from '@/components/ui/misery-badge';
import type { MiseryScore } from '@/lib/services/misery-score-service';
import type { MajorAirport } from '@/lib/data/major-us-airports';
import type { MetarObservation } from '@/lib/aviation/metar'

interface AirportMiseryRow {
  airport: MajorAirport;
  score: MiseryScore;
  metar?: MetarObservation;
  isStale?: boolean;
}

interface AirportMiseryResponse {
  airports: AirportMiseryRow[];
  fetchedAt: string;
}

type SortKey = 'score' | 'iata' | 'city';
type SortDir = 'asc' | 'desc';

interface AirportMiseryBoardProps {
  className?: string;
}

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const FLIGHT_CATEGORY_COLOR: Record<string, string> = {
  VFR: 'var(--severity-light)',
  MVFR: 'var(--severity-moderate)',
  IFR: 'var(--severity-severe)',
  LIFR: 'var(--severity-extreme)',
  UNKNOWN: 'var(--text)',
};

function compareRows(a: AirportMiseryRow, b: AirportMiseryRow, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  if (key === 'score') {
    cmp = a.score.score - b.score.score;
  } else if (key === 'iata') {
    cmp = a.airport.iata.localeCompare(b.airport.iata);
  } else if (key === 'city') {
    cmp = a.airport.city.localeCompare(b.airport.city);
  }
  return dir === 'asc' ? cmp : -cmp;
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}

function SortHeader({ label, active, dir, onClick, className }: SortHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider hover:opacity-80 transition-opacity',
        active && 'underline underline-offset-4',
        className,
      )}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      {active &&
        (dir === 'asc' ? (
          <ArrowUp className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ArrowDown className="w-3 h-3" aria-hidden="true" />
        ))}
    </button>
  );
}

function FlightCategoryChip({ category }: { category?: string }) {
  const value = (category && category.toUpperCase()) || 'UNKNOWN';
  const color = FLIGHT_CATEGORY_COLOR[value] ?? 'var(--text)';
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] tracking-wider border rounded"
      style={{
        color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
      title={`Flight category: ${value}`}
    >
      {value}
    </span>
  );
}

function SkeletonRow({ idx }: { idx: number }) {
  return (
    <tr className="border-t border-subtle">
      <td className="px-3 py-3 font-mono text-xs opacity-60">{idx + 1}</td>
      <td className="px-3 py-3">
        <div className="h-4 w-24 bg-muted/40 animate-pulse rounded" />
      </td>
      <td className="px-3 py-3">
        <div className="h-5 w-20 bg-muted/40 animate-pulse rounded" />
      </td>
      <td className="px-3 py-3">
        <div className="h-4 w-40 bg-muted/40 animate-pulse rounded" />
      </td>
      <td className="px-3 py-3">
        <div className="h-4 w-12 bg-muted/40 animate-pulse rounded" />
      </td>
    </tr>
  );
}

export default function AirportMiseryBoard({ className }: AirportMiseryBoardProps) {
  const [rows, setRows] = useState<AirportMiseryRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const load = useCallback(async (initial: boolean) => {
    try {
      if (initial) setIsLoading(true);
      else setIsRefreshing(true);
      const res = await fetch('/api/aviation/airport-misery', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data: AirportMiseryResponse = await res.json();
      setRows(data.airports ?? []);
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setError(null);
    } catch (err) {
      console.error('[AirportMiseryBoard]', err);
      setError('Unable to load airport misery board.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => compareRows(a, b, sortKey, sortDir));
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'score' ? 'desc' : 'asc');
    }
  };

  const lastUpdated = fetchedAt ? formatTimeAgo(fetchedAt, { now }) : '--';

  return (
    <section
      className={cn('container-primary', className)}
      style={{ backgroundColor: 'var(--bg)' }}
      aria-labelledby="airport-misery-heading"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b border-subtle">
        <h2
          id="airport-misery-heading"
          className="flex items-center gap-2 font-mono text-lg font-bold uppercase tracking-wider"
          style={{ color: 'var(--primary)' }}
        >
          <Plane className="w-5 h-5" aria-hidden="true" />
          Airport Misery Board
        </h2>
        <div className="flex items-center gap-3 font-mono text-xs" style={{ color: 'var(--text)' }}>
          <span className="inline-flex items-center gap-1 opacity-80">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>Updated {lastUpdated}</span>
          </span>
          <button
            type="button"
            onClick={() => load(false)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1 px-2 py-1 border border-border rounded hover:bg-muted/40 disabled:opacity-50 transition-colors"
            aria-label="Refresh airport misery board"
          >
            <RefreshCw
              className={cn('w-3 h-3', isRefreshing && 'animate-spin')}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sub-header: sort controls (mobile-friendly) */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-subtle font-mono text-xs uppercase tracking-wider opacity-80" style={{ color: 'var(--text)' }}>
        <span>Sort:</span>
        <SortHeader
          label="Score"
          active={sortKey === 'score'}
          dir={sortDir}
          onClick={() => toggleSort('score')}
        />
        <SortHeader
          label="Code"
          active={sortKey === 'iata'}
          dir={sortDir}
          onClick={() => toggleSort('iata')}
        />
        <SortHeader
          label="City"
          active={sortKey === 'city'}
          dir={sortDir}
          onClick={() => toggleSort('city')}
        />
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="m-4 p-4 border-4 font-mono text-sm flex items-start gap-2"
          style={{
            color: 'var(--severity-extreme)',
            backgroundColor: 'var(--severity-extreme-bg)',
            borderColor: 'var(--severity-extreme)',
          }}
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold uppercase tracking-wider">Signal lost</div>
            <div className="opacity-90">{error}</div>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full font-mono text-sm" role="table">
          <thead>
            <tr className="text-left" style={{ color: 'var(--text)' }}>
              <th scope="col" className="px-3 py-2 text-xs uppercase tracking-wider opacity-80 w-12">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-xs uppercase tracking-wider opacity-80">
                <SortHeader
                  label="Airport"
                  active={sortKey === 'iata' || sortKey === 'city'}
                  dir={sortDir}
                  onClick={() => toggleSort('iata')}
                />
              </th>
              <th scope="col" className="px-3 py-2 text-xs uppercase tracking-wider opacity-80">
                <SortHeader
                  label="Score"
                  active={sortKey === 'score'}
                  dir={sortDir}
                  onClick={() => toggleSort('score')}
                />
              </th>
              <th scope="col" className="px-3 py-2 text-xs uppercase tracking-wider opacity-80">
                Drivers
              </th>
              <th scope="col" className="px-3 py-2 text-xs uppercase tracking-wider opacity-80">
                Cat
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} idx={i} />)
              : sortedRows.map((row, idx) => (
                  <tr
                    key={row.airport.icao}
                    className={cn(
                      'border-t border-subtle hover:bg-muted/30 transition-colors',
                      row.isStale && 'opacity-70',
                    )}
                  >
                    <td className="px-3 py-3 font-mono text-xs opacity-70 align-top">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col">
                        <span
                          className="font-bold tracking-wider"
                          style={{ color: 'var(--primary)' }}
                        >
                          {row.airport.iata}
                          <span className="ml-1 text-[10px] opacity-60">
                            {row.airport.icao}
                          </span>
                        </span>
                        <span className="text-xs opacity-80" style={{ color: 'var(--text)' }}>
                          {row.airport.city}, {row.airport.state}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <MiseryBadge score={row.score} size="sm" />
                      {row.isStale && (
                        <div className="mt-1 text-[10px] uppercase tracking-wider opacity-60">
                          stale
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top max-w-md">
                      <MiseryDriverList score={row.score} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <FlightCategoryChip category={row.metar?.flightCategory} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden divide-y divide-subtle">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 card-inner">
                <div className="h-4 w-24 bg-muted/40 animate-pulse rounded mb-2" />
                <div className="h-5 w-32 bg-muted/40 animate-pulse rounded mb-2" />
                <div className="h-3 w-full bg-muted/40 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : (
          sortedRows.map((row, idx) => (
            <div
              key={row.airport.icao}
              className={cn('p-4 space-y-2', row.isStale && 'opacity-70')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs opacity-60">#{idx + 1}</div>
                  <div
                    className="font-mono font-bold text-base tracking-wider"
                    style={{ color: 'var(--primary)' }}
                  >
                    {row.airport.iata}
                    <span className="ml-1 text-[10px] opacity-60">{row.airport.icao}</span>
                  </div>
                  <div
                    className="font-mono text-xs opacity-80"
                    style={{ color: 'var(--text)' }}
                  >
                    {row.airport.city}, {row.airport.state}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <MiseryBadge score={row.score} size="sm" />
                  <FlightCategoryChip category={row.metar?.flightCategory} />
                  {row.isStale && (
                    <div className="text-[10px] uppercase tracking-wider opacity-60">
                      stale
                    </div>
                  )}
                </div>
              </div>
              <MiseryDriverList score={row.score} />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 border-t border-subtle font-mono text-[10px] uppercase tracking-wider opacity-60 text-center"
        style={{ color: 'var(--text)' }}
      >
        METAR + SIGMET/AIRMET via NOAA AWC. Misery score is illustrative; not for flight planning.
      </div>
    </section>
  );
}
