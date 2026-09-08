/**
 * Parse NOAA SWPC planetary K-index product JSON.
 * SWPC has shipped both array rows `[time_tag, Kp, ...]` and object rows
 * `{ time_tag, Kp }` — support both so a format flip does not zero the UI.
 */

import { swpcTimeTagMs } from '@/lib/space-weather/time-tag';

export type KpSample = { timeTag: string; kp: number };

function readKpFromRow(row: unknown): KpSample | null {
  if (Array.isArray(row) && row.length >= 2) {
    const timeTag = String(row[0] ?? '');
    const kp = parseFloat(String(row[1]));
    if (!timeTag || Number.isNaN(kp)) return null;
    return { timeTag, kp };
  }

  if (row && typeof row === 'object') {
    const obj = row as Record<string, unknown>;
    const timeTag = String(obj.time_tag ?? obj.timeTag ?? '');
    const raw = obj.Kp ?? obj.kp ?? obj.kp_index;
    const kp = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
    if (!timeTag || Number.isNaN(kp)) return null;
    return { timeTag, kp };
  }

  return null;
}

/** Drop a leading header row when present (legacy array format). */
function dataRows(payload: unknown[]): unknown[] {
  if (payload.length === 0) return [];
  const first = payload[0];
  if (Array.isArray(first) && typeof first[0] === 'string' && /time/i.test(first[0])) {
    return payload.slice(1);
  }
  // Object feed has no header row
  if (first && typeof first === 'object' && !Array.isArray(first) && 'time_tag' in (first as object)) {
    return payload;
  }
  if (Array.isArray(first)) return payload.slice(1);
  return payload;
}

/**
 * The last eight three-hour blocks and the newest of them.
 *
 * Selected by time tag rather than array position. The planetary K-index
 * product happens to ship oldest-first today, but the sibling RTSW feeds ship
 * newest-first, and reading position instead of time is exactly what had the
 * site presenting a day-old solar wind speed as current. This value is the
 * headline Kp and the `dateModified` stamp on three indexed pages, so it does
 * not get to depend on an ordering NOAA never promised.
 */
export function parsePlanetaryKpIndex(payload: unknown): {
  current: KpSample | null;
  recent: KpSample[];
} {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { current: null, recent: [] };
  }

  const samples = dataRows(payload)
    .map(readKpFromRow)
    .filter((sample): sample is KpSample => sample !== null);

  // An unreadable tag cannot be ordered, and NaN in a comparator silently
  // leaves rows where they sat — which would put one last and elect it
  // `current`. Drop them, but keep array order as the fallback so a tag format
  // change degrades to the previous behaviour instead of emptying the UI.
  const dated = samples.filter((sample) => Number.isFinite(swpcTimeTagMs(sample.timeTag)));
  const ordered =
    dated.length > 0
      ? [...dated].sort((a, b) => swpcTimeTagMs(a.timeTag) - swpcTimeTagMs(b.timeTag))
      : samples;

  const recent = ordered.slice(-8);
  const current = recent.length > 0 ? recent[recent.length - 1]! : null;
  return { current, recent };
}

/**
 * Expected and peak Kp over the next 24 hours.
 *
 * The forecast product leads with roughly a week of already-observed rows
 * before the predicted ones, so taking the first eight returned last week's
 * observations and called them a forecast. Select by time instead: the eight
 * three-hour blocks from the start of the one currently in progress, i.e.
 * whose tag is at or after `now - 3h`. That is the coming 24 hours whatever
 * order or mix of observed and predicted rows SWPC ships, and it keeps the
 * most immediate block rather than skipping to the next one.
 *
 * Returns null when nothing in the payload lies ahead, so a caller can say
 * "unavailable" rather than present stale history as an outlook.
 */
export function parseKpForecast(
  payload: unknown,
  now: Date = new Date(),
): {
  expected: number;
  maxExpected: number;
  /** Three-hour blocks the average covers, so a caller can label the window. */
  blocks: number;
} | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  // Allow the block already in progress: its tag is up to 3 hours behind now.
  const cutoff = now.getTime() - 3 * 60 * 60 * 1000;

  const upcoming = dataRows(payload)
    .map(readKpFromRow)
    .filter((sample): sample is KpSample => sample !== null)
    .map((sample) => ({ sample, ms: swpcTimeTagMs(sample.timeTag) }))
    .filter(({ ms }) => Number.isFinite(ms) && ms >= cutoff)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 8)
    .map(({ sample }) => sample);

  if (upcoming.length === 0) return null;

  let maxKp = 0;
  let sumKp = 0;
  for (const sample of upcoming) {
    maxKp = Math.max(maxKp, sample.kp);
    sumKp += sample.kp;
  }

  return {
    expected: Math.round((sumKp / upcoming.length) * 10) / 10,
    maxExpected: maxKp,
    blocks: upcoming.length,
  };
}
