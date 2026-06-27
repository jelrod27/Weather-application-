import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  fetchSPCOutlook,
  type SPCOutlookDay,
  type SPCOutlookType,
  type SPCOutlookGeoJSON,
} from '@/lib/services/spc-outlook-service';
import { getHighestSpcRiskAtPoint } from '@/lib/geo/spc-point-risk';

const VALID_TYPES = new Set(['cat', 'torn', 'hail', 'wind']);

function parsePoint(raw: string | null): { lat: number; lon: number } | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [lat, lon] = parts;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

/**
 * Filter out features with empty GeometryCollections.
 * SPC returns these for "no risk" outlooks (e.g., "Less Than 2% All Areas").
 * OpenLayers crashes on empty GeometryCollections, so we strip them server-side
 * and pass the "no risk" label as metadata.
 */
export function filterEmptyGeometries(geojson: SPCOutlookGeoJSON) {
  const validFeatures: typeof geojson.features = [];
  let noRiskLabel: string | null = null;

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (geom.type === 'GeometryCollection' && (!geom.geometries || geom.geometries.length === 0)) {
      if (!noRiskLabel && feature.properties.LABEL) {
        noRiskLabel = feature.properties.LABEL;
      }
      continue;
    }
    validFeatures.push(feature);
  }

  return {
    geojson: { ...geojson, features: validFeatures },
    noRiskLabel,
  };
}

export async function GET(request: NextRequest) {
  try {
    const dayParam = request.nextUrl.searchParams.get('day') ?? '1';
    const typeParam = request.nextUrl.searchParams.get('type') ?? 'cat';
    const pointParam = request.nextUrl.searchParams.get('point');
    const point = parsePoint(pointParam);
    if (pointParam != null && pointParam.trim() !== '' && !point) {
      return NextResponse.json(
        { error: 'Invalid point parameter; use lat,lon in decimal degrees (WGS84).' },
        { status: 400 },
      );
    }

    if (!/^[123]$/.test(dayParam)) {
      return NextResponse.json({ error: 'day must be 1, 2, or 3' }, { status: 400 });
    }
    const day = Number(dayParam) as SPCOutlookDay;

    if (!VALID_TYPES.has(typeParam)) {
      return NextResponse.json({ error: 'type must be cat, torn, hail, or wind' }, { status: 400 });
    }

    const rawGeojson = await fetchSPCOutlook(day, typeParam as SPCOutlookType);
    const { geojson, noRiskLabel } = filterEmptyGeometries(rawGeojson);
    const pointRisk = point ? getHighestSpcRiskAtPoint(geojson, point.lat, point.lon) : null;

    return NextResponse.json({ ...geojson, noRiskLabel, pointRisk }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[SPC Outlook API]', error);
    return NextResponse.json(
      { error: 'Failed to fetch SPC outlook data' },
      { status: 500 }
    );
  }
}
