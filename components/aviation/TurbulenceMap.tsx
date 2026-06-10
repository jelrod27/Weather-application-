/**
 * 16-Bit Weather Platform - Turbulence Map Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * OpenLayers-based map showing real PIREP turbulence reports (point markers)
 * overlaid with NOAA AWC G-AIRMET turbulence forecasts (polygons).
 *
 * Data wiring lives in `useTurbulenceData`; controls + legend are split
 * into sibling components. This file owns OL initialization, layer
 * lifecycle, and the PIREP detail popup.
 */

'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format-time-ago';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import { Plane, AlertTriangle, Clock, Mountain, X } from 'lucide-react';
import {
  useTurbulenceData,
  type PIREPData,
} from '@/hooks/useTurbulenceData';
import type { TurbulencePolygon, TurbulenceSeverity } from '@/app/api/aviation/turbulence/route';
import TurbulenceLegend from './turbulence/TurbulenceLegend';
import TurbulenceControls, { type AltitudeFilter } from './turbulence/TurbulenceControls';

// OpenLayers imports
import 'ol/ol.css';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import Overlay from 'ol/Overlay';

interface TurbulenceMapProps {
  initialAltitude?: AltitudeFilter;
  initialHours?: number;
}

// Severity hex values must match --severity-* CSS tokens (canvas can't read CSS vars).
const SEVERITY_HEX: Record<TurbulenceSeverity, string> = {
  smooth: '#22c55e',
  light: '#22c55e',
  moderate: '#eab308',
  severe: '#f97316',
  extreme: '#ef4444',
};

const TURBULENCE_COLORS: Record<string, string> = {
  NEG: SEVERITY_HEX.light,
  'NEG-LGT': SEVERITY_HEX.light,
  LGT: SEVERITY_HEX.light,
  'LGT-MOD': SEVERITY_HEX.moderate,
  MOD: SEVERITY_HEX.moderate,
  'MOD-SEV': SEVERITY_HEX.severe,
  SEV: SEVERITY_HEX.severe,
  'SEV-EXTRM': SEVERITY_HEX.extreme,
  EXTRM: SEVERITY_HEX.extreme,
};

function getPirepSeverity(intensity: string | null): TurbulenceSeverity {
  if (!intensity) return 'smooth';
  const upper = intensity.toUpperCase();
  if (upper === 'NEG' || upper === 'SMOOTH') return 'smooth';
  if (upper.includes('EXTRM') || upper.includes('EXTREME')) return 'extreme';
  if (upper.includes('SEV') && !upper.includes('EXTRM')) return 'severe';
  if (upper.includes('MOD') && !upper.includes('SEV')) return 'moderate';
  if (upper.includes('LGT') && !upper.includes('MOD')) return 'light';
  return 'light';
}

function getPirepColor(intensity: string | null): string {
  if (!intensity) return TURBULENCE_COLORS.NEG;
  const upper = intensity.toUpperCase();
  if (TURBULENCE_COLORS[upper]) return TURBULENCE_COLORS[upper];
  return SEVERITY_HEX[getPirepSeverity(intensity)];
}

const CARTO_DARK_URL = 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
const CONUS_CENTER = [-98.5795, 39.8283];
const CONUS_ZOOM = 4;

function formatAltitude(ft: number): string {
  if (ft >= 18000) return `FL${Math.round(ft / 100)}`;
  return `${ft.toLocaleString()} ft`;
}

export default function TurbulenceMap({
  initialAltitude = 'all',
  initialHours = 2,
}: TurbulenceMapProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const pirepLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const polygonLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);

  const [selectedPirep, setSelectedPirep] = useState<PIREPData | null>(null);
  const [hoursBack, setHoursBack] = useState(initialHours);
  const [altitudeFilter, setAltitudeFilter] = useState<AltitudeFilter>(initialAltitude);

  const {
    pireps,
    polygons,
    fetchedAt,
    isLoading,
    error,
    refresh,
    currentTime,
  } = useTurbulenceData();

  // Filter PIREPs by age + altitude
  const filteredPireps = useMemo(() => {
    const cutoff = currentTime - hoursBack * 60 * 60 * 1000;
    return pireps.filter((pirep) => {
      if (!pirep.observationTime) return false;
      const obs = new Date(pirep.observationTime).getTime();
      if (!Number.isFinite(obs) || obs < cutoff) return false;

      const alt = pirep.altitudeFt || 0;
      switch (altitudeFilter) {
        case 'low':
          return alt < 18000;
        case 'mid':
          return alt >= 18000 && alt <= 35000;
        case 'high':
          return alt > 35000;
        default:
          return true;
      }
    });
  }, [pireps, hoursBack, altitudeFilter, currentTime]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: CARTO_DARK_URL,
        attributions: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        crossOrigin: 'anonymous',
      }),
      opacity: 0.9,
    });

    const map = new OLMap({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat(CONUS_CENTER),
        zoom: CONUS_ZOOM,
      }),
    });
    mapInstanceRef.current = map;

    if (popupRef.current) {
      const overlay = new Overlay({
        element: popupRef.current,
        autoPan: { animation: { duration: 250 } },
        positioning: 'bottom-center',
        offset: [0, -10],
      });
      map.addOverlay(overlay);
      popupOverlayRef.current = overlay;
    }

    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => {
        const pirep = f.get('pirep') as PIREPData | undefined;
        return pirep ? f : undefined;
      });
      if (feature) {
        const pirep = feature.get('pirep') as PIREPData;
        setSelectedPirep(pirep);
        popupOverlayRef.current?.setPosition(evt.coordinate);
      } else {
        setSelectedPirep(null);
        popupOverlayRef.current?.setPosition(undefined);
      }
    });

    map.on('pointermove', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, (f) =>
        f.get('pirep') ? true : undefined,
      );
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    const updateMapSize = () => mapInstanceRef.current?.updateSize();
    setTimeout(updateMapSize, 0);
    setTimeout(updateMapSize, 100);
    setTimeout(updateMapSize, 500);

    const resizeObserver = new ResizeObserver(updateMapSize);
    if (mapRef.current) resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
      map.setTarget(undefined);
      map.dispose();
      mapInstanceRef.current = null;
    };
  }, []);

  // Close popup if its PIREP is filtered out
  useEffect(() => {
    if (selectedPirep && !filteredPireps.some((p) => p.id === selectedPirep.id)) {
      setSelectedPirep(null);
      popupOverlayRef.current?.setPosition(undefined);
    }
  }, [filteredPireps, selectedPirep]);

  // PIREP point layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pirepLayerRef.current) {
      map.removeLayer(pirepLayerRef.current);
    }

    const features = filteredPireps.map((pirep) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([pirep.longitude, pirep.latitude])),
        pirep,
      });
      const color = getPirepColor(pirep.turbulenceIntensity);
      const severity = getPirepSeverity(pirep.turbulenceIntensity);
      const size =
        severity === 'smooth' ? 6 : severity === 'light' ? 8 : severity === 'moderate' ? 10 : severity === 'severe' ? 12 : 14;

      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: size,
            fill: new Fill({ color: color + 'cc' }),
            stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
          }),
        }),
      );
      return feature;
    });

    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      zIndex: 100,
    });
    map.addLayer(layer);
    pirepLayerRef.current = layer;
  }, [filteredPireps]);

  // G-AIRMET polygon layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
    }

    if (polygons.length === 0) {
      polygonLayerRef.current = null;
      return;
    }

    const features: Feature[] = [];
    for (const poly of polygons) {
      // Show only the most relevant near-term forecast (≤6 hr) to avoid stacking.
      if (poly.forecastHour > 6) continue;
      const rings = poly.coordinates
        .map((ring) => ring.map(([lon, lat]) => fromLonLat([lon, lat])));
      if (rings.length === 0 || rings[0].length < 3) continue;

      const feature = new Feature({
        geometry: new Polygon(rings),
        gairmet: poly,
      });
      const color = SEVERITY_HEX[poly.severity];
      feature.setStyle(
        new Style({
          fill: new Fill({ color: color + '33' }), // ~20% alpha
          stroke: new Stroke({ color, width: 1.5 }),
        }),
      );
      features.push(feature);
    }

    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      zIndex: 50, // below PIREPs
    });
    map.addLayer(layer);
    polygonLayerRef.current = layer;
  }, [polygons]);

  const closePopup = useCallback(() => {
    setSelectedPirep(null);
    popupOverlayRef.current?.setPosition(undefined);
  }, []);

  return (
    <div className={cn('space-y-3', themeClasses.background)}>
      <TurbulenceControls
        hoursBack={hoursBack}
        altitudeFilter={altitudeFilter}
        pirepCount={filteredPireps.length}
        isLoading={isLoading}
        onHoursChange={setHoursBack}
        onAltitudeChange={setAltitudeFilter}
        onRefresh={refresh}
      />

      <div
        className={cn(
          'relative border-4 rounded-lg overflow-hidden bg-card h-[300px] sm:h-[400px] md:h-[480px]',
          themeClasses.borderColor,
        )}
        role="region"
        aria-label="Turbulence pilot reports map for the contiguous United States"
      >
        {isLoading && !pireps.length ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-card z-10"
            role="status"
            aria-live="polite"
          >
            <div className="text-center">
              <Plane className={cn('w-8 h-8 mx-auto mb-2 animate-bounce', themeClasses.accentText)} aria-hidden="true" />
              <div className={cn('text-xs font-mono', themeClasses.text)}>
                Loading turbulence data...
              </div>
            </div>
          </div>
        ) : error && !pireps.length ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-card z-10"
            role="alert"
          >
            <div className="text-center" style={{ color: 'var(--severity-extreme)' }}>
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
              <div className="text-xs font-mono">{error}</div>
            </div>
          </div>
        ) : null}

        <div ref={mapRef} className="w-full h-full" />

        <div ref={popupRef} className="absolute z-50">
          {selectedPirep && (
            <div
              className={cn(
                'bg-card/95 border-2 rounded-lg p-3 min-w-[260px] max-w-[90vw] sm:max-w-[350px] shadow-xl backdrop-blur-sm',
                themeClasses.borderColor,
              )}
              role="dialog"
              aria-label={`PIREP details for ${selectedPirep.aircraftRef || 'unknown aircraft'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Plane className={cn('w-4 h-4', themeClasses.accentText)} aria-hidden="true" />
                  <span className={cn('font-mono text-sm font-bold', themeClasses.text)}>
                    {selectedPirep.aircraftRef || 'Unknown Aircraft'}
                  </span>
                </div>
                <button
                  onClick={closePopup}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  aria-label="Close PIREP details"
                >
                  <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>

              <div className={cn('space-y-1 text-xs font-mono', themeClasses.text)}>
                {selectedPirep.turbulenceIntensity && (
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getPirepColor(selectedPirep.turbulenceIntensity) }}
                      aria-hidden="true"
                    />
                    <span className="font-bold">Turbulence:</span>
                    <span>{selectedPirep.turbulenceIntensity}</span>
                    {selectedPirep.turbulenceType && (
                      <span className="opacity-60">({selectedPirep.turbulenceType})</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Mountain className="w-3 h-3" aria-hidden="true" />
                  <span className="font-bold">Altitude:</span>
                  <span>{formatAltitude(selectedPirep.altitudeFt)}</span>
                  {selectedPirep.turbulenceBaseFt !== null && selectedPirep.turbulenceTopFt !== null && (
                    <span className="opacity-60">
                      (TB: {formatAltitude(selectedPirep.turbulenceBaseFt)} - {formatAltitude(selectedPirep.turbulenceTopFt)})
                    </span>
                  )}
                </div>

                {selectedPirep.icingIntensity && (
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">❄</span>
                    <span className="font-bold">Icing:</span>
                    <span>{selectedPirep.icingIntensity}</span>
                    {selectedPirep.icingType && (
                      <span className="opacity-60">({selectedPirep.icingType})</span>
                    )}
                  </div>
                )}

                {selectedPirep.tempC !== null && (
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">🌡</span>
                    <span className="font-bold">Temp:</span>
                    <span>{selectedPirep.tempC}°C</span>
                  </div>
                )}

                {selectedPirep.windDir !== null && selectedPirep.windSpeedKt !== null && (
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">💨</span>
                    <span className="font-bold">Wind:</span>
                    <span>{selectedPirep.windDir}° / {selectedPirep.windSpeedKt} kt</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span className="font-bold">Observed:</span>
                  <span>{formatTimeAgo(selectedPirep.observationTime)}</span>
                </div>

                {selectedPirep.rawText && (
                  <div className="pt-1 border-t border-border">
                    <div className="opacity-60 text-[10px] break-all">
                      {selectedPirep.rawText.slice(0, 150)}
                      {selectedPirep.rawText.length > 150 && '...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-2 left-2 bg-card/80 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground z-20">
          PIREPs + G-AIRMET: NOAA AWC
        </div>
      </div>

      <TurbulenceLegend />

      <div className={cn('flex flex-wrap items-center gap-2 text-xs font-mono opacity-60', themeClasses.text)}>
        <Clock className="w-3 h-3" aria-hidden="true" />
        <span>
          PIREPs updated: {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : 'Loading...'}
        </span>
        <span className="mx-2 hidden sm:inline" aria-hidden="true">|</span>
        <span>{polygons.length} G-AIRMET zones</span>
        <span className="mx-2 hidden sm:inline" aria-hidden="true">|</span>
        <span>Click markers for details</span>
      </div>
    </div>
  );
}
