import type { Aircraft, AircraftRaw, AircraftSource } from './aircraft-types';

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isOnGround(raw: AircraftRaw): boolean {
  if (raw.alt_baro === 'ground') return true;
  if (raw.alt_baro === 0) return true;
  return false;
}

function altitudeFt(raw: AircraftRaw): number | null {
  if (isOnGround(raw)) return 0;
  const baro = asFiniteNumber(raw.alt_baro);
  if (baro != null) return Math.round(baro);
  const geom = asFiniteNumber(raw.alt_geom);
  if (geom != null) return Math.round(geom);
  return null;
}

export function normalizeAircraft(
  raw: AircraftRaw,
  source: AircraftSource,
): Aircraft | null {
  const icao24 = asTrimmedString(raw.hex)?.toLowerCase();
  const lat = asFiniteNumber(raw.lat);
  const lon = asFiniteNumber(raw.lon);
  if (!icao24 || lat == null || lon == null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const seen = asFiniteNumber(raw.seen) ?? asFiniteNumber(raw.seen_pos);
  const onGround = isOnGround(raw);

  return {
    icao24,
    callsign: asTrimmedString(raw.flight)?.toUpperCase() ?? null,
    registration: asTrimmedString(raw.r)?.toUpperCase() ?? null,
    typeCode: asTrimmedString(raw.t)?.toUpperCase() ?? null,
    lat,
    lon,
    altitudeFt: altitudeFt(raw),
    onGround,
    groundSpeedKt: asFiniteNumber(raw.gs),
    trackDeg: asFiniteNumber(raw.track),
    verticalRateFpm: asFiniteNumber(raw.baro_rate),
    squawk: asTrimmedString(raw.squawk),
    seenSec: seen,
    source,
  };
}

export function normalizeAircraftList(
  rawList: unknown,
  source: AircraftSource,
): Aircraft[] {
  if (!Array.isArray(rawList)) return [];
  const out: Aircraft[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const aircraft = normalizeAircraft(item as AircraftRaw, source);
    if (aircraft) out.push(aircraft);
  }
  return out;
}
