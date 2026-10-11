/** USGS FDSN queries use the recap's exact interval, not a shifting weekly feed. */
import { reportingWindow } from '@/lib/newsletter/coverage';
import { inWindow, collectSource, finiteNumber, objectRecord } from './source';
import type { ReportingWindow } from '@/lib/newsletter/coverage';
import type { Collected } from './source';

export interface QuakeRecord {
  mag: number;
  place: string;
  time: string;
  url: string;
  tsunami: boolean;
  depth_km: number | null;
}
export interface QuakeWeekSummary {
  significantCount: number | null;
  m45PlusCount: number | null;
  largest: QuakeRecord | null;
  significant: QuakeRecord[];
}

export async function fetchPastWeekQuakes(window = reportingWindow()): Promise<Collected<QuakeWeekSummary>> {
  const [significant, m45] = await Promise.all([
    collectQuakes('significant', { minsig: '601' }, window),
    collectQuakes('m45', { minmagnitude: '4.5' }, window),
  ]);
  return {
    data: significant.data || m45.data ? {
      significantCount: significant.data?.length ?? null, m45PlusCount: m45.data?.length ?? null,
      largest: m45.data?.reduce<QuakeRecord | null>((best, q) => !best || q.mag > best.mag ? q : best, null) ?? null,
      significant: significant.data?.slice(0, 8) ?? [],
    } : null,
    sources: [significant.audit, m45.audit],
  };
}

async function collectQuakes(id: string, filter: Record<string, string>, window: ReportingWindow) {
  const params = new URLSearchParams({
    format: 'geojson', starttime: window.start,
    endtime: new Date(Date.parse(window.end) - 1).toISOString(),
    orderby: 'time', limit: '20000', ...filter,
  });
  return collectSource({
    id: `usgs-${id}`, label: `USGS ${id === 'significant' ? 'significant (significance > 600)' : 'M4.5+'} earthquakes`,
    url: `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`, requested: window, unit: 'catalog queries',
  }, raw => {
    const payload = objectRecord(raw);
    if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) throw new SyntaxError('Missing feature collection');
    const rows = new Map<string, QuakeRecord>();
    let rejected = 0;
    for (const feature of payload.features) {
      try {
        const item = objectRecord(feature);
        const p = objectRecord(item.properties);
        const mag = finiteNumber(p.mag);
        const time = finiteNumber(p.time);
        if (mag === null || mag < -2 || mag > 10 || time === null || !inWindow(time, window) ||
            typeof p.place !== 'string' || !p.place.trim() || typeof p.url !== 'string' ||
            !/^https:\/\/earthquake\.usgs\.gov\//.test(p.url) || typeof item.id !== 'string') { rejected++; continue; }
        if ((id === 'm45' && mag < 4.5) || (id === 'significant' && (finiteNumber(p.sig) === null || Number(p.sig) <= 600))) { rejected++; continue; }
        const geometry = item.geometry ? objectRecord(item.geometry) : null;
        const depth = Array.isArray(geometry?.coordinates) ? finiteNumber(geometry.coordinates[2]) : null;
        rows.set(item.id, { mag, place: p.place, time: new Date(time).toISOString(), url: p.url, tsunami: p.tsunami === 1, depth_km: depth });
      } catch { rejected++; }
    }
    const reasons = rejected ? [`${rejected} unvalidated events; counts and largest event cover validated observations only`] : [];
    if (payload.features.length >= 20000) reasons.push('Query reached its result limit; interval may be incomplete');
    const records = [...rows.values()].sort((a, b) => b.time.localeCompare(a.time));
    return {
      data: records.length || !reasons.length ? records : null, records: records.length, times: records.map(q => q.time),
      covered: reasons.length ? [] : [window], reasons,
      expectedUnits: 1, observedUnits: reasons.length ? 0 : 1,
      status: reasons.length ? 'partial' : 'complete',
    };
  });
}
