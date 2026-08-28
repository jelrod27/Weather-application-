'use client';

/**
 * MapLibre live ADS-B sky map.
 * Camera is user-controlled (FlightAware-style): polls update markers in place
 * and never auto-recenter except once on explicit search/select or new route OD.
 */

import { useEffect, useRef, useState } from 'react';
import {
  LngLatBounds,
  type Map as MapLibreMap,
  type GeoJSONSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils';
import type { Aircraft } from '@/lib/aviation/aircraft-types';
import {
  airportPointsCollection,
  routeKey,
  routeLineCollection,
  trailLineCollection,
  type RouteMapEndpoints,
} from '@/lib/aviation/live-map-geojson';
import { useLiveAircraftMapInit } from '@/hooks/useLiveAircraftMapInit';
import { useLiveAircraftPoll } from '@/hooks/useLiveAircraftPoll';

export type { RouteMapEndpoints };

export type LiveAircraftMapProps = {
  className?: string;
  selectedIcao24?: string | null;
  onSelectAircraft?: (aircraft: Aircraft | null) => void;
  flyTo?: { lat: number; lon: number; zoom?: number; token?: string } | null;
  onCountChange?: (count: number, meta: { source: string; degraded: boolean }) => void;
  onDegradedChange?: (degraded: boolean, source: string | null) => void;
  /** Soft-update selected aircraft from poll without resetting trail. */
  onSelectedAircraftUpdate?: (aircraft: Aircraft) => void;
  /** External aircraft override (e.g. callsign search result highlight). */
  highlightAircraft?: Aircraft | null;
  /** Planned OD great-circle path for the selected flight. */
  routeEndpoints?: RouteMapEndpoints | null;
  /** Client-collected trail since selection. */
  trail?: Array<{ lat: number; lon: number }>;
};

export default function LiveAircraftMap({
  className,
  selectedIcao24,
  onSelectAircraft,
  flyTo,
  onCountChange,
  onDegradedChange,
  onSelectedAircraftUpdate,
  highlightAircraft,
  routeEndpoints,
  trail,
}: LiveAircraftMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const aircraftByIdRef = useRef<Map<string, Aircraft>>(new Map());
  const selectedRef = useRef<string | null>(null);
  const highlightRef = useRef<Aircraft | null>(null);
  const visibleRef = useRef(true);
  const fetchingRef = useRef(false);
  const lastFlyTokenRef = useRef<string | null>(null);
  const lastFittedRouteRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelectAircraft);
  const onCountRef = useRef(onCountChange);
  const onDegradedRef = useRef(onDegradedChange);
  const onSelectedUpdateRef = useRef(onSelectedAircraftUpdate);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    selectedRef.current = selectedIcao24 ?? null;
    highlightRef.current = highlightAircraft ?? null;
    onSelectRef.current = onSelectAircraft;
    onCountRef.current = onCountChange;
    onDegradedRef.current = onDegradedChange;
    onSelectedUpdateRef.current = onSelectedAircraftUpdate;
  }, [
    selectedIcao24,
    highlightAircraft,
    onSelectAircraft,
    onCountChange,
    onDegradedChange,
    onSelectedAircraftUpdate,
  ]);

  useLiveAircraftMapInit({
    containerRef,
    mapRef,
    aircraftByIdRef,
    onSelectRef,
    setMapReady,
  });

  useLiveAircraftPoll({
    mapRef,
    mapReady,
    aircraftByIdRef,
    selectedRef,
    highlightRef,
    visibleRef,
    fetchingRef,
    onCountRef,
    onDegradedRef,
    onSelectedUpdateRef,
    selectedIcao24,
    highlightIcao24: highlightAircraft?.icao24,
    setError,
  });

  // One-shot camera move on explicit search/select token — never on poll updates.
  useEffect(() => {
    if (!flyTo || !mapRef.current || routeEndpoints) return;
    const token = flyTo.token ?? `${flyTo.lat},${flyTo.lon},${flyTo.zoom ?? 8}`;
    if (lastFlyTokenRef.current === token) return;
    lastFlyTokenRef.current = token;
    mapRef.current.easeTo({
      center: [flyTo.lon, flyTo.lat],
      zoom: flyTo.zoom ?? 8,
      duration: 700,
      essential: true,
    });
  }, [flyTo, routeEndpoints]);

  // Draw route line; fit bounds only when OD pair changes (not on every poll).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const routeSource = map.getSource('route-line') as GeoJSONSource | undefined;
    const airportSource = map.getSource('route-airports') as GeoJSONSource | undefined;
    routeSource?.setData(routeLineCollection(routeEndpoints));
    airportSource?.setData(airportPointsCollection(routeEndpoints));

    const key = routeKey(routeEndpoints);
    if (!key) {
      lastFittedRouteRef.current = null;
      return;
    }
    if (lastFittedRouteRef.current === key) return;
    lastFittedRouteRef.current = key;

    const bounds = new LngLatBounds();
    bounds.extend([routeEndpoints!.origin.lon, routeEndpoints!.origin.lat]);
    bounds.extend([routeEndpoints!.destination.lon, routeEndpoints!.destination.lat]);
    map.fitBounds(bounds, { padding: 72, maxZoom: 7, duration: 700 });
  }, [routeEndpoints, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const trailSource = map.getSource('trail-line') as GeoJSONSource | undefined;
    trailSource?.setData(trailLineCollection(trail));
  }, [trail, mapReady]);

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-lg border border-border', className)}
      role="region"
      aria-label="Live aircraft map"
    >
      <div
        ref={containerRef}
        className="h-[min(70vh,640px)] w-full bg-[#e8e4dc]"
        data-testid="live-aircraft-map"
      />
      {error && (
        <div
          className="absolute bottom-3 left-3 right-3 rounded border border-orange-500/50 bg-black/70 px-3 py-2 font-mono text-xs text-orange-300"
          role="status"
        >
          {error}
        </div>
      )}
    </div>
  );
}
