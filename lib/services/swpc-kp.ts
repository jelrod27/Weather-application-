/**
 * Parse NOAA SWPC planetary K-index product JSON.
 * SWPC has shipped both array rows `[time_tag, Kp, ...]` and object rows
 * `{ time_tag, Kp }` — support both so a format flip does not zero the UI.
 */

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

export function parsePlanetaryKpIndex(payload: unknown): {
  current: KpSample | null;
  recent: KpSample[];
} {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { current: null, recent: [] };
  }

  const rows = dataRows(payload);
  const recent: KpSample[] = [];
  for (const row of rows.slice(-8)) {
    const sample = readKpFromRow(row);
    if (sample) recent.push(sample);
  }

  const current = recent.length > 0 ? recent[recent.length - 1]! : null;
  return { current, recent };
}

/** Epoch ms for a SWPC time tag, which omits the zone but means UTC. */
function timeTagMs(timeTag: string): number {
  const trimmed = timeTag.trim();
  if (!trimmed) return Number.NaN;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const withT = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  return Date.parse(hasZone ? withT : `${withT}Z`);
}

/**
 * Expected and peak Kp over the next 24 hours.
 *
 * The forecast product leads with roughly a week of already-observed rows
 * before the predicted ones, so taking the first eight returned last week's
 * observations and called them a forecast. Select by time instead: the eight
 * three-hour blocks at or after `now`, which is the next 24 hours whatever
 * order or mix of observed and predicted rows SWPC ships.
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
} | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  // Allow the block already in progress: its tag is up to 3 hours behind now.
  const cutoff = now.getTime() - 3 * 60 * 60 * 1000;

  const upcoming = dataRows(payload)
    .map(readKpFromRow)
    .filter((sample): sample is KpSample => sample !== null)
    .map((sample) => ({ sample, ms: timeTagMs(sample.timeTag) }))
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
  };
}
