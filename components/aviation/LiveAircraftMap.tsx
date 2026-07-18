'use client';

/**
 * MapLibre live ADS-B sky map.
 * Camera is user-controlled (FlightAware-style): polls update markers in place
 * and never auto-recenter except once on explicit search/select or new route OD.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils';
import type { Aircraft } from '@/lib/aviation/aircraft-types';
import {
  AIRCRAFT_LABEL_DECLUTTER_COUNT,
  loadAirplaneIcon,
} from '@/lib/aviation/airplane-icon';
import { sampleGreatCircle } from '@/lib/aviation/route-corridor';

const AIRCRAFT_ICON_ID = 'aircraft-plane';
const AIRCRAFT_LAYER_ID = 'aircraft-icon';
const AIRCRAFT_LABEL_LAYER_ID = 'aircraft-label';

/**
 * Same light Carto Voyager basemap as radar (components/radar-v2/radar-constants.ts).
 * Glyphs still come from OpenFreeMap for callsign / airport labels.
 * CSP: connect-src must allow *.basemaps.cartocdn.com + tiles.openfreemap.org.
 */
const CARTO_VOYAGER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap contributors',
    },
  },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'carto-basemap',
      type: 'raster',
      source: 'carto',
    },
  ],
};

const POLL_MS = 5_000;
const MOVE_FETCH_DEBOUNCE_MS = 400;
const DEFAULT_CENTER: [number, number] = [-98.35, 39.5];
const DEFAULT_ZOOM = 5;

export type RouteMapEndpoints = {
  origin: { lat: number; lon: number; label?: string };
  destination: { lat: number; lon: number; label?: string };
};

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

function routeKey(endpoints: RouteMapEndpoints | null | undefined): string | null {
  if (!endpoints) return null;
  return `${endpoints.origin.lat},${endpoints.origin.lon}->${endpoints.destination.lat},${endpoints.destination.lon}`;
}

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

  // Keep MapLibre click/poll handlers on committed props (avoid render-time ref writes).
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

  const syncSelectionStyle = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(AIRCRAFT_LAYER_ID)) return;
    const sel = selectedRef.current ?? '';
    map.setLayoutProperty(AIRCRAFT_LAYER_ID, 'icon-size', [
      'interpolate',
      ['linear'],
      ['zoom'],
      4,
      ['case', ['==', ['get', 'icao24'], sel], 0.9, 0.6],
      7,
      ['case', ['==', ['get', 'icao24'], sel], 1.25, 0.9],
      10,
      ['case', ['==', ['get', 'icao24'], sel], 1.45, 1.15],
    ]);
  }, []);

  const syncLabelDeclutter = useCallback((count: number) => {
    const map = mapRef.current;
    if (!map || !map.getLayer(AIRCRAFT_LABEL_LAYER_ID)) return;
    const sel = selectedRef.current;
    if (count > AIRCRAFT_LABEL_DECLUTTER_COUNT) {
      // FR24-style: crowded views keep icons only; label the selection.
      map.setFilter(
        AIRCRAFT_LABEL_LAYER_ID,
        sel ? ['==', ['get', 'icao24'], sel] : ['==', ['get', 'icao24'], ''],
      );
    } else {
      map.setFilter(AIRCRAFT_LABEL_LAYER_ID, ['!=', ['get', 'callsign'], '']);
    }
  }, []);

  const applyAircraft = useCallback(
    (list: Aircraft[]) => {
      const map = mapRef.current;
      if (!map) return;
      const byId = new Map<string, Aircraft>();
      for (const a of list) byId.set(a.icao24, a);
      const highlight = highlightRef.current;
      if (highlight) byId.set(highlight.icao24, highlight);
      aircraftByIdRef.current = byId;
      const source = map.getSource('aircraft') as GeoJSONSource | undefined;
      source?.setData(toFeatureCollection([...byId.values()]));
      syncSelectionStyle();
      syncLabelDeclutter(byId.size);

      const selectedId = selectedRef.current;
      if (selectedId && onSelectedUpdateRef.current) {
        const updated = byId.get(selectedId);
        if (updated) onSelectedUpdateRef.current(updated);
      }
    },
    [syncLabelDeclutter, syncSelectionStyle],
  );

  const fetchAircraft = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !visibleRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    const center = map.getCenter();
    const radius = radiusForZoom(map.getZoom());
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
        onDegradedRef.current?.(true, data.source ?? null);
        return;
      }
      setError(null);
      const list = data.aircraft ?? [];
      applyAircraft(list);
      onCountRef.current?.(list.length, {
        source: data.source ?? 'adsb.lol',
        degraded: Boolean(data.degraded),
      });
      onDegradedRef.current?.(Boolean(data.degraded), data.source ?? null);
    } catch (err) {
      console.error('[LiveAircraftMap]', err);
      setError('Live aircraft feed unavailable');
      onDegradedRef.current?.(true, null);
    } finally {
      fetchingRef.current = false;
    }
  }, [applyAircraft]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_VOYAGER_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: false },
        trackUserLocation: false,
      }),
      'top-right',
    );

    let cancelled = false;
    map.on('load', () => {
      void (async () => {
        if (!map.hasImage(AIRCRAFT_ICON_ID)) {
          // 128px @ pixelRatio 2 ⇒ sharp on retina; SVG path is anti-aliased by the browser.
          const icon = await loadAirplaneIcon(128);
          if (cancelled || !mapRef.current) return;
          if (!map.hasImage(AIRCRAFT_ICON_ID)) {
            map.addImage(AIRCRAFT_ICON_ID, icon, { pixelRatio: 2 });
          }
        }
        if (cancelled || !mapRef.current) return;

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
          promoteId: 'icao24',
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': '#0284c7',
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
            'line-color': '#ca8a04',
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
              '#16a34a',
              'destination',
              '#dc2626',
              '#64748b',
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
            'text-color': '#0f172a',
            'text-halo-color': '#f8fafc',
            'text-halo-width': 1.5,
          },
        });
        map.addLayer({
          id: AIRCRAFT_LAYER_ID,
          type: 'symbol',
          source: 'aircraft',
          layout: {
            'icon-image': AIRCRAFT_ICON_ID,
            'icon-rotate': ['coalesce', ['get', 'track'], 0],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            // Collision culling keeps wide zooms readable; zoom in to see denser traffic.
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'icon-padding': 2,
            'icon-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4,
              0.6,
              7,
              0.9,
              10,
              1.15,
            ],
          },
          paint: {
            'icon-opacity': 0.98,
          },
        });
        map.addLayer({
          id: AIRCRAFT_LABEL_LAYER_ID,
          type: 'symbol',
          source: 'aircraft',
          layout: {
            'text-field': ['get', 'callsign'],
            'text-size': 10,
            'text-offset': [0, 1.35],
            'text-optional': true,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          },
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#f8fafc',
            'text-halo-width': 1.25,
          },
          // Labels only when zoomed in; declutter filter applied at runtime.
          minzoom: 8,
          filter: ['==', ['get', 'icao24'], ''],
        });
        setMapReady(true);
      })();
    });

    map.on('click', AIRCRAFT_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      const icao = feature?.properties?.icao24 as string | undefined;
      if (!icao) return;
      const aircraft = aircraftByIdRef.current.get(icao) ?? null;
      onSelectRef.current?.(aircraft);
    });

    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: [AIRCRAFT_LAYER_ID] });
      if (hits.length === 0) onSelectRef.current?.(null);
    });

    map.on('mouseenter', AIRCRAFT_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', AIRCRAFT_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;
    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Stable poll + fetch-on-pan (no camera moves).
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    void fetchAircraft();
    const pollId = window.setInterval(() => {
      void fetchAircraft();
    }, POLL_MS);

    let moveTimer: number | null = null;
    const onMoveEnd = () => {
      if (moveTimer != null) window.clearTimeout(moveTimer);
      moveTimer = window.setTimeout(() => {
        void fetchAircraft();
      }, MOVE_FETCH_DEBOUNCE_MS);
    };
    map.on('moveend', onMoveEnd);

    return () => {
      window.clearInterval(pollId);
      if (moveTimer != null) window.clearTimeout(moveTimer);
      map.off('moveend', onMoveEnd);
    };
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
    syncLabelDeclutter(aircraftByIdRef.current.size);
  }, [selectedIcao24, syncLabelDeclutter, syncSelectionStyle]);

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

  // Keep selected highlight marker without rebuilding the poll loop.
  useEffect(() => {
    if (!mapReady) return;
    applyAircraft([...aircraftByIdRef.current.values()]);
  }, [highlightAircraft?.icao24, mapReady, applyAircraft]);

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

    const bounds = new maplibregl.LngLatBounds();
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
    <div className={cn('relative w-full overflow-hidden rounded-lg border border-border', className)}>
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
