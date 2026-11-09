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
 * malformed or fails the caller's observation validator, retry once without
 * Next's persistent cache. A valid JSON body can still contain stale data.
 * The recovery request is bounded to four seconds with no transport retries;
 * its payload must pass the same validator before it can be used.
 */
export async function fetchSwpcJson<T = unknown>(
  url: string,
  options: FetchWithTimeoutOptions = {},
  isUsable?: (payload: T) => boolean,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const requestOptions = { ...options, headers };
  const response = await fetchSwpc(url, requestOptions);
  if (!response.ok) throw new Error(`NOAA SWPC request failed: ${response.status}`);

  try {
    const payload = await response.json() as T;
    if (!isUsable || isUsable(payload)) return payload;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  const retryOptions: FetchWithTimeoutOptions = {
    ...requestOptions,
    cache: 'no-store',
    timeoutMs: Math.min(options.timeoutMs ?? 4_000, 4_000),
    maxRetries: 0,
  };
  delete retryOptions.next;
  const retry = await fetchSwpc(url, retryOptions);
  if (!retry.ok) throw new Error(`NOAA SWPC retry failed: ${retry.status}`);
  const payload = await retry.json() as T;
  if (isUsable && !isUsable(payload)) throw new Error('NOAA SWPC response contains no usable observations');
  return payload;
}
