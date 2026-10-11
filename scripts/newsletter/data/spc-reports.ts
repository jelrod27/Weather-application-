/** SPC preliminary reports use noon-to-noon UTC days; a 404 is unknown, never zero. */
import { DAY_MS, reportingWindow } from '@/lib/newsletter/coverage';
import { collectSource } from './source';
import type { Collected } from './source';

export type SpcReportCategory = 'tornado' | 'hail' | 'wind';
export interface SpcReport {
  category: SpcReportCategory;
  time: string; // UTC ISO timestamp, resolved against the SPC report day
  size: string; // F-scale, hail hundredths of an inch, or wind knots (UNK allowed)
  location: string;
  county: string;
  state: string;
  lat: number | null;
  lon: number | null;
  comments: string;
  date: string;
}
export interface SpcWeekSummary {
  total: number;
  byCategory: Record<SpcReportCategory, number>;
  byState: Record<string, number>;
  reports: SpcReport[];
  daysCovered: number;
}

export async function fetchPastWeekReports(days = 7, now = new Date()): Promise<Collected<SpcWeekSummary>> {
  const window = reportingWindow(now, days);
  const results = [];
  for (let day = 0; day < days; day++) {
    const start = new Date(Date.parse(window.start) + day * DAY_MS);
    const date = start.toISOString().slice(0, 10);
    const requested = { start: start.toISOString(), end: new Date(start.getTime() + DAY_MS).toISOString() };
    results.push(await collectSource({
      id: `spc-${date}`, label: `SPC preliminary reports ${date}`, requested, unit: 'complete report days',
      url: `https://www.spc.noaa.gov/climo/reports/${date.replaceAll('-', '').slice(2)}_rpts.csv`,
    }, raw => {
      if (typeof raw !== 'string') throw new SyntaxError('Expected CSV');
      const parsed = parseCsv(raw, date);
      return {
        data: parsed.reports.length || !parsed.rejected ? parsed.reports : null,
        records: parsed.reports.length, times: parsed.reports.map(r => r.time),
        covered: parsed.rejected ? [] : [requested],
        expectedUnits: 1, observedUnits: parsed.rejected ? 0 : 1,
        reasons: parsed.rejected ? [`${parsed.rejected} invalid rows; counts are lower bounds for validated reports`] : [],
        status: parsed.rejected ? 'partial' : 'complete',
      };
    }, true));
  }
  const reports = results.flatMap(result => result.data ?? []);
  const byCategory: Record<SpcReportCategory, number> = { tornado: 0, hail: 0, wind: 0 };
  const byState: Record<string, number> = {};
  for (const report of reports) {
    byCategory[report.category]++;
    byState[report.state] = (byState[report.state] ?? 0) + 1;
  }
  return {
    data: results.some(result => result.data !== null) ? {
      total: reports.length, byCategory, byState, reports,
      daysCovered: results.filter(result => result.audit.status === 'complete').length,
    } : null,
    sources: results.map(result => result.audit),
  };
}

function parseCsv(text: string, date: string): { reports: SpcReport[]; rejected: number } {
  const reports: SpcReport[] = [];
  const headers = new Set<SpcReportCategory>();
  let category: SpcReportCategory | null = null;
  let rejected = 0;
  for (const line of text.split(/\r?\n/).filter(line => line.trim())) {
    const header = /^Time,(F_Scale|Size|Speed),Location,County,State,Lat,Lon,Comments\s*$/i.exec(line);
    if (header) {
      category = ({ f_scale: 'tornado', size: 'hail', speed: 'wind' } as const)[header[1].toLowerCase() as 'f_scale' | 'size' | 'speed'];
      headers.add(category);
      continue;
    }
    const [time, size, location, county, state, lat, lon, ...comments] = line.split(',');
    if (!category || !/^([01]\d|2[0-3])[0-5]\d$/.test(time) || !size || !location || !county || !/^[A-Z]{2}$/.test(state) || !comments.length) {
      rejected++;
      continue;
    }
    const timestamp = new Date(`${date}T${time.slice(0, 2)}:${time.slice(2)}:00.000Z`);
    if (Number(time.slice(0, 2)) < 12) timestamp.setUTCDate(timestamp.getUTCDate() + 1);
    const latitude = coordinate(lat, 90);
    const longitude = coordinate(lon, 180);
    reports.push({ category, time: timestamp.toISOString(), size, location, county, state, lat: latitude, lon: longitude, comments: comments.join(','), date });
  }
  // A validated, header-only three-section file is an observed zero-report day.
  if (headers.size !== 3) throw new SyntaxError('Missing SPC section headers');
  return { reports, rejected };
}

function coordinate(raw: string, limit: number): number | null {
  const value = raw?.trim() ? Number(raw) : NaN;
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}
