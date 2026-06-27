import { pointInGeoJsonGeometry } from '@/lib/geo/point-in-polygon';
import {
  RISK_LABELS,
  RISK_ORDER,
  type SPCOutlookGeoJSON,
} from '@/lib/services/spc-outlook-service';

export interface PointSpcRisk {
  riskCode: string;
  label: string;
  fill: string;
}

export function getHighestSpcRiskAtPoint(
  geojson: SPCOutlookGeoJSON,
  lat: number,
  lon: number,
): PointSpcRisk | null {
  const point: [number, number] = [lon, lat];
  let best: (PointSpcRisk & { order: number }) | null = null;

  for (const feature of geojson.features) {
    const code = feature.properties.LABEL;
    if (!(code in RISK_ORDER)) continue;
    if (!pointInGeoJsonGeometry(point, feature.geometry as Parameters<typeof pointInGeoJsonGeometry>[1])) continue;

    const order = RISK_ORDER[code];
    if (best && order <= best.order) continue;

    best = {
      riskCode: code,
      label: RISK_LABELS[code] ?? feature.properties.LABEL2 ?? code,
      fill: (feature.properties.fill as string) || '#f97316',
      order,
    };
  }

  if (!best) return null;
  return { riskCode: best.riskCode, label: best.label, fill: best.fill };
}
