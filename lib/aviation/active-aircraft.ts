/**
 * ADS-B feeds include parked / gate aircraft with transmitters on.
 * They are not airline "scheduled" flights — those never appear on ADS-B.
 * Keep airborne traffic plus takeoff-roll / early-climb candidates.
 */

import type { Aircraft } from './aircraft-types';

/** Minimum groundspeed (kt) to treat as takeoff roll / departure. */
export const DEPARTURE_MIN_GS_KT = 40;

/** Minimum altitude (ft) to treat as airborne when not marked on-ground. */
export const AIRBORNE_MIN_ALT_FT = 200;

/**
 * True when the aircraft should appear on the live sky map.
 * Excludes parked / idle ground traffic; keeps taxi-to-takeoff and in-flight.
 */
export function isActiveFlight(aircraft: Aircraft): boolean {
  const gs = aircraft.groundSpeedKt ?? 0;

  // Explicit ADS-B "ground" — only keep if clearly rolling for departure.
  if (aircraft.onGround) {
    return gs >= DEPARTURE_MIN_GS_KT;
  }

  const alt = aircraft.altitudeFt;
  if (alt != null && alt >= AIRBORNE_MIN_ALT_FT) return true;
  if (gs >= DEPARTURE_MIN_GS_KT) return true;

  return false;
}

export function filterActiveFlights(aircraft: Aircraft[]): Aircraft[] {
  return aircraft.filter(isActiveFlight);
}
