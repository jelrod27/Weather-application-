'use client';

/**
 * SPC Convective Outlook Map
 *
 * Renders SPC outlook GeoJSON polygons on an OpenLayers map.
 * Shows categorical, tornado, hail, and wind risk areas.
 * Handles empty geometries (no risk) gracefully via server-side filtering.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { safeStorage } from '@/lib/safe-storage';

import 'ol/ol.css';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke } from 'ol/style';
import type { FeatureLike } from 'ol/Feature';

import { CARTO_VOYAGER_XYZ_URL } from '@/lib/maps/carto-basemap';
import { RISK_LABELS, OUTLOOK_TYPE_LABELS } from '@/lib/services/spc-outlook-service';
import type { SPCOutlookDay, SPCOutlookType } from '@/lib/services/spc-outlook-service';

const CONUS_CENTER: [number, number] = [-98.5795, 39.8283];
const CONUS_ZOOM = 4;

const SPC_CACHE_PREFIX = 'bitweather_spc_';
const SPC_CACHE_TTL = 10 * 60 * 1000;

interface SPCOutlookMapProps {
  day: SPCOutlookDay;
  type: SPCOutlookType;
}

function getCachedOutlook(day: SPCOutlookDay, type: SPCOutlookType) {
  try {
    const cached = safeStorage.getItem(`${SPC_CACHE_PREFIX}${day}_${type}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() < parsed.expiresAt) return parsed.data;
      safeStorage.removeItem(`${SPC_CACHE_PREFIX}${day}_${type}`);
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedOutlook(day: SPCOutlookDay, type: SPCOutlookType, data: unknown) {
  try {
    safeStorage.setItem(`${SPC_CACHE_PREFIX}${day}_${type}`, JSON.stringify({
      data,
      expiresAt: Date.now() + SPC_CACHE_TTL,
    }));
  } catch { /* ignore */ }
}

export default function SPCOutlookMap({ day, type }: SPCOutlookMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const requestIdRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noRiskLabel, setNoRiskLabel] = useState<string | null>(null);
  const [clickedFeature, setClickedFeature] = useState<{ label: string; label2: string; fill: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: CARTO_VOYAGER_XYZ_URL,
        attributions: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        crossOrigin: 'anonymous',
      }),
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

    // Use pixel-based popup positioning instead of OL Overlay to avoid
    // React DOM conflicts (OL Overlay reparents elements, breaking React reconciliation)
    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        const props = feature.getProperties();
        if (props.LABEL) {
          setClickedFeature({
            label: props.LABEL,
            label2: props.LABEL2 || RISK_LABELS[props.LABEL] || props.LABEL,
            fill: props.fill || '#888',
            x: evt.pixel[0],
            y: evt.pixel[1],
          });
        }
      } else {
        setClickedFeature(null);
      }
    });

    map.on('pointermove', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, () => true);
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

  const fetchOutlook = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!mapInstanceRef.current) return;

    setIsLoading(true);
    setError(null);
    setNoRiskLabel(null);
    setClickedFeature(null);

    if (vectorLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(vectorLayerRef.current);
      vectorLayerRef.current = null;
    }

    try {
      let data = getCachedOutlook(day, type);

      if (!data) {
        const res = await fetch(`/api/weather/spc-outlook?day=${day}&type=${type}`);
        if (!res.ok) throw new Error('Failed to fetch outlook');
        data = await res.json();
        setCachedOutlook(day, type, data);
      }

      if (requestId !== requestIdRef.current || !mapInstanceRef.current) return;

      const map = mapInstanceRef.current;

      if (!data.features || data.features.length === 0) {
        vectorLayerRef.current = null;
        setNoRiskLabel(data.noRiskLabel || `No ${OUTLOOK_TYPE_LABELS[type]} risk in current outlook`);
        map.getView().animate({ center: fromLonLat(CONUS_CENTER), zoom: CONUS_ZOOM, duration: 500 });
        return;
      }

      const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(data, {
          featureProjection: 'EPSG:3857',
        }),
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: (feature: FeatureLike) => {
          const props = feature.getProperties();
          return new Style({
            fill: new Fill({ color: (props.fill || '#888888') + '99' }),
            stroke: new Stroke({ color: props.stroke || '#ffffff', width: 2 }),
          });
        },
        zIndex: 100,
      });

      map.addLayer(vectorLayer);
      vectorLayerRef.current = vectorLayer;

      const extent = vectorSource.getExtent();
      if (extent && isFinite(extent[0])) {
        map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 7, duration: 500 });
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('[SPC Outlook Map]', err);
      setError('Unable to load SPC outlook data');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [day, type]);

  useEffect(() => {
    const timer = setTimeout(fetchOutlook, 100);
    return () => clearTimeout(timer);
  }, [fetchOutlook]);

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-[500px] rounded-lg overflow-hidden border border-border" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg pointer-events-none">
          <p className="text-sm font-mono text-muted-foreground animate-pulse">LOADING SPC OUTLOOK...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg pointer-events-none">
          <p className="text-sm font-mono text-orange-400">{error}</p>
        </div>
      )}

      {noRiskLabel && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-card/90 border border-green-500/30 rounded-lg p-6 text-center">
            <p className="text-lg font-mono text-green-400 font-bold">NO SIGNIFICANT RISK</p>
            <p className="text-sm font-mono text-muted-foreground mt-1">{noRiskLabel}</p>
          </div>
        </div>
      )}

      {/* Pixel-positioned popup - NOT an OL Overlay, avoids React DOM conflicts */}
      {clickedFeature && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{ left: clickedFeature.x, top: clickedFeature.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-white/30" style={{ backgroundColor: clickedFeature.fill }} />
                <span className="font-mono font-bold text-sm">{clickedFeature.label}</span>
              </div>
              <button type="button" onClick={() => setClickedFeature(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <p className="text-xs font-mono text-muted-foreground">{clickedFeature.label2}</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
        <span className="text-foreground font-bold">SPC OUTLOOK</span>
        {type === 'cat' ? (
          <>
            <LegendItem color="#C1E9C1" label="TSTM" />
            <LegendItem color="#66A366" label="MRGL" />
            <LegendItem color="#FFE066" label="SLGT" />
            <LegendItem color="#FFA500" label="ENH" />
            <LegendItem color="#FF0000" label="MDT" />
            <LegendItem color="#FF00FF" label="HIGH" />
          </>
        ) : (
          <>
            <LegendItem color="#66A366" label="2%" />
            <LegendItem color="#886644" label="5%" />
            <LegendItem color="#FFE066" label="10%" />
            <LegendItem color="#FF0000" label="15%" />
            <LegendItem color="#FF00FF" label="30%+" />
            <LegendItem color="#882288" label="SIGSVR" />
          </>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 rounded-sm border border-white/20" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
