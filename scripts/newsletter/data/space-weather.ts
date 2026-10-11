/** NOAA observations. Kp and GOES X-ray availability are independent. */
import { DAY_MS, reportingWindow } from '@/lib/newsletter/coverage';
import { parsePlanetaryKpSeries } from '@/lib/services/swpc-kp';
import { swpcTimeTagMs } from '@/lib/space-weather/time-tag';
import { inWindow, collectSource, finiteNumber, objectRecord } from './source';
import type { ReportingWindow } from '@/lib/newsletter/coverage';
import type { Collected } from './source';
import type { ParsedSource } from './source';

export interface SpaceWeatherSummary {
  recentKp: Array<{ time: string; kp: number }>;
  peakKpObserved: number | null;
  recentXrayClass: string | null;
  notableFlares: Array<{ time: string; class: string; region?: string }>;
}

interface Observation { time: string; value: number }

/** Require every expected cadence slot; endpoints alone do not prove continuity. */
function assessSeries(rows: Observation[], rejected: number, window: ReportingWindow, cadenceMs: number): ParsedSource<Observation[]> {
  const start = Date.parse(window.start);
  const aligned = rows.filter(row => Date.parse(row.time) % cadenceMs === 0);
  rejected += rows.length - aligned.length;
  const filtered = aligned.filter(row => inWindow(Date.parse(row.time), window));
  const expectedUnits = Math.ceil((Date.parse(window.end) - start) / cadenceMs);
  const slots = new Set(filtered.map(row => Math.floor((Date.parse(row.time) - start) / cadenceMs)));
  const reasons: string[] = [];
  if (slots.size < expectedUnits) reasons.push(`Missing ${expectedUnits - slots.size} of ${expectedUnits} expected intervals; peak is only for observed coverage`);
  if (rejected) reasons.push(`${rejected} invalid or conflicting rows rejected`);
  return {
    data: filtered.length ? filtered : null,
    records: filtered.length, times: filtered.map(row => row.time),
    covered: [...slots].sort((a, b) => a - b).map(slot => ({
      start: new Date(start + slot * cadenceMs).toISOString(),
      end: new Date(Math.min(start + (slot + 1) * cadenceMs, Date.parse(window.end))).toISOString(),
    })),
    expectedUnits, observedUnits: slots.size, reasons,
    status: filtered.length ? (reasons.length ? 'partial' : 'complete') : rejected ? 'malformed' : rows.length ? 'stale' : 'unavailable',
  };
}

export async function fetchSpaceWeatherSummary(window = reportingWindow()): Promise<Collected<SpaceWeatherSummary>> {
  const [kp, xray] = await Promise.all([
    collectSource({
      id: 'swpc-kp', label: 'NOAA SWPC planetary Kp',
      url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      requested: window, unit: 'three-hour blocks',
    }, raw => {
      const parsed = parsePlanetaryKpSeries(raw);
      const result = assessSeries(parsed.samples.map(row => ({ time: row.timeTag, value: row.kp })), parsed.rejectedRows, window, DAY_MS / 8);
      if (!parsed.supported) { result.status = 'unsupported'; result.reasons = ['Unsupported Kp payload schema']; }
      return result;
    }),
    collectSource({
      id: 'swpc-xray', label: 'NOAA GOES primary 0.1–0.8 nm X-ray flux',
      url: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json',
      requested: window, unit: 'one-minute samples',
    }, raw => {
      if (!Array.isArray(raw)) throw new SyntaxError('Expected X-ray series');
      const rows = new Map<string, Observation>();
      let rejected = 0;
      for (const entry of raw) {
        try {
          const row = objectRecord(entry);
          if (row.energy !== '0.1-0.8nm') {
            if (row.energy !== '0.05-0.4nm') rejected++;
            continue;
          }
          const time = typeof row.time_tag === 'string' ? swpcTimeTagMs(row.time_tag) : NaN;
          const flux = finiteNumber(row.flux);
          if (!Number.isFinite(time) || flux === null || flux < 0) { rejected++; continue; }
          const tag = new Date(time).toISOString();
          if (rows.has(tag) && rows.get(tag)!.value !== flux) rejected++;
          rows.set(tag, { time: tag, value: flux });
        } catch { rejected++; }
      }
      return assessSeries([...rows.values()], rejected, window, 60_000);
    }),
  ]);
  const peak = xray.data?.reduce<Observation | null>((best, row) => !best || row.value > best.value ? row : best, null);
  const flareClass = peak ? classifyFlare(peak.value) : null;
  return {
    data: kp.data || xray.data ? {
      recentKp: kp.data?.slice(-16).map(row => ({ time: row.time, kp: row.value })) ?? [],
      peakKpObserved: kp.data ? Math.max(...kp.data.map(row => row.value)) : null,
      recentXrayClass: flareClass,
      notableFlares: peak && flareClass && /^[MX]/.test(flareClass) ? [{ time: peak.time, class: flareClass }] : [],
    } : null,
    sources: [kp.audit, xray.audit],
  };
}

function classifyFlare(flux: number): string {
  if (flux >= 1e-4) return `X${(flux / 1e-4).toFixed(1)}`;
  if (flux >= 1e-5) return `M${(flux / 1e-5).toFixed(1)}`;
  if (flux >= 1e-6) return `C${(flux / 1e-6).toFixed(1)}`;
  if (flux >= 1e-7) return `B${(flux / 1e-7).toFixed(1)}`;
  return `below B-class (observed flux ${flux} W/m²)`;
}
