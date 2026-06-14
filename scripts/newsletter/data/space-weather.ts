/**
 * NOAA Space Weather Prediction Center — past week + recent activity.
 * Free, no API key, all JSON endpoints.
 */

const FETCH_TIMEOUT_MS = 15_000;
const UA = '16bitweather-newsletter/1.0 (https://16bitweather.co)';

export interface SpaceWeatherSummary {
  recentKp: Array<{ time: string; kp: number }>;
  maxKpPastWeek: number;
  recentXrayClass: string | null;
  notableFlares: Array<{ time: string; class: string; region?: string }>;
}

interface KpRow {
  time_tag: string;
  kp_index: number | string;
}

interface XrayRow {
  time_tag: string;
  flux: number;
  energy: '0.05-0.4nm' | '0.1-0.8nm';
  observed_flux?: number;
}

export async function fetchSpaceWeatherSummary(): Promise<SpaceWeatherSummary> {
  const [kpRows, xrayRows] = await Promise.all([
    fetchJson<KpRow[]>('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),
    fetchJson<XrayRow[]>('https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json'),
  ]);

  const kpRecent = parseKp(kpRows).slice(-56); // 7 days × 8 readings/day
  const maxKp = kpRecent.reduce((m, r) => Math.max(m, r.kp), 0);

  const peakXray = parseXrayPeak(xrayRows);
  const flareClass = peakXray ? classifyFlare(peakXray.flux) : null;

  return {
    recentKp: kpRecent.slice(-16), // last 2 days for the recap
    maxKpPastWeek: maxKp,
    recentXrayClass: flareClass,
    notableFlares: peakXray && flareClass && isOperationallyNotableFlare(flareClass)
      ? [{ time: peakXray.time, class: flareClass }]
      : [],
  };
}

function isOperationallyNotableFlare(flareClass: string): boolean {
  // C-class peaks are worth a text mention as the week's strongest flare,
  // but they should not activate solar imagery when geomagnetic activity is
  // otherwise quiet. Reserve the image lane for M/X flares or Kp-driven storms.
  return flareClass.startsWith('M') || flareClass.startsWith('X');
}

function parseKp(raw: KpRow[] | unknown): Array<{ time: string; kp: number }> {
  // SWPC quirk: first row is a header array on the unstructured endpoint;
  // products/noaa-planetary-k-index.json returns array-of-arrays.
  if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
    const rows = raw as unknown as Array<[string, string | number, string?]>;
    return rows
      .slice(1)
      .map((r) => ({ time: r[0], kp: typeof r[1] === 'number' ? r[1] : parseFloat(String(r[1])) }))
      .filter((r) => !Number.isNaN(r.kp));
  }
  if (Array.isArray(raw)) {
    return (raw as KpRow[])
      .map((r) => ({ time: r.time_tag, kp: typeof r.kp_index === 'number' ? r.kp_index : parseFloat(String(r.kp_index)) }))
      .filter((r) => !Number.isNaN(r.kp));
  }
  return [];
}

function parseXrayPeak(rows: XrayRow[] | unknown): { time: string; flux: number } | null {
  if (!Array.isArray(rows)) return null;
  const filtered = (rows as XrayRow[]).filter((r) => r.energy === '0.1-0.8nm');
  if (filtered.length === 0) return null;
  let peak = filtered[0];
  for (const r of filtered) {
    if (r.flux > peak.flux) peak = r;
  }
  return { time: peak.time_tag, flux: peak.flux };
}

function classifyFlare(flux: number): string | null {
  if (flux >= 1e-4) return `X${(flux / 1e-4).toFixed(1)}`;
  if (flux >= 1e-5) return `M${(flux / 1e-5).toFixed(1)}`;
  if (flux >= 1e-6) return `C${(flux / 1e-6).toFixed(1)}`;
  if (flux >= 1e-7) return `B${(flux / 1e-7).toFixed(1)}`;
  // Below B-class is quiescent background — not a meaningful "peak class".
  // Returning null lets callers report "quiet" rather than misleading "A0.1".
  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`SWPC ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
