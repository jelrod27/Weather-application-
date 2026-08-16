/**
 * Short, no-retry fetch for supabase-js.
 *
 * A paused free-tier project hangs TCP instead of failing quickly. The shared
 * `fetchWithTimeout` helper retries 429/502/503 and network errors, which would
 * stretch a pause into a 25s+ hang. Public weather must not wait on that.
 */

export const SUPABASE_FETCH_TIMEOUT_MS = 2500

export function createSupabaseTimedFetch(
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const callerSignal = init?.signal
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal
    return fetch(input, { ...init, signal })
  }) as typeof fetch
}

export const supabaseTimedFetch = createSupabaseTimedFetch()
