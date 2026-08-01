'use client'

/**
 * Loading remote data into a client surface, in one module.
 *
 * 31 files hand-rolled the same useEffect + fetch + loading/error/data triad and
 * only 11 of them used an AbortController, so on a fast location change or tab
 * switch a stale response could overwrite a fresher one. Polling was 24 separate
 * `setInterval`s, and caching was three unrelated ad hoc shapes (a module-scope
 * Map, a localStorage TTL blob, or nothing).
 *
 * Cancellation and staleness are not opt-in here: a response is applied only if
 * it belongs to the newest load for the current key.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createTtlCache, type TtlCache } from '@/lib/cache/ttl-cache'

export interface RemoteDataState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  /** Last successful load, epoch ms. Null until one succeeds. */
  updatedAt: number | null
  /** Force a reload, bypassing the cache. */
  refresh: () => void
}

export interface RemoteDataOptions<T> {
  /**
   * Identity of the request. A null key disables loading and clears state —
   * the "we don't have coordinates yet" case every one of these surfaces has.
   * Changing the key cancels any in-flight load.
   */
  key: string | null
  /** Performs the request. Must pass `signal` to fetch so cancellation works. */
  fetcher: (signal: AbortSignal) => Promise<T>
  /** Poll interval in ms. Paused while the document is hidden. */
  refreshMs?: number
  /** Retries after a failure, with linear backoff. Default 0. */
  retry?: number
  /** Base backoff in ms between retries. Default 500. */
  retryDelayMs?: number
  /** Cache successful results across mounts for this long. Default: no cache. */
  cacheTtlMs?: number
  /** Keep the previous value visible while a new key loads. Default false. */
  keepPreviousData?: boolean
}

/** Caches are per-scope so unrelated surfaces cannot collide on a key. */
const scopedCaches = new Map<number, TtlCache<unknown>>()

function cacheFor(ttlMs: number): TtlCache<unknown> {
  let cache = scopedCaches.get(ttlMs)
  if (!cache) {
    cache = createTtlCache<unknown>({ ttlMs, maxEntries: 200 })
    scopedCaches.set(ttlMs, cache)
  }
  return cache
}

export function useRemoteData<T>(options: RemoteDataOptions<T>): RemoteDataState<T> {
  const {
    key,
    fetcher,
    refreshMs,
    retry = 0,
    retryDelayMs = 500,
    cacheTtlMs,
    keepPreviousData = false,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  // The fetcher is usually an inline closure, so keeping it in a ref stops a new
  // identity on every render from restarting the load.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Monotonic load id: only the newest load for the current key may write state.
  const loadIdRef = useRef(0)
  const [reloadToken, setReloadToken] = useState(0)

  // One-shot, not "reloadToken > 0": the token never resets, so testing it would
  // skip the cache read for every later load — including loads for a different
  // key — leaving a cache that is written but never read.
  const bypassCacheRef = useRef(false)

  const refresh = useCallback(() => {
    bypassCacheRef.current = true
    setReloadToken((n) => n + 1)
  }, [])

  useEffect(() => {
    if (key === null) {
      loadIdRef.current += 1
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const loadId = ++loadIdRef.current
    const controller = new AbortController()
    const isCurrent = () => loadId === loadIdRef.current && !controller.signal.aborted

    const cache = cacheTtlMs ? cacheFor(cacheTtlMs) : null
    const bypassCache = bypassCacheRef.current
    bypassCacheRef.current = false
    const cached = bypassCache ? undefined : (cache?.get(key) as T | undefined)

    if (cached !== undefined) {
      setData(cached)
      setError(null)
      setIsLoading(false)
      return
    }

    if (!keepPreviousData) setData(null)
    setError(null)
    setIsLoading(true)

    const run = async (): Promise<void> => {
      for (let attempt = 0; attempt <= retry; attempt++) {
        try {
          const result = await fetcherRef.current(controller.signal)
          if (!isCurrent()) return

          cache?.set(key, result)
          setData(result)
          setError(null)
          setUpdatedAt(Date.now())
          setIsLoading(false)
          return
        } catch (err) {
          if (isAbort(err) || !isCurrent()) return

          if (attempt === retry) {
            setError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
            return
          }

          await sleep(retryDelayMs * (attempt + 1), controller.signal)
          if (!isCurrent()) return
        }
      }
    }

    void run()

    return () => controller.abort()
  }, [key, reloadToken, retry, retryDelayMs, cacheTtlMs, keepPreviousData])

  // Polling. Paused while hidden so a backgrounded tab stops burning requests,
  // and refreshed immediately when it becomes visible again.
  useEffect(() => {
    if (key === null || !refreshMs) return

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      refresh()
    }

    const timer = setInterval(tick, refreshMs)
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key, refreshMs, refresh])

  return { data, error, isLoading, updatedAt, refresh }
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}
