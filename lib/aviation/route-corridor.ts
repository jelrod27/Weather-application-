/** Great-circle sampling + simple distance checks for route hazard filtering. */

const EARTH_RADIUS_KM = 6371;
const MI_TO_KM = 1.60934;

export type LatLon = { lat: number; lon: number };

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Sample points along the great-circle from origin to destination (inclusive). */
export function sampleGreatCircle(
  origin: LatLon,
  destination: LatLon,
  samples = 24,
): LatLon[] {
  if (samples < 2) return [origin, destination];
  const lat1 = toRad(origin.lat);
  const lon1 = toRad(origin.lon);
  const lat2 = toRad(destination.lat);
  const lon2 = toRad(destination.lon);

  const d =
    2
    * Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2
          + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    );

  if (d < 1e-9) return [origin];

  const points: LatLon[] = [];
  for (let i = 0; i < samples; i++) {
    const f = i / (samples - 1);
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    points.push({ lat: (lat * 180) / Math.PI, lon: (lon * 180) / Math.PI });
  }
  return points;
}

export function pointNearCorridor(
  point: LatLon,
  corridor: LatLon[],
  bufferMi = 150,
): boolean {
  const bufferKm = bufferMi * MI_TO_KM;
  for (const c of corridor) {
    if (haversineKm(point, c) <= bufferKm) return true;
  }
  return false;
}
