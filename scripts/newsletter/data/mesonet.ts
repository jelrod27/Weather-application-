/** IEM polygon warnings only: TO.W, SV.W, FF.W, MA.W and EW.W. */
import { reportingWindow } from '@/lib/newsletter/coverage';
import { swpcTimeTagMs } from '@/lib/space-weather/time-tag';
import { inWindow, collectSource, objectRecord } from './source';
import type { Collected } from './source';

export interface MesonetWarning {
  phenomena: string;
  significance: string;
  issued: string;
  expired: string;
  wfo: string;
  area_desc: string;
  event_id: number | null;
}
export interface MesonetPastWeekSummary {
  totalWarnings: number;
  byType: Record<string, number>;
  notable: MesonetWarning[];
  daysCovered: number;
}

export async function fetchPastWeekWarnings(days = 7, now = new Date()): Promise<Collected<MesonetPastWeekSummary>> {
  const window = reportingWindow(now, days);
  const params = new URLSearchParams({ begints: window.start, endts: window.end });
  const result = await collectSource({
    id: 'iem-warnings', label: 'IEM polygon warnings issued (TO/SV/FF/MA/EW.W only)',
    url: `https://mesonet.agron.iastate.edu/api/1/vtec/sbw_interval.json?${params}`, requested: window,
    unit: 'archive queries (unique warning events)',
  }, raw => {
    const payload = objectRecord(raw);
    if (!Array.isArray(payload.data)) throw new SyntaxError('Missing data array');
    const events = new Map<string, MesonetWarning>();
    let rejected = 0;
    for (const entry of payload.data) {
      try {
        const row = objectRecord(entry);
        if (typeof row.phenomena !== 'string' || typeof row.significance !== 'string') { rejected++; continue; }
        // Other polygon products (for example FA.Y) are outside the stated scope.
        if (!['TO', 'SV', 'FF', 'MA', 'EW'].includes(row.phenomena) || row.significance !== 'W') continue;
        const issued = typeof row.utc_issue === 'string' ? swpcTimeTagMs(row.utc_issue) : NaN;
        const expired = typeof row.utc_expire === 'string' ? swpcTimeTagMs(row.utc_expire) : NaN;
        if (!Number.isFinite(issued) || !Number.isFinite(expired) || expired < issued ||
            typeof row.wfo !== 'string' || !/^[A-Z]{3,4}$/.test(row.wfo) ||
            typeof row.eventid !== 'number' || !Number.isInteger(row.eventid) || row.eventid < 0) {
          rejected++;
          continue;
        }
        if (!inWindow(issued, window)) continue;
        // The archive contains polygon updates. Count each official VTEC event once.
        const key = `${new Date(issued).getUTCFullYear()}/${row.wfo}/${row.phenomena}.${row.significance}/${row.eventid}`;
        const locations = typeof row.locations === 'string' ? row.locations : typeof row.ugclist === 'string' ? row.ugclist : 'Area not supplied';
        events.set(key, {
          phenomena: row.phenomena, significance: row.significance, wfo: row.wfo,
          issued: new Date(issued).toISOString(), expired: new Date(expired).toISOString(),
          area_desc: locations, event_id: row.eventid,
        });
      } catch { rejected++; }
    }
    const rows = [...events.values()];
    const byType: Record<string, number> = {};
    for (const row of rows) {
      const type = `${row.phenomena}.${row.significance}`;
      byType[type] = (byType[type] ?? 0) + 1;
    }
    const priority = ['TO', 'FF', 'EW', 'SV', 'MA'];
    const notable = [...rows].sort((a, b) => priority.indexOf(a.phenomena) - priority.indexOf(b.phenomena) || b.issued.localeCompare(a.issued)).slice(0, 10);
    return {
      data: rows.length || !rejected ? { totalWarnings: rows.length, byType, notable, daysCovered: rejected ? 0 : days } : null,
      records: rows.length, times: rows.map(row => row.issued), covered: rejected ? [] : [window],
      expectedUnits: 1, observedUnits: rejected ? 0 : 1,
      reasons: rejected ? [`${rejected} unvalidated rows; totals cover validated warning events only`] : [],
      status: rejected ? 'partial' : 'complete',
    };
  });
  return { data: result.data, sources: [result.audit] };
}
