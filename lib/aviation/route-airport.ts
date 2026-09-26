import { findAirportByCode } from '@/lib/data/major-us-airports';

export interface RouteAirport {
  iata: string;
  icao: string;
  lat: number;
  lon: number;
}

/** Manual routes use the same hub catalog as weather briefs; flight lookup can supply other airports. */
export function resolveRouteAirport(code: string, flightAirport?: RouteAirport): RouteAirport | null {
  const normalized = code.trim().toUpperCase();
  const known = findAirportByCode(normalized);
  if (known) return known;
  if (!normalized || !flightAirport) return null;
  const matches = [flightAirport.icao, flightAirport.iata].some((value) => value.toUpperCase() === normalized);
  if (!matches || !Number.isFinite(flightAirport.lat) || !Number.isFinite(flightAirport.lon)
    || Math.abs(flightAirport.lat) > 90 || Math.abs(flightAirport.lon) > 180) return null;
  return flightAirport;
}
