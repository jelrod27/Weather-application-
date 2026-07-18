/**
 * Host-allowlisted fetch for ADS-B / standing-data upstreams.
 * Keeps user-influenced path segments from becoming open SSRF.
 */

import { fetchWithTimeout, type FetchWithTimeoutOptions } from '@/lib/fetch-with-timeout';

const ALLOWED_HOSTS = new Set([
  'api.adsb.lol',
  'api.airplanes.live',
  'opendata.adsb.fi',
  'vrs-standing-data.adsb.lol',
]);

/** ICAO/IATA-style callsigns only (blocks path injection). */
export function sanitizeCallsign(raw: string): string | null {
  const cs = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,12}$/.test(cs)) return null;
  return cs;
}

export async function fetchAviationUpstream(
  url: URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(`Blocked aviation upstream host: ${url.hostname}`);
  }
  return fetchWithTimeout(url, options);
}

export function aviationUrl(base: string, pathname: string): URL {
  const url = new URL(base);
  url.pathname = pathname;
  return url;
}
