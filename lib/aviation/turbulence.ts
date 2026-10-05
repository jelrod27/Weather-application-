/** Normalized AWC JSON G-AIRMET advisories, not a continuous turbulence field. */
export type TurbulenceSeverity = 'smooth' | 'light' | 'moderate' | 'severe' | 'extreme' | 'unknown';

export interface TurbulencePolygon {
  id: string;
  coordinates: number[][][];
  severity: TurbulenceSeverity;
  rawSeverity: string;
  hazard: string;
  forecastHour: number;
  issuedAt: string | null;
  /** A source-defined snapshot, not the beginning of continuous coverage. */
  validFrom: string;
  /** Product expiry; not a promise of conditions between snapshots. */
  validTo: string;
  topFt: number | null;
  baseFt: number | null;
}

export interface TurbulenceData {
  polygons: TurbulencePolygon[];
  fetchedAt: string;
  source: 'NOAA AWC G-AIRMET';
  coverage: 'CONUS';
  status: 'available' | 'empty' | 'partial' | 'stale';
  rejectedRecords: number;
  unavailableForecastHours: number[];
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function finite(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  // AWC JSON numeric timestamps are Unix seconds; ISO fields include a zone.
  const numeric = finite(value);
  const millis = numeric !== null ? numeric * 1000
    : typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  return Number.isFinite(millis) && Math.abs(millis) <= 8.64e15 ? new Date(millis).toISOString() : null;
}

function altitude(value: unknown): number | null {
  if (value === 'SFC') return 0;
  const level = finite(value);
  return level !== null && level >= 0 && level <= 1000 ? level * 100 : null;
}

function severity(raw: string): TurbulenceSeverity {
  const value = raw.toUpperCase();
  if (/EXTRM|EXTREME/.test(value)) return 'extreme';
  if (value.includes('SEV')) return 'severe';
  if (value.includes('MOD')) return 'moderate';
  if (/LGT|LIGHT/.test(value)) return 'light';
  // Missing/unrecognized values must never imply smooth conditions.
  return 'unknown';
}

/** Accept only the documented flat JSON contract requested by the service. */
export function parseGairmetJson(raw: unknown): { polygons: TurbulencePolygon[]; rejectedRecords: number } {
  if (!Array.isArray(raw)) throw new Error('Unrecognized G-AIRMET response');
  const polygons: TurbulencePolygon[] = [];
  let rejectedRecords = 0;
  for (const value of raw) {
    const item = record(value);
    // TANGO also contains wind shear/surface winds; they are separate hazards.
    if (typeof item?.hazard === 'string' && ['LLWS', 'SFC_WIND'].includes(item.hazard)) continue;
    const ring: number[][] = [];
    if (item && Array.isArray(item.coords)) {
      for (const point of item.coords) {
        const coord = record(point);
        const lat = finite(coord?.lat);
        const lon = finite(coord?.lon);
        if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) break;
        ring.push([lon, lat]);
      }
    }
    const validFrom = timestamp(item?.validTime);
    const validTo = timestamp(item?.expireTime);
    const forecastHour = finite(item?.forecastHour);
    const distinct = new Set(ring.map(point => point.join(','))).size;
    if (!item || !Array.isArray(item.coords) || ring.length !== item.coords.length || distinct < 3
      || !validFrom || !validTo
      || forecastHour === null || forecastHour < 0 || forecastHour > 12 || forecastHour % 3 !== 0
      || typeof item.hazard !== 'string' || !item.hazard.startsWith('TURB')) {
      rejectedRecords++;
      continue;
    }
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push([...ring[0]]);
    const rawSeverity = typeof item.severity === 'string' ? item.severity : '';
    polygons.push({
      id: `gairmet-${String(item.tag ?? 'area')}-${validFrom}-${polygons.length}`,
      coordinates: [ring],
      severity: severity(rawSeverity), rawSeverity, hazard: item.hazard, forecastHour,
      issuedAt: timestamp(item.issueTime), validFrom, validTo,
      topFt: altitude(item.top), baseFt: altitude(item.base),
    });
  }
  if (rejectedRecords > 0 && polygons.length === 0) throw new Error('No valid G-AIRMET records in nonempty response');
  return { polygons, rejectedRecords };
}

export function selectTurbulenceAdvisories(
  polygons: TurbulencePolygon[], validTime: string, altitudeFt: number | null, now: number,
): TurbulencePolygon[] {
  return polygons.filter(polygon => polygon.validFrom === validTime && Date.parse(polygon.validTo) > now
    && (altitudeFt === null || (polygon.baseFt !== null && polygon.topFt !== null
      && polygon.baseFt <= altitudeFt && polygon.topFt >= altitudeFt)));
}

export function formatTurbulenceAltitude(feet: number | null): string {
  if (feet === null) return 'Not reported';
  return feet === 0 ? 'Surface' : `${feet.toLocaleString('en-US')} ft`;
}
