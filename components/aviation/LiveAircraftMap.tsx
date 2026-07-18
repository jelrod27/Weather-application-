'use client';

/**
 * MapLibre live ADS-B sky map. Polls /api/aviation/aircraft for the map center.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils';
import type { Aircraft } from '@/lib/aviation/aircraft-types';
import { DEFAULT_AIRCRAFT_RADIUS_NM } from '@/lib/aviation/aircraft-types';
import { sampleGreatCircle } from '@/lib/aviation/route-corridor';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const POLL_MS = 3_000;
const DEFAULT_CENTER: [number, number] = [-98.35, 39.5];
const DEFAULT_ZOOM = 4.2;

export type RouteMapEndpoints = {
  origin: { lat: number; lon: number; label?: string };
  destination: { lat: number; lon: number; label?: string };
};

export type LiveAircraftMapProps = {
  className?: string;
  selectedIcao24?: string | null;
  onSelectAircraft?: (aircraft: Aircraft | null) => void;
  flyTo?: { lat: number; lon: number; zoom?: number } | null;
  onCountChange?: (count: number, meta: { source: string; degraded: boolean }) => void;
  onDegradedChange?: (degraded: boolean, source: string | null) => void;
  /** External aircraft override (e.g. callsign search result highlight). */
  highlightAircraft?: Aircraft | null;
  /** Planned OD great-circle path for the selected flight. */
  routeEndpoints?: RouteMapEndpoints | null;
  /** Client-collected trail since selection. */
  trail?: Array<{ lat: number; lon: number }>;
};

function altitudeColor(alt: number | null): string {
  if (alt == null || alt <= 0) return '#94a3b8';
  if (alt < 5000) return '#22c55e';
  if (alt < 15000) return '#eab308';
  if (alt < 30000) return '#f97316';
  return '#ef4444';
}

function toFeatureCollection(aircraft: Aircraft[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: aircraft.map((a) => ({
      type: 'Feature',
      id: a.icao24,
      properties: {
        icao24: a.icao24,
        callsign: a.callsign ?? '',
        track: a.trackDeg ?? 0,
        color: altitudeColor(a.altitudeFt),
        selected: false,
      },
      geometry: {
        type: 'Point',
        coordinates: [a.lon, a.lat],
      },
    })),
  };
}

function radiusForZoom(zoom: number): number {
  if (zoom < 4) return 250;
  if (zoom < 5) return 200;
  if (zoom < 6) return 150;
  if (zoom < 7) return 100;
  if (zoom < 8) return 60;
  return 40;
}

function emptyLineCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function routeLineCollection(endpoints: RouteMapEndpoints | null | undefined): GeoJSON.FeatureCollection {
  if (!endpoints) return emptyLineCollection();
  const samples = sampleGreatCircle(
    { lat: endpoints.origin.lat, lon: endpoints.origin.lon },
    { lat: endpoints.destination.lat, lon: endpoints.destination.lon },
    48,
  );
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'planned' },
        geometry: {
          type: 'LineString',
          coordinates: samples.map((p) => [p.lon, p.lat]),
        },
      },
    ],
  };
}

function airportPointsCollection(
  endpoints: RouteMapEndpoints | null | undefined,
): GeoJSON.FeatureCollection {
  if (!endpoints) return emptyLineCollection();
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { label: endpoints.origin.label ?? 'DEP', role: 'origin' },
        geometry: {
          type: 'Point',
          coordinates: [endpoints.origin.lon, endpoints.origin.lat],
        },
      },
      {
        type: 'Feature',
        properties: { label: endpoints.destination.label ?? 'ARR', role: 'destination' },
        geometry: {
          type: 'Point',
          coordinates: [endpoints.destination.lon, endpoints.destination.lat],
        },
      },
    ],
  };
}

function trailLineCollection(
  trail: Array<{ lat: number; lon: number }> | undefined,
): GeoJSON.FeatureCollection {
  if (!trail || trail.length < 2) return emptyLineCollection();
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'trail' },
        geometry: {
          type: 'LineString',
          coordinates: trail.map((p) => [p.lon, p.lat]),
        },
      },
    ],
  };
}

export default function LiveAircraftMap({
  className,
  selectedIcao24,
  onSelectAircraft,
  flyTo,
  onCountChange,
  onDegradedChange,
  highlightAircraft,
  routeEndpoints,
  trail,
}: LiveAircraftMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const aircraftByIdRef = useRef<Map<string, Aircraft>>(new Map());
  const selectedRef = useRef<string | null>(null);
  const visibleRef = useRef(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  selectedRef.current = selectedIcao24 ?? null;

  const syncSelectionStyle = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('aircraft-circle')) return;
    const sel = selectedRef.current;
    map.setPaintProperty('aircraft-circle', 'circle-stroke-width', [
      'case',
      ['==', ['get', 'icao24'], sel ?? ''],
      3,
      1,
    ]);
  }, []);

  const applyAircraft = useCallback(
    (list: Aircraft[]) => {
      const map = mapRef.current;
      if (!map) return;
      const byId = new Map<string, Aircraft>();
      for (const a of list) byId.set(a.icao24, a);
      if (highlightAircraft) byId.set(highlightAircraft.icao24, highlightAircraft);
      aircraftByIdRef.current = byId;
      const source = map.getSource('aircraft') as GeoJSONSource | undefined;
      source?.setData(toFeatureCollection([...byId.values()]));
      syncSelectionStyle();
    },
    [highlightAircraft, syncSelectionStyle],
  );

  const fetchAircraft = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !visibleRef.current) return;
    const center = map.getCenter();
    const radius = radiusForZoom(map.getZoom()) || DEFAULT_AIRCRAFT_RADIUS_NM;
    try {
      const params = new URLSearchParams({
        lat: String(center.lat),
        lon: String(center.lng),
        radius: String(radius),
      });
      const res = await fetch(`/api/aviation/aircraft?${params}`);
      const data = (await res.json()) as {
        aircraft?: Aircraft[];
        source?: string;
        degraded?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Live aircraft feed unavailable');
        onDegradedChange?.(true, data.source ?? null);
        return;
      }
      setError(null);
      const list = data.aircraft ?? [];
      applyAircraft(list);
      onCountChange?.(list.length, {
        source: data.source ?? 'adsb.lol',
        degraded: Boolean(data.degraded),
      });
      onDegradedChange?.(Boolean(data.degraded), data.source ?? null);
    } catch (err) {
      console.error('[LiveAircraftMap]', err);
      setError('Live aircraft feed unavailable');
      onDegradedChange?.(true, null);
    }
  }, [applyAircraft, onCountChange, onDegradedChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: false },
        trackUserLocation: false,
      }),
      'top-right',
    );

    map.on('load', () => {
      map.addSource('route-line', {
        type: 'geojson',
        data: emptyLineCollection(),
      });
      map.addSource('route-airports', {
        type: 'geojson',
        data: emptyLineCollection(),
      });
      map.addSource('trail-line', {
        type: 'geojson',
        data: emptyLineCollection(),
      });
      map.addSource('aircraft', {
        type: 'geojson',
        data: toFeatureCollection([]),
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-line',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3,
          'line-opacity': 0.85,
          'line-dasharray': [2, 1],
        },
      });
      map.addLayer({
        id: 'trail-line',
        type: 'line',
        source: 'trail-line',
        paint: {
          'line-color': '#fbbf24',
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
      map.addLayer({
        id: 'route-airports',
        type: 'circle',
        source: 'route-airports',
        paint: {
          'circle-radius': 7,
          'circle-color': [
            'match',
            ['get', 'role'],
            'origin',
            '#22c55e',
            'destination',
            '#ef4444',
            '#94a3b8',
          ],
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'route-airport-labels',
        type: 'symbol',
        source: 'route-airports',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.4],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.5,
        },
      });
      map.addLayer({
        id: 'aircraft-circle',
        type: 'circle',
        source: 'aircraft',
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 1,
          'circle-opacity': 0.9,
        },
      });
      map.addLayer({
        id: 'aircraft-label',
        type: 'symbol',
        source: 'aircraft',
        layout: {
          'text-field': ['get', 'callsign'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-optional': true,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1,
        },
        minzoom: 6,
      });
      setMapReady(true);
    });

    map.on('click', 'aircraft-circle', (e) => {
      const feature = e.features?.[0];
      const icao = feature?.properties?.icao24 as string | undefined;
      if (!icao) return;
      const aircraft = aircraftByIdRef.current.get(icao) ?? null;
      onSelectAircraft?.(aircraft);
    });

    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ['aircraft-circle'] });
      if (hits.length === 0) onSelectAircraft?.(null);
    });

    map.on('mouseenter', 'aircraft-circle', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'aircraft-circle', () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onSelectAircraft]);

  useEffect(() => {
    if (!mapReady) return;
    void fetchAircraft();
    const id = window.setInterval(() => {
      void fetchAircraft();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [mapReady, fetchAircraft]);

  useEffect(() => {
    const onVis = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current) void fetchAircraft();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchAircraft]);

  useEffect(() => {
    syncSelectionStyle();
  }, [selectedIcao24, syncSelectionStyle]);

  useEffect(() => {
    if (!flyTo || !mapRef.current || routeEndpoints) return;
    mapRef.current.flyTo({
      center: [flyTo.lon, flyTo.lat],
      zoom: flyTo.zoom ?? 8,
      essential: true,
    });
  }, [flyTo, routeEndpoints]);

  useEffect(() => {
    if (highlightAircraft) applyAircraft([...aircraftByIdRef.current.values()]);
  }, [highlightAircraft, applyAircraft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const routeSource = map.getSource('route-line') as GeoJSONSource | undefined;
    const airportSource = map.getSource('route-airports') as GeoJSONSource | undefined;
    routeSource?.setData(routeLineCollection(routeEndpoints));
    airportSource?.setData(airportPointsCollection(routeEndpoints));

    if (routeEndpoints) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([routeEndpoints.origin.lon, routeEndpoints.origin.lat]);
      bounds.extend([routeEndpoints.destination.lon, routeEndpoints.destination.lat]);
      if (highlightAircraft) {
        bounds.extend([highlightAircraft.lon, highlightAircraft.lat]);
      }
      map.fitBounds(bounds, { padding: 72, maxZoom: 7, duration: 900 });
    }
  }, [routeEndpoints, mapReady, highlightAircraft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const trailSource = map.getSource('trail-line') as GeoJSONSource | undefined;
    trailSource?.setData(trailLineCollection(trail));
  }, [trail, mapReady]);

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg border border-border', className)}>
      <div ref={containerRef} className="h-[min(70vh,640px)] w-full bg-slate-900" data-testid="live-aircraft-map" />
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
