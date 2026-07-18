/**
 * ADS-B includes parked / gate aircraft and slow taxi traffic.
 * FlightAware-style sky maps show airborne + runway (high-speed ground) only.
 * Airline "filed / scheduled" flights never appear on ADS-B until they broadcast.
 */

import type { Aircraft } from './aircraft-types';

/** Runway takeoff / landing roll. */
export const RUNWAY_MIN_GS_KT = 45;

/** Minimum groundspeed for airborne traffic (filters parked with bad altitude). */
export const AIRBORNE_MIN_GS_KT = 50;

/** Minimum altitude (ft) for airborne when not marked on-ground. */
export const AIRBORNE_MIN_ALT_FT = 200;

/**
 * True when the aircraft should appear on the live sky map.
 * - In air: not on-ground, alt ≥ 200 ft, groundspeed ≥ 50 kt
 * - On runway: on-ground with groundspeed ≥ 45 kt (takeoff/landing roll)
 */
export function isActiveFlight(aircraft: Aircraft): boolean {
  const gs = aircraft.groundSpeedKt ?? 0;

  if (aircraft.onGround) {
    return gs >= RUNWAY_MIN_GS_KT;
  }

  const alt = aircraft.altitudeFt;
  if (alt == null || alt < AIRBORNE_MIN_ALT_FT) return false;
  return gs >= AIRBORNE_MIN_GS_KT;
}

export function filterActiveFlights(aircraft: Aircraft[]): Aircraft[] {
  return aircraft.filter(isActiveFlight);
}
