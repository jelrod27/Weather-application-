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

export function parseKpForecast(payload: unknown): {
  expected: number;
  maxExpected: number;
} | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  const rows = dataRows(payload).slice(0, 8);
  let maxKp = 0;
  let sumKp = 0;
  let count = 0;

  for (const row of rows) {
    const sample = readKpFromRow(row);
    if (!sample) continue;
    maxKp = Math.max(maxKp, sample.kp);
    sumKp += sample.kp;
    count++;
  }

  if (count === 0) return null;
  return {
    expected: Math.round((sumKp / count) * 10) / 10,
    maxExpected: maxKp,
  };
}
