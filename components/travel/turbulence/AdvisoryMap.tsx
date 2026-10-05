'use client';

import { useEffect, useRef, useState } from 'react';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { defaults as defaultControls } from 'ol/control/defaults';
import 'ol/ol.css';
import { CARTO_VOYAGER_XYZ_URL } from '@/lib/maps/carto-basemap';
import type { TurbulencePolygon } from '@/lib/aviation/turbulence';

interface AdvisoryMapProps {
  polygons: TurbulencePolygon[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  center: [number, number] | null;
  resetKey: number;
}

export default function AdvisoryMap({ polygons, selectedId, onSelect, center, resetKey }: AdvisoryMapProps): React.JSX.Element {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<OLMap | null>(null);
  const source = useRef(new VectorSource());
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    if (!element.current) return;
    const hasCartoKey = Boolean(process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim());
    const tiles = new XYZ({
      url: hasCartoKey ? CARTO_VOYAGER_XYZ_URL : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      crossOrigin: 'anonymous',
      attributions: `${hasCartoKey ? '&copy; <a href="https://carto.com/">CARTO</a> ' : ''}&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`,
      attributionsCollapsible: false,
    });
    tiles.on('tileloaderror', () => setTilesFailed(true));
    const instance = new OLMap({ target: element.current,
      controls: defaultControls({ attributionOptions: { collapsible: false } }),
      layers: [new TileLayer({ source: tiles }), new VectorLayer({ source: source.current })],
      view: new View({ center: fromLonLat([-98, 39]), zoom: 4, minZoom: 2, maxZoom: 10 }),
    });
    map.current = instance;
    instance.on('singleclick', event => {
      const id = instance.forEachFeatureAtPixel(event.pixel, feature => feature.getId());
      onSelect(typeof id === 'string' ? id : null);
    });
    return () => { instance.setTarget(undefined); instance.dispose(); map.current = null; };
  }, [onSelect]);

  useEffect(() => {
    source.current.clear();
    source.current.addFeatures(polygons.map((polygon, index) => {
      const feature = new Feature(new Polygon(polygon.coordinates.map(ring => ring.map(point => fromLonLat(point)))));
      feature.setId(polygon.id);
      feature.setStyle(new Style({
        fill: new Fill({ color: polygon.id === selectedId ? '#2563eb55' : '#d9770633' }),
        stroke: new Stroke({ color: polygon.id === selectedId ? '#1d4ed8' : '#92400e', width: polygon.id === selectedId ? 3 : 2, lineDash: [6, 3] }),
        text: new Text({ text: String(index + 1), font: 'bold 14px sans-serif', fill: new Fill({ color: '#172f4a' }), stroke: new Stroke({ color: '#fff', width: 4 }) }),
      }));
      return feature;
    }));
  }, [polygons, selectedId]);

  useEffect(() => {
    const geometry = selectedId ? source.current.getFeatureById(selectedId)?.getGeometry() : null;
    if (geometry) map.current?.getView().fit(geometry.getExtent(), { padding: [50, 50, 50, 50], maxZoom: 6 });
  }, [selectedId]);

  useEffect(() => {
    map.current?.getView().setCenter(fromLonLat(center ?? [-98, 39]));
    map.current?.getView().setZoom(center ? 6 : 4);
  }, [center, resetKey]);

  return <div className="space-y-2">
    <div ref={element} tabIndex={0} role="region" aria-label="US advisory map. Use plus and minus to zoom, arrow keys to pan, or the advisory list below."
      className="h-[360px] w-full overflow-hidden rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-primary sm:h-[480px]" />
    {tilesFailed && <p role="status" className="text-sm text-muted-foreground">Some background map tiles are unavailable. Advisory details remain available in the list below.</p>}
    <p className="text-xs text-muted-foreground">Dashed amber areas: official turbulence advisories. Numbers match the list below. Blue outline: selected area. Blank map areas do not mean smooth conditions.</p>
  </div>;
}
