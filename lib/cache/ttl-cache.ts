/**
 * One in-memory TTL cache.
 *
 * Ten module-scope `Map`s across routes and services each re-derived expiry,
 * sweeping, and — in one case — LRU eviction and request coalescing, with
 * different bugs available in each: one swept on every request regardless of
 * hit or miss, one only on a miss, one not at all. flight-lookup-service had to
 * export `_resetCacheForTests` because its Map was a module singleton with no
 * seam.
 *
 * Everything those caches did lives here: freshness, a stale-fallback window,
 * a size bound, single-flight loading, and an injectable clock so a test can
 * advance time instead of waiting.
 */

export interface TtlCacheOptions {
  /** How long a stored entry is considered fresh. */
  ttlMs: number;
  /**
   * Extra window past `ttlMs` during which `getStale` still returns the entry.
   * Serves the "upstream is down or rate-limiting us, use what we have"
   * fallback. Defaults to 0 — expired means gone.
   */
  staleMs?: number;
  /**
   * Hard entry bound. When exceeded, the entries stored longest ago are
   * evicted first. Omit for an unbounded cache — required where eviction
   * would be a correctness or security problem, e.g. a rate-limit store,
   * where flooding distinct keys must not evict an active limit.
   */
  maxEntries?: number;
  /** Injectable clock. Defaults to `Date.now`. */
  now?: () => number;
}

interface Entry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

export interface TtlCache<T> {
  /** The value if it is still fresh, else undefined. */
  get(key: string): T | undefined;
  /** The value if it is fresh OR within the stale window, else undefined. */
  getStale(key: string): T | undefined;
  /** Stores a value, optionally overriding the cache's TTL. Returns the value. */
  set(key: string, value: T, ttlMs?: number): T;
  delete(key: string): boolean;
  clear(): void;
  readonly size: number;
  /**
   * Returns the fresh value, or runs `loader` and stores the result.
   * Concurrent misses for the same key share one loader call, so N callers
   * arriving together produce one upstream request.
   *
   * A rejected load is not cached, and the rejection propagates to every
   * caller waiting on it.
   */
  load(key: string, loader: () => Promise<T>, ttlMs?: number): Promise<T>;
}

export function createTtlCache<T>(options: TtlCacheOptions): TtlCache<T> {
  const { ttlMs, staleMs = 0, maxEntries } = options;
  const now = options.now ?? Date.now;

  const entries = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  const isFresh = (entry: Entry<T>, at: number): boolean => at <= entry.expiresAt;
  const isUsable = (entry: Entry<T>, at: number): boolean => at <= entry.expiresAt + staleMs;

  /** Drops entries past their stale window, then enforces the size bound. */
  const prune = (): void => {
    const at = now();
    for (const [key, entry] of entries) {
      if (!isUsable(entry, at)) entries.delete(key);
    }

    if (maxEntries === undefined) return;
    while (entries.size > maxEntries) {
      let oldestKey: string | null = null;
      let oldestStoredAt = Number.POSITIVE_INFINITY;
      for (const [key, entry] of entries) {
        if (entry.storedAt < oldestStoredAt) {
          oldestStoredAt = entry.storedAt;
          oldestKey = key;
        }
      }
      if (oldestKey === null) break;
      entries.delete(oldestKey);
    }
  };

  const setEntry = (key: string, value: T, overrideTtlMs?: number): T => {
    const storedAt = now();
    entries.set(key, {
      value,
      storedAt,
      expiresAt: storedAt + (overrideTtlMs ?? ttlMs),
    });
    prune();
    return value;
  };

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      const at = now();
      if (isFresh(entry, at)) return entry.value;
      if (!isUsable(entry, at)) entries.delete(key);
      return undefined;
    },

    getStale(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      const at = now();
      if (isUsable(entry, at)) return entry.value;
      entries.delete(key);
      return undefined;
    },

    set: setEntry,

    delete: (key) => entries.delete(key),

    clear() {
      entries.clear();
      inFlight.clear();
    },

    get size() {
      return entries.size;
    },

    async load(key, loader, overrideTtlMs) {
      const entry = entries.get(key);
      if (entry && isFresh(entry, now())) return entry.value;

      const pending = inFlight.get(key);
      if (pending) return pending;

      const promise = loader()
        .then((value) => setEntry(key, value, overrideTtlMs))
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, promise);
      return promise;
    },
  };
}
