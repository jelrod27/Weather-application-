/**
 * 16-Bit Weather Platform - Aviation Page
 *
 * FlightAware-style live sky map (ADS-B) + weather brief + demoted explorers.
 */

'use client';

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import PageWrapper from '@/components/page-wrapper';
import type { AviationAlert } from '@/components/aviation';
import { ShareButtons } from '@/components/share-buttons';
import AirportMiseryBoard from '@/components/aviation/AirportMiseryBoard';
import AircraftSearch from '@/components/aviation/AircraftSearch';
import AircraftSelectionPanel from '@/components/aviation/AircraftSelectionPanel';
import type { RouteInfo } from '@/components/aviation/AircraftSelectionPanel';
import FlightWeatherBrief from '@/components/aviation/FlightWeatherBrief';
import type { Aircraft } from '@/lib/aviation/aircraft-types';
import type { RouteMapEndpoints } from '@/components/aviation/LiveAircraftMap';

const FlightConditionsTerminal = lazy(
  () => import('@/components/aviation/FlightConditionsTerminal'),
);

const LiveAircraftMap = dynamic(() => import('@/components/aviation/LiveAircraftMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-lg border border-border bg-slate-900 font-mono text-sm text-slate-300">
      Loading live sky map…
    </div>
  ),
});

type TrailPoint = { lat: number; lon: number; at: number };

function AviationPageInner() {
  const themeClasses = themeTokens.weather;
  const searchParams = useSearchParams();
  const flightParam = searchParams.get('flight')?.trim().toUpperCase() ?? '';

  const [alerts, setAlerts] = useState<AviationAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertsFetchedAt, setAlertsFetchedAt] = useState<number | null>(null);

  const [selected, setSelected] = useState<Aircraft | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [flyTo, setFlyTo] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
    token?: string;
  } | null>(null);
  const [count, setCount] = useState(0);
  const [sourceLabel, setSourceLabel] = useState('adsb.lol');
  const [degraded, setDegraded] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteInfo>({
    origin: null,
    destination: null,
  });
  const [explorerOpen, setExplorerOpen] = useState(false);

  const routeEndpoints = useMemo<RouteMapEndpoints | null>(() => {
    const o = route.originAirport;
    const d = route.destinationAirport;
    if (
      !o
      || !d
      || o.lat == null
      || o.lon == null
      || d.lat == null
      || d.lon == null
    ) {
      return null;
    }
    return {
      origin: {
        lat: o.lat,
        lon: o.lon,
        label: o.iata ?? o.icao,
      },
      destination: {
        lat: d.lat,
        lon: d.lon,
        label: d.iata ?? d.icao,
      },
    };
  }, [route]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/aviation/alerts');
        if (!response.ok) throw new Error('Failed to fetch aviation alerts');
        const data = await response.json();
        setAlerts(data.alerts || []);
        setAlertsFetchedAt(Date.now());
        setError(null);
      } catch (err) {
        console.error('[AviationPage] Error fetching aviation alerts:', err);
        setError('Unable to load aviation alerts. Please try again later.');
        setAlerts([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const selectAircraft = useCallback((aircraft: Aircraft | null) => {
    setSelected(aircraft);
    setRoute({ origin: null, destination: null });
    if (!aircraft) {
      setTrail([]);
      return;
    }
    setTrail([{ lat: aircraft.lat, lon: aircraft.lon, at: Date.now() }]);
    // Token is icao-only so poll position updates never re-trigger camera moves.
    setFlyTo({
      lat: aircraft.lat,
      lon: aircraft.lon,
      zoom: 8,
      token: `select:${aircraft.icao24}`,
    });
  }, []);

  const updateSelectedAircraft = useCallback((aircraft: Aircraft) => {
    setSelected((prev) => {
      if (!prev || prev.icao24 !== aircraft.icao24) return prev;
      // Avoid parent re-renders (and map effect churn) when position is unchanged.
      if (
        prev.lat === aircraft.lat
        && prev.lon === aircraft.lon
        && prev.altitudeFt === aircraft.altitudeFt
        && prev.groundSpeedKt === aircraft.groundSpeedKt
        && prev.trackDeg === aircraft.trackDeg
        && prev.callsign === aircraft.callsign
      ) {
        return prev;
      }
      return aircraft;
    });
    setTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.lat - aircraft.lat) < 1e-5 && Math.abs(last.lon - aircraft.lon) < 1e-5) {
        return prev;
      }
      return [...prev.slice(-200), { lat: aircraft.lat, lon: aircraft.lon, at: Date.now() }];
    });
  }, []);

  useEffect(() => {
    if (!flightParam) return;
    let cancelled = false;
    void fetch(`/api/aviation/aircraft/callsign?q=${encodeURIComponent(flightParam)}`)
      .then((r) => r.json())
      .then((data: { aircraft?: Aircraft[] }) => {
        if (cancelled) return;
        const hit = data.aircraft?.[0];
        if (hit) selectAircraft(hit);
        else setSearchError(`No live aircraft found for ${flightParam}`);
      })
      .catch(() => {
        if (!cancelled) setSearchError(`Lookup failed for ${flightParam}`);
      });
    return () => {
      cancelled = true;
    };
  }, [flightParam, selectAircraft]);

  const statusChip = useMemo(() => {
    if (degraded) return `DEGRADED · ${sourceLabel} · ${count} ac`;
    return `${sourceLabel} · ${count} aircraft in view`;
  }, [count, degraded, sourceLabel]);

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8', themeClasses.background)}>
        <div className="mb-6">
          <h1
            className={cn(
              'mb-3 font-mono text-4xl font-extrabold sm:text-5xl md:text-6xl',
              themeClasses.accentText,
              themeClasses.glow,
            )}
          >
            LIVE FLIGHT TRACKER
          </h1>
          <p className={cn('max-w-3xl font-mono text-base sm:text-lg', themeClasses.text)}>
            ADS-B live sky map, callsign search, and NOAA weather briefs for the selected route.
            Educational only — not for operational flight planning or dispatch.
          </p>
          <ShareButtons
            config={{
              title: 'Aviation Live Tracker',
              text: 'Live ADS-B aircraft + aviation weather briefs at 16bitweather.co/aviation',
              url: 'https://www.16bitweather.co/aviation',
            }}
            className="mt-3"
          />
          <Link
            href="/travel"
            className={cn(
              'mt-4 inline-flex items-center gap-2 rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors',
              'border-border bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground',
            )}
          >
            Driving instead? Open Travel Hub →
          </Link>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <AircraftSearch
            initialQuery={flightParam}
            className="w-full max-w-xl"
            onFound={(a) => {
              setSearchError(null);
              selectAircraft(a);
            }}
            onError={setSearchError}
          />
          <div
            className={cn(
              'rounded border px-3 py-2 font-mono text-xs',
              degraded
                ? 'border-orange-500/50 bg-orange-500/10 text-orange-200'
                : 'border-border bg-card/50 text-muted-foreground',
            )}
            data-testid="aircraft-count-chip"
          >
            {statusChip}
          </div>
        </div>

        {searchError && (
          <div className="mb-3 rounded border border-orange-500/40 bg-orange-500/10 px-3 py-2 font-mono text-xs text-orange-200">
            {searchError}
          </div>
        )}

        {error && (
          <div
            className="mb-4 border-4 p-4 font-mono text-sm"
            style={{
              color: 'var(--severity-extreme)',
              backgroundColor: 'var(--severity-extreme-bg)',
              borderColor: 'var(--severity-extreme)',
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <LiveAircraftMap
            selectedIcao24={selected?.icao24 ?? null}
            highlightAircraft={selected}
            flyTo={flyTo}
            routeEndpoints={routeEndpoints}
            trail={trail.map(({ lat, lon }) => ({ lat, lon }))}
            onSelectAircraft={selectAircraft}
            onSelectedAircraftUpdate={updateSelectedAircraft}
            onCountChange={(n, meta) => {
              setCount(n);
              setSourceLabel(meta.source);
              setDegraded(meta.degraded);
            }}
            onDegradedChange={(d, source) => {
              setDegraded(d);
              if (source) setSourceLabel(source);
            }}
          />
          <div className="space-y-4">
            {selected ? (
              <AircraftSelectionPanel
                aircraft={selected}
                trail={trail}
                onClose={() => selectAircraft(null)}
                onRouteResolved={setRoute}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 font-mono text-xs text-muted-foreground">
                Click an aircraft on the map or search a callsign to inspect identity, route, and
                weather.
              </div>
            )}
            <FlightWeatherBrief origin={route.origin} destination={route.destination} />
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <div>
            <h2
              className={cn(
                'mb-3 font-mono text-sm font-bold uppercase tracking-[0.2em]',
                themeClasses.accentText,
              )}
            >
              Hub Conditions
            </h2>
            <AirportMiseryBoard />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setExplorerOpen((v) => !v)}
              className={cn(
                'mb-3 inline-flex items-center gap-2 rounded border border-border px-3 py-2 font-mono text-xs uppercase tracking-wider',
                'bg-card/40 hover:bg-card/70',
              )}
              aria-expanded={explorerOpen}
            >
              {explorerOpen ? 'Hide' : 'Show'} detail console (SIGMETs · turbulence · METARs)
            </button>
            {explorerOpen && (
              <Suspense
                fallback={
                  <div className={cn('p-8 text-center font-mono', themeClasses.background)}>
                    <div className="animate-pulse">Loading aviation terminal...</div>
                  </div>
                }
              >
                <FlightConditionsTerminal
                  alerts={alerts}
                  isLoading={isLoading}
                  alertsFetchedAt={alertsFetchedAt}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function AviationPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper>
          <div className="container mx-auto px-4 py-8 font-mono text-sm text-muted-foreground">
            Loading aviation…
          </div>
        </PageWrapper>
      }
    >
      <AviationPageInner />
    </Suspense>
  );
}
