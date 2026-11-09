/**
 * 16-Bit Weather Platform - Fetch with timeout and retry
 *
 * Hardened fetch wrapper for upstream API calls.
 * - Default 10s timeout via AbortSignal.timeout (caller can override)
 * - Exponential-backoff retry on 429, 502, 503 (caller can tune)
 * - Honors upstream Retry-After when the header is present on 429
 * - Always returns a Response (never throws for HTTP errors); only throws on
 *   network/abort after retries are exhausted, so callers can `response.ok`
 *   check as usual.
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Request timeout in ms. Default: 10_000. */
  timeoutMs?: number;
  /** Maximum retries on 429/502/503 or network error. Default: 2 (3 attempts total). */
  maxRetries?: number;
  /** Base backoff in ms; actual delay is base * 2^attempt, capped at maxBackoffMs. */
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

const RETRYABLE_STATUSES = new Set([429, 502, 503]);

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function backoffFor(attempt: number, base: number, max: number): number {
  const jitter = Math.random() * base; // 0..base of jitter
  return Math.min(max, base * 2 ** attempt + jitter);
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 10_000,
    maxRetries = 2,
    baseBackoffMs = 300,
    maxBackoffMs = 5_000,
    signal: externalSignal,
    ...rest
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    externalSignal?.throwIfAborted();
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, timeoutSignal])
      : timeoutSignal;

    try {
      const response = await fetch(input, { ...rest, signal });

      if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) {
        // Honor Retry-After on 429 when sane (<= maxBackoffMs)
        let wait = backoffFor(attempt, baseBackoffMs, maxBackoffMs);
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            const parsed = Number(retryAfter);
            if (Number.isFinite(parsed) && parsed > 0) {
              wait = Math.min(parsed * 1000, maxBackoffMs);
            }
          }
        }
        // Drain the discarded body so the socket can return to the pool
        // promptly instead of waiting on GC finalization.
        await response.body?.cancel?.().catch(() => {});
        await delay(wait, externalSignal);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      // Caller explicitly aborted — stop retrying so cleanup can happen fast.
      if (externalSignal?.aborted) break;
      if (attempt >= maxRetries) break;
      await delay(backoffFor(attempt, baseBackoffMs, maxBackoffMs), externalSignal);
    }
  }

  externalSignal?.throwIfAborted();
  throw lastError instanceof Error
    ? lastError
    : new Error('fetchWithTimeout: request failed');
}
