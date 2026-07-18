/**
 * Normalized live aircraft types for ADS-B providers (adsb.lol family).
 */

export type AircraftSource = 'adsb.lol' | 'airplanes.live' | 'adsb.fi';

export type Aircraft = {
  icao24: string;
  callsign: string | null;
  registration: string | null;
  typeCode: string | null;
  lat: number;
  lon: number;
  altitudeFt: number | null;
  /** True when ADS-B reports alt_baro as "ground" (or 0). */
  onGround: boolean;
  groundSpeedKt: number | null;
  trackDeg: number | null;
  verticalRateFpm: number | null;
  squawk: string | null;
  seenSec: number | null;
  source: AircraftSource;
};

/** Raw aircraft object from adsb.lol / airplanes.live / adsb.fi v2 feeds. */
export type AircraftRaw = {
  hex?: unknown;
  flight?: unknown;
  r?: unknown;
  t?: unknown;
  lat?: unknown;
  lon?: unknown;
  alt_baro?: unknown;
  alt_geom?: unknown;
  gs?: unknown;
  track?: unknown;
  baro_rate?: unknown;
  squawk?: unknown;
  seen?: unknown;
  seen_pos?: unknown;
  [key: string]: unknown;
};

export type AircraftNearResponse = {
  aircraft: Aircraft[];
  source: AircraftSource;
  degraded: boolean;
  count: number;
  fetchedAt: number;
};

export const MAX_AIRCRAFT_RADIUS_NM = 250;
export const DEFAULT_AIRCRAFT_RADIUS_NM = 100;
