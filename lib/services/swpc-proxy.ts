/**
 * NOAA SWPC proxy helpers
 *
 * Centralizes the fetch boilerplate the space-weather routes used to hand-roll
 * (a per-route AbortController + setTimeout + a `16BitWeather/1.0` User-Agent).
 * Built on lib/fetch-with-timeout so every SWPC call shares one bounded-timeout,
 * retry-on-429/502/503 implementation instead of three divergent copies.
 */

import { fetchWithTimeout, type FetchWithTimeoutOptions } from '@/lib/fetch-with-timeout';

const SWPC_USER_AGENT = '16BitWeather/1.0';

/**
 * Raw fetch against a NOAA SWPC endpoint with a bounded timeout, retry on
 * 429/502/503, and the shared User-Agent. Returns the Response (never throws on
 * HTTP status) — use for callers that inspect `.ok` themselves, e.g. a
 * Promise.allSettled pair or a non-JSON (text/HTML directory) payload.
 */
export async function fetchSwpc(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  // Normalize to a Headers instance so any HeadersInit shape the caller passes
  // (plain object, Headers, or string[][]) is preserved when we add defaults.
  const headers = new Headers(options.headers);
  if (!headers.has('User-Agent')) headers.set('User-Agent', SWPC_USER_AGENT);

  return fetchWithTimeout(url, { ...options, headers });
}

/**
 * Fetch and parse JSON from a NOAA SWPC endpoint. If a cached response body is
 * malformed, retry once without Next's persistent cache so a truncated body is
 * not served repeatedly for the full revalidation window.
 */
export async function fetchSwpcJson<T = unknown>(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const requestOptions = { ...options, headers };
  const response = await fetchSwpc(url, requestOptions);
  if (!response.ok) throw new Error(`NOAA SWPC request failed: ${response.status}`);

  try {
    return await response.json() as T;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;

    const retryOptions: FetchWithTimeoutOptions = { ...requestOptions, cache: 'no-store' };
    delete retryOptions.next;
    const retry = await fetchSwpc(url, retryOptions);
    if (!retry.ok) throw new Error(`NOAA SWPC retry failed: ${retry.status}`);
    return await retry.json() as T;
  }
}
