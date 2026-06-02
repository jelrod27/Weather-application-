/**
 * USGS earthquake feed — significant earthquakes in the past 7 days.
 * Free, no API key.
 *
 * Endpoint: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson
 */

const SIGNIFICANT_WEEK = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson';
const M45_WEEK = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';
const FETCH_TIMEOUT_MS = 15_000;

export interface QuakeRecord {
  mag: number;
  place: string;
  time: string;
  url: string;
  tsunami: boolean;
  depth_km: number | null;
}

export interface QuakeWeekSummary {
  significantCount: number;
  m45PlusCount: number;
  largest: QuakeRecord | null;
  significant: QuakeRecord[];
}

export async function fetchPastWeekQuakes(): Promise<QuakeWeekSummary> {
  const [significant, m45plus] = await Promise.all([
    fetchGeoJson(SIGNIFICANT_WEEK),
    fetchGeoJson(M45_WEEK),
  ]);
  const sig = parseQuakes(significant);
  const m45 = parseQuakes(m45plus);

  let largest: QuakeRecord | null = null;
  for (const q of m45) {
    if (!largest || q.mag > largest.mag) largest = q;
  }

  return {
    significantCount: sig.length,
    m45PlusCount: m45.length,
    largest,
    significant: sig.slice(0, 8),
  };
}

interface GeoJsonFeature {
  properties: {
    mag: number | null;
    place: string;
    time: number;
    url: string;
    tsunami?: number;
  };
  geometry?: {
    coordinates?: [number, number, number?];
  };
}

function parseQuakes(raw: unknown): QuakeRecord[] {
  const features = (raw as { features?: GeoJsonFeature[] })?.features;
  if (!Array.isArray(features)) return [];
  // USGS returns mag: null for preliminary reports where magnitude isn't yet determined.
  // Skip those — without a magnitude they can't be ranked or formatted.
  return features
    .filter((f) => typeof f.properties.mag === 'number' && Number.isFinite(f.properties.mag))
    .map((f) => ({
      mag: f.properties.mag as number,
      place: f.properties.place,
      time: new Date(f.properties.time).toISOString(),
      url: f.properties.url,
      tsunami: f.properties.tsunami === 1,
      depth_km: f.geometry?.coordinates?.[2] ?? null,
    }));
}

async function fetchGeoJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`USGS ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
