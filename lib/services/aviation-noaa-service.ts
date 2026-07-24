/**
 * Aviation NOAA Service
 *
 * Direct NOAA Aviation Weather Center fetchers for METAR observations and
 * SIGMET/AIRMET alerts. Used by airport-misery and trip-score so those routes
 * don't have to self-fetch through `/api/aviation/metar` and `/api/aviation/alerts`
 * (which is fragile when NEXT_PUBLIC_BASE_URL is misconfigured on Vercel and
 * would otherwise spawn 30 cold-start serverless invocations per board refresh).
 *
 * The existing /api/aviation/{metar,alerts} HTTP routes are unchanged; they
 * still serve other callers (FlightConditionsTerminal, AI context, etc.).
 */
import type { MetarObservation } from '@/lib/aviation/metar'
import { captureError, captureUpstreamTimeout, isAbortError } from '@/lib/error-utils';

const NOAA_METAR_BASE = 'https://aviationweather.gov/api/data/metar';
const NOAA_AIRSIGMET = 'https://aviationweather.gov/api/data/airsigmet';

const DEFAULT_TIMEOUT_MS = 10_000;
const NOAA_HEADERS = { 'User-Agent': '16-Bit-Weather/aviation-service' } as const;

export interface NoaaAlert {
  id: string;
  type: 'SIGMET' | 'AIRMET';
  severity: 'low' | 'moderate' | 'severe' | 'extreme';
  hazard: string;
  region: string;
  validFrom: string;
  validTo: string;
  text: string;
  rawText: string;
}

interface AWCAlert {
  /** Present on some AWC shapes; often missing — prefer seriesId. */
  airsigmetId?: number | string;
  seriesId?: string;
  alphaChar?: string;
  icaoId: string;
  /** Unix seconds (number) on current AWC JSON; historically ISO strings. */
  validTimeFrom: number | string;
  validTimeTo: number | string;
  rawAirSigmet: string;
  hazard: string;
  severity: string | number;
  airsigmetType: string;
  altitudeLow1: number;
  altitudeHi1: number;
}

/* -------------------------------------------------------------------------- */
/* METAR parsing — kept aligned with app/api/aviation/metar/route.ts so the   */
/* output shape matches the existing MetarObservation type.                    */
/* -------------------------------------------------------------------------- */

function determineFlightCategory(
  visibility: number | undefined,
  clouds: Array<{ cover: string; base?: number }> | undefined,
): MetarObservation['flightCategory'] {
  let ceiling: number | undefined;
  for (const cloud of clouds ?? []) {
    if ((cloud.cover === 'BKN' || cloud.cover === 'OVC') && cloud.base !== undefined) {
      if (ceiling === undefined || cloud.base < ceiling) ceiling = cloud.base;
    }
  }

  if ((ceiling !== undefined && ceiling < 500) || (visibility !== undefined && visibility < 1)) return 'LIFR';
  if ((ceiling !== undefined && ceiling < 1000) || (visibility !== undefined && visibility < 3)) return 'IFR';
  if ((ceiling !== undefined && ceiling < 3000) || (visibility !== undefined && visibility < 5)) return 'MVFR';
  if (visibility === undefined && ceiling === undefined) return 'UNKNOWN';
  return 'VFR';
}

export function parseMetarRaw(raw: string): MetarObservation | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const result: Partial<MetarObservation> = { raw: trimmed, clouds: [] };

  const icaoMatch = trimmed.match(/\b([A-Z]{4})\b/);
  if (icaoMatch) result.icao = icaoMatch[1];
  if (!result.icao) return null;

  const timeMatch = trimmed.match(/\b(\d{6})Z\b/);
  if (timeMatch) {
    const day = parseInt(timeMatch[1].slice(0, 2));
    const hour = parseInt(timeMatch[1].slice(2, 4));
    const minute = parseInt(timeMatch[1].slice(4, 6));
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth();
    let obsTime = new Date(Date.UTC(year, month, day, hour, minute));
    if (obsTime > now) {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
      obsTime = new Date(Date.UTC(year, month, day, hour, minute));
    }
    result.observationTime = obsTime.toISOString();
  } else {
    result.observationTime = new Date().toISOString();
  }

  const windMatch = trimmed.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (windMatch) {
    if (windMatch[1] !== 'VRB') result.windDirection = parseInt(windMatch[1]);
    result.windSpeed = parseInt(windMatch[2]);
    if (windMatch[3]) result.windGust = parseInt(windMatch[3]);
  }

  const visMatch = trimmed.match(/\b([PM])?(\d+)?\s*(\d+\/\d+)?\s*SM\b/);
  if (visMatch) {
    const prefix = visMatch[1];
    const wholePart = visMatch[2] ? parseInt(visMatch[2]) : 0;
    const fractionPart = visMatch[3];
    let visibility: number;
    if (fractionPart) {
      const [num, denom] = fractionPart.split('/').map(Number);
      visibility = wholePart + num / denom;
    } else {
      visibility = wholePart;
    }
    if (prefix === 'P') result.visibility = visibility || 6;
    else if (prefix === 'M') result.visibility = Math.max(0, visibility - 0.01);
    else result.visibility = visibility;
  }

  const tempMatch = trimmed.match(/\b(M?\d{2})\/(M?\d{2})\b/);
  if (tempMatch) {
    result.temperature = parseInt(tempMatch[1].replace('M', '-'));
    result.dewpoint = parseInt(tempMatch[2].replace('M', '-'));
  }

  const altMatch = trimmed.match(/\bA(\d{4})\b/);
  if (altMatch) result.altimeter = parseInt(altMatch[1]) / 100;

  const cloudPattern = /\b(FEW|SCT|BKN|OVC|CLR|SKC)(\d{3})?\b/g;
  let cloudMatch: RegExpExecArray | null;
  while ((cloudMatch = cloudPattern.exec(trimmed)) !== null) {
    const cover = cloudMatch[1];
    const base = cloudMatch[2] ? parseInt(cloudMatch[2]) * 100 : undefined;
    result.clouds!.push({ cover, base });
  }

  result.flightCategory = determineFlightCategory(result.visibility, result.clouds);

  return {
    raw: result.raw!,
    icao: result.icao,
    observationTime: result.observationTime!,
    temperature: result.temperature,
    dewpoint: result.dewpoint,
    windDirection: result.windDirection,
    windSpeed: result.windSpeed,
    windGust: result.windGust,
    visibility: result.visibility,
    altimeter: result.altimeter,
    flightCategory: result.flightCategory ?? 'UNKNOWN',
    clouds: result.clouds ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* Public fetchers                                                             */
/* -------------------------------------------------------------------------- */

async function fetchWithTimeout(url: string, ms: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: NOAA_HEADERS });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch METARs for many stations in a single NOAA call. NOAA's API accepts
 * comma-separated ICAO codes via `?ids=KATL,KORD,...` and returns one METAR
 * per line, which we route back to a Map keyed by ICAO.
 */
export async function fetchMetarsBulk(icaos: string[]): Promise<Map<string, MetarObservation>> {
  const results = new Map<string, MetarObservation>();
  const valid = icaos.map((i) => i.toUpperCase()).filter((i) => /^[A-Z]{4}$/.test(i));
  if (valid.length === 0) return results;

  const url = `${NOAA_METAR_BASE}?ids=${encodeURIComponent(valid.join(','))}&format=raw&taf=false`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    console.error('[aviation-noaa-service]', 'metar bulk fetch failed', error);
    captureError(error, 'aviation-noaa:fetchMetarsBulk', { stationCount: valid.length });
    return results;
  }

  if (!response.ok) {
    console.error('[aviation-noaa-service]', `NOAA METAR returned ${response.status}`);
    // A degraded-but-responding NOAA (429 rate limit, 5xx outage) returns an
    // empty Map just like a thrown error — surface it the same way.
    captureError(new Error(`NOAA METAR returned ${response.status}`), 'aviation-noaa:fetchMetarsBulk', {
      status: response.status,
      stationCount: valid.length,
    });
    return results;
  }

  const text = await response.text();
  for (const line of text.split('\n')) {
    const parsed = parseMetarRaw(line);
    if (parsed?.icao) results.set(parsed.icao, parsed);
  }

  return results;
}

function mapSeverity(hazard: unknown, severity: unknown): NoaaAlert['severity'] {
  // NOAA AWC has been seen to return non-string values (or omit the field
  // entirely) for these. The TS signature said `string` but at runtime the
  // `??` guard alone wasn't enough — `(123 ?? '').toLowerCase()` still
  // throws. Coerce both to string explicitly before lowercasing.
  const h = (typeof hazard === 'string' ? hazard : '').toLowerCase();
  const s = (typeof severity === 'string' ? severity : '').toLowerCase();
  if (h.includes('extreme') || s.includes('extreme')) return 'extreme';
  if (h.includes('severe') || s.includes('sev')) return 'severe';
  if (h.includes('moderate') || s.includes('mod')) return 'moderate';
  return 'low';
}

const HAZARD_MAP: Record<string, string> = {
  TURB: 'Turbulence',
  ICE: 'Icing',
  CONVECTIVE: 'Convective Activity',
  IFR: 'Instrument Flight Rules',
  MTN_OBSCN: 'Mountain Obscuration',
  ASH: 'Volcanic Ash',
  LLWS: 'Low-Level Wind Shear',
  'SFC WND': 'Surface Wind',
  MTW: 'Mountain Wave',
};

function formatHazard(hazard: string): string {
  const upper = hazard.toUpperCase().trim();
  return HAZARD_MAP[upper] ?? hazard.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * AWC returns validTimeFrom/To as unix **seconds**. `new Date(seconds)` treats
 * the value as milliseconds and collapses to 1970 — multiply seconds by 1000.
 * Also accept ISO strings for older fixtures.
 */
export function formatAwcTime(value: number | string | undefined | null): string {
  if (value == null || value === '') return '';
  try {
    let ms: number;
    if (typeof value === 'number') {
      ms = value < 1e12 ? value * 1000 : value;
    } else if (/^\d+(\.\d+)?$/.test(value.trim())) {
      const n = Number(value);
      ms = n < 1e12 ? n * 1000 : n;
    } else {
      ms = Date.parse(value);
    }
    if (Number.isNaN(ms)) return String(value);
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + 'Z';
  } catch {
    return String(value);
  }
}

export function awcAlertId(type: 'SIGMET' | 'AIRMET', alert: AWCAlert): string {
  const series = alert.seriesId || alert.airsigmetId || alert.alphaChar;
  if (series != null && String(series).length > 0) {
    return `${type.toLowerCase()}-${series}`;
  }
  const from = alert.validTimeFrom ?? 'unknown';
  return `${type.toLowerCase()}-${alert.icaoId || 'na'}-${from}`;
}

/**
 * Fetch active SIGMET + AIRMET advisories from NOAA. Mirrors the parsing in
 * /api/aviation/alerts/route.ts so the shape stays compatible.
 */
export async function fetchAviationAlertsFromNOAA(): Promise<NoaaAlert[]> {
  const [sigmetRes, airmetRes] = await Promise.allSettled([
    fetchWithTimeout(`${NOAA_AIRSIGMET}?format=json&type=sigmet`),
    fetchWithTimeout(`${NOAA_AIRSIGMET}?format=json&type=airmet`),
  ]);

  const alerts: NoaaAlert[] = [];

  async function consume(
    settled: PromiseSettledResult<Response>,
    type: 'SIGMET' | 'AIRMET',
    fallbackHi: number,
  ) {
    if (settled.status !== 'fulfilled' || !settled.value.ok) {
      // Our own fetchWithTimeout aborting a slow NOAA endpoint is expected
      // transient upstream noise, not a defect — the panel still degrades to
      // all-clear. Record a breadcrumb for context but don't open a Sentry
      // issue per timeout. Genuine failures (non-ok HTTP, network errors)
      // still surface as captured exceptions below.
      if (settled.status === 'rejected' && isAbortError(settled.reason)) {
        console.warn('[aviation-noaa-service]', `${type} fetch timed out after ${DEFAULT_TIMEOUT_MS}ms`);
        captureUpstreamTimeout(`NOAA ${type} fetch timed out`, { type, timeoutMs: DEFAULT_TIMEOUT_MS });
        return;
      }
      // A dead/erroring AWC endpoint here means an all-clear aviation panel.
      // Surface it instead of dropping the result silently.
      const reason = settled.status === 'rejected'
        ? (settled.reason instanceof Error ? settled.reason.message : String(settled.reason))
        : `HTTP ${settled.value.status}`;
      console.error('[aviation-noaa-service]', `${type} fetch failed`, reason);
      captureError(new Error(`NOAA ${type} fetch failed: ${reason}`), 'aviation-noaa:fetchAviationAlerts', { type });
      return;
    }
    try {
      const data = (await settled.value.json()) as AWCAlert[];
      if (!Array.isArray(data)) return;
      for (const alert of data.slice(0, 10)) {
        // AWC has returned non-string hazard values; coerce before formatHazard.
        const safeHazard = String(alert.hazard ?? 'Unknown');
        const formattedHazard = formatHazard(safeHazard);
        alerts.push({
          id: awcAlertId(type, alert),
          type,
          severity: mapSeverity(safeHazard, String(alert.severity ?? '')),
          hazard: formattedHazard,
          region: alert.icaoId ?? 'CONUS',
          validFrom: formatAwcTime(alert.validTimeFrom),
          validTo: formatAwcTime(alert.validTimeTo),
          text: `${formattedHazard} from FL${alert.altitudeLow1 || 0} to FL${alert.altitudeHi1 || fallbackHi}`,
          rawText: alert.rawAirSigmet ?? '',
        });
      }
    } catch (error) {
      console.error('[aviation-noaa-service]', `${type} parse failed`, error);
      // A parse failure usually means NOAA changed the AWC response shape.
      captureError(error, 'aviation-noaa:parseAviationAlerts', { type });
    }
  }

  await consume(sigmetRes, 'SIGMET', 450);
  await consume(airmetRes, 'AIRMET', 180);

  const order = { extreme: 0, severe: 1, moderate: 2, low: 3 } as const;
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return alerts;
}
