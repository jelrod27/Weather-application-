'use client';

/**
 * 16-Bit Weather Platform - Earth Sciences Client
 *
 * Client leaf for /earth-sciences. Fetches the server-proxied USGS feed,
 * renders a magnitude-filtered, sortable earthquake list with loading,
 * error, and empty states. No direct USGS calls from the browser.
 *
 * TODO(v2): add an OpenLayers map of epicenters. Skipped for v1 because
 * the existing map modules are not trivially reusable outside their
 * current contexts.
 */

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format-time-ago';
import type { EarthquakesApiResponse } from '@/app/api/earth-sciences/earthquakes/route';
import QuakeHeroCard from './quake-hero-card';
import { safeExternalUrl } from '@/lib/safe-url';

// The world map embeds ~70KB of SVG path data for Natural Earth continents.
// Lazy-load it so the paths live in their own chunk and aren't pulled into
// the page's initial bundle (which Next.js prefetches from nav links on
// other routes like the homepage, inflating Lighthouse's transfer cost).
const QuakeWorldMap = dynamic(() => import('./quake-world-map'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="h-64 w-full animate-pulse rounded-md border border-border bg-black/30"
    />
  ),
});

type MagFilter = '2.5' | '4.5' | '6';
type SortKey = 'time' | 'magnitude';

export interface ClientEarthquake {
  id: string;
  magnitude: number;
  location: string;
  time: string; // ISO string from the API
  depth: number;
  url: string;
  latitude: number;
  longitude: number;
  tsunami: boolean;
}

// USGS's minmagnitude=0 is a firehose, so M2.5 is the effective floor served
// by the API route. The UI exposes that as the lowest tier rather than a
// misleading "ALL".
const FILTER_TABS: Array<{ key: MagFilter; label: string; minMag: number }> = [
  { key: '2.5', label: 'M2.5+', minMag: 2.5 },
  { key: '4.5', label: 'M4.5+', minMag: 4.5 },
  { key: '6', label: 'M6+', minMag: 6 },
];

function magnitudeBadgeClass(mag: number): string {
  if (mag >= 6) return 'bg-red-500/20 text-red-400 border-red-500/50';
  if (mag >= 4.5) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
  if (mag >= 2.5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
  return 'bg-muted text-muted-foreground border-border';
}

export default function EarthSciencesClient() {
  const [filter, setFilter] = useState<MagFilter>('2.5');
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [earthquakes, setEarthquakes] = useState<ClientEarthquake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeMinMag = useMemo(
    () => FILTER_TABS.find((t) => t.key === filter)?.minMag ?? 0,
    [filter],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/earth-sciences/earthquakes?minMagnitude=${activeMinMag}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: EarthquakesApiResponse = await res.json();
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setEarthquakes([]);
          return;
        }
        setEarthquakes(data.earthquakes);
      } catch (e) {
        if ((e as Error).name === 'AbortError' || cancelled) return;
        console.error('[EarthSciences]', e);
        setError('Failed to load earthquake data');
        setEarthquakes([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    // Honor the "refreshed every 5 minutes" promise in the UI copy.
    const intervalId = setInterval(load, 5 * 60_000);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [activeMinMag]);

  const visibleQuakes = useMemo(() => {
    const filtered = earthquakes.filter((q) => q.magnitude >= activeMinMag);
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'magnitude') return b.magnitude - a.magnitude;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
    return sorted;
  }, [earthquakes, activeMinMag, sortKey]);

  // Hero / map read from the visible set so they track filter changes.
  const topQuake = useMemo(() => {
    if (!visibleQuakes.length) return null;
    return visibleQuakes.reduce((a, b) => (a.magnitude >= b.magnitude ? a : b));
  }, [visibleQuakes]);

  return (
    <section className="space-y-6" aria-labelledby="earthquakes-heading">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2
            id="earthquakes-heading"
            className="text-xl font-bold font-mono tracking-wider uppercase"
          >
            Recent Earthquakes
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Source: USGS FDSN event feed — last 7 days, refreshed every 5 minutes.
          </p>
        </div>

        {/* Sort toggle */}
        <div
          role="radiogroup"
          aria-label="Sort earthquakes"
          className="inline-flex rounded-md border border-border overflow-hidden font-mono text-xs"
        >
          {(['time', 'magnitude'] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={sortKey === k}
              onClick={() => setSortKey(k)}
              className={cn(
                'px-3 py-1.5 uppercase tracking-wider transition-colors',
                sortKey === k
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Sort: {k}
            </button>
          ))}
        </div>
      </div>

      {/* Hero card — features the biggest quake when it's M4.5+ */}
      {topQuake && <QuakeHeroCard quake={topQuake} />}

      {/* World map — quake dots on a graticule */}
      {visibleQuakes.length > 0 && <QuakeWorldMap quakes={visibleQuakes} />}

      {/* Magnitude filter tabs */}
      <div
        role="radiogroup"
        aria-label="Magnitude filter"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md border font-mono text-xs uppercase tracking-wider transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          aria-busy="true"
          aria-live="polite"
          className="space-y-2"
          data-testid="earthquakes-loading"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-md border border-border bg-card/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div
          role="alert"
          className="border border-red-500/50 bg-red-500/10 rounded-md p-4 text-center font-mono text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && visibleQuakes.length === 0 && (
        <div
          data-testid="earthquakes-empty"
          className="text-center py-12 border border-border rounded-lg bg-card/30"
        >
          <p className="text-lg font-mono text-green-400 font-bold">NO RECENT QUAKES</p>
          <p className="text-sm font-mono text-muted-foreground mt-2">
            No earthquakes match this magnitude filter in the last 7 days.
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && visibleQuakes.length > 0 && (
        <div className="overflow-x-auto border border-border rounded-lg bg-card/30">
          <table className="w-full text-sm font-mono">
            <thead className="border-b border-border bg-card/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-2 w-24">Magnitude</th>
                <th scope="col" className="px-4 py-2 w-24">Depth</th>
                <th scope="col" className="px-4 py-2">Location</th>
                <th scope="col" className="px-4 py-2 w-36 text-right">When</th>
              </tr>
            </thead>
            <tbody data-testid="earthquakes-tbody">
              {visibleQuakes.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-card/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs font-bold',
                        magnitudeBadgeClass(q.magnitude),
                      )}
                    >
                      M{q.magnitude.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {q.depth} km
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const safe = safeExternalUrl(q.url);
                      return safe ? (
                        <a
                          href={safe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {q.location}
                        </a>
                      ) : (
                        <span className="text-foreground">{q.location}</span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatTimeAgo(q.time, { style: 'long' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs font-mono text-muted-foreground">
        Click any location to open the full USGS event page. Magnitudes use the
        moment magnitude scale (Mw) where available.
      </p>
    </section>
  );
}
