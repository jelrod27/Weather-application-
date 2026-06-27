/** GeoJSON positions are [longitude, latitude]. */
export type LonLat = [number, number];

function pointInRing(point: LonLat, ring: LonLat[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function ringFromGeoJson(raw: number[][]): LonLat[] {
  return raw.map(([lon, lat]) => [lon, lat] as LonLat);
}

function pointInPolygonCoords(point: LonLat, polygon: number[][][]): boolean {
  if (polygon.length === 0) return false;
  const outer = ringFromGeoJson(polygon[0]);
  if (!pointInRing(point, outer)) return false;
  for (let holeIndex = 1; holeIndex < polygon.length; holeIndex++) {
    if (pointInRing(point, ringFromGeoJson(polygon[holeIndex]))) return false;
  }
  return true;
}

export function pointInGeoJsonGeometry(
  point: LonLat,
  geometry: {
    type: string;
    coordinates?: unknown;
    geometries?: Array<{ type: string; coordinates?: unknown }>;
  },
): boolean {
  if (geometry.type === 'Polygon') {
    return pointInPolygonCoords(point, geometry.coordinates as number[][][]);
  }
  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as number[][][][];
    return polys.some((poly) => pointInPolygonCoords(point, poly));
  }
  if (geometry.type === 'GeometryCollection' && geometry.geometries) {
    return geometry.geometries.some((g) => pointInGeoJsonGeometry(point, g));
  }
  return false;
}

/** Rough CONUS bounds — SPC day-1 outlook applies here. */
export function isInConus(lat: number, lon: number): boolean {
  return lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
}
