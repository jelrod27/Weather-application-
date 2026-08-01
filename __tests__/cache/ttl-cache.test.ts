import { createTtlCache } from '@/lib/cache/ttl-cache';

/**
 * Time is injected, so these assert expiry, stale windows and eviction without
 * a single timer — the thing the ten hand-rolled Map caches could not do.
 */
function clock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('createTtlCache', () => {
  it('returns a fresh value and drops it once the TTL passes', () => {
    const c = clock();
    const cache = createTtlCache<string>({ ttlMs: 1000, now: c.now });

    cache.set('a', 'value');
    expect(cache.get('a')).toBe('value');

    c.advance(999);
    expect(cache.get('a')).toBe('value');

    c.advance(2);
    expect(cache.get('a')).toBeUndefined();
  });

  it('honors a per-entry TTL override', () => {
    const c = clock();
    const cache = createTtlCache<string>({ ttlMs: 1000, now: c.now });

    cache.set('short', 'x', 100);
    cache.set('long', 'y');

    c.advance(200);
    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('y');
  });

  it('serves an expired entry from the stale window but never from get', () => {
    const c = clock();
    const cache = createTtlCache<string>({ ttlMs: 1000, staleMs: 5000, now: c.now });

    cache.set('a', 'value');
    c.advance(2000);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.getStale('a')).toBe('value');

    c.advance(5000);
    expect(cache.getStale('a')).toBeUndefined();
  });

  it('does not keep a stale entry when no stale window is configured', () => {
    const c = clock();
    const cache = createTtlCache<string>({ ttlMs: 1000, now: c.now });
    cache.set('a', 'value');
    c.advance(1001);
    expect(cache.getStale('a')).toBeUndefined();
  });

  it('evicts the entries stored longest ago once maxEntries is exceeded', () => {
    const c = clock();
    const cache = createTtlCache<number>({ ttlMs: 60_000, maxEntries: 2, now: c.now });

    cache.set('first', 1);
    c.advance(10);
    cache.set('second', 2);
    c.advance(10);
    cache.set('third', 3);

    expect(cache.size).toBe(2);
    expect(cache.get('first')).toBeUndefined();
    expect(cache.get('second')).toBe(2);
    expect(cache.get('third')).toBe(3);
  });

  it('sweeps expired entries on every write when bounded', () => {
    const c = clock();
    const cache = createTtlCache<number>({ ttlMs: 100, maxEntries: 50, now: c.now });

    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);

    c.advance(500);
    cache.set('c', 3);
    expect(cache.size).toBe(1);
  });

  it('defers the sweep on an unbounded cache instead of rescanning every write', () => {
    // An unbounded store keyed by client identifier (the rate limiter) must not
    // pay an O(n) scan per write, or a flood of distinct keys becomes quadratic.
    const c = clock();
    const cache = createTtlCache<number>({ ttlMs: 100, now: c.now });

    cache.set('a', 1);
    c.advance(500);

    cache.set('b', 2);
    // 'a' has expired but has not been swept yet — writes stay O(1).
    expect(cache.size).toBe(2);
    // It is still never *served*, which is what matters for correctness.
    expect(cache.get('a')).toBeUndefined();

    c.advance(60_000);
    cache.set('c', 3);
    expect(cache.size).toBe(1);
  });

  it('stays unbounded when maxEntries is omitted', () => {
    const c = clock();
    const cache = createTtlCache<number>({ ttlMs: 60_000, now: c.now });
    for (let i = 0; i < 500; i++) cache.set(`k${i}`, i);
    expect(cache.size).toBe(500);
  });

  it('deletes and clears', () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);

    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('hands back the stored reference so callers can mutate an entry in place', () => {
    // The rate-limit store increments counters on the cached object.
    const cache = createTtlCache<{ count: number }>({ ttlMs: 1000 });
    cache.set('ip:1', { count: 1 });
    cache.get('ip:1')!.count += 1;
    expect(cache.get('ip:1')!.count).toBe(2);
  });
});

describe('TtlCache.load', () => {
  it('runs the loader once for concurrent misses on the same key', async () => {
    const cache = createTtlCache<string>({ ttlMs: 1000 });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      await Promise.resolve();
      return 'value';
    };

    const results = await Promise.all([
      cache.load('k', loader),
      cache.load('k', loader),
      cache.load('k', loader),
    ]);

    expect(results).toEqual(['value', 'value', 'value']);
    expect(calls).toBe(1);
  });

  it('does not call the loader when a fresh value is cached', async () => {
    const cache = createTtlCache<string>({ ttlMs: 1000 });
    cache.set('k', 'cached');
    const loader = jest.fn(async () => 'fresh');
    await expect(cache.load('k', loader)).resolves.toBe('cached');
    expect(loader).not.toHaveBeenCalled();
  });

  it('re-runs the loader after expiry', async () => {
    const c = clock();
    const cache = createTtlCache<number>({ ttlMs: 1000, now: c.now });
    let calls = 0;
    const loader = async () => ++calls;

    await cache.load('k', loader);
    await cache.load('k', loader);
    expect(calls).toBe(1);

    c.advance(1001);
    await cache.load('k', loader);
    expect(calls).toBe(2);
  });

  it('propagates a rejection to every waiter and caches nothing', async () => {
    const cache = createTtlCache<string>({ ttlMs: 1000 });
    const boom = new Error('upstream down');
    const loader = jest.fn(async () => {
      throw boom;
    });

    const a = cache.load('k', loader);
    const b = cache.load('k', loader);
    await expect(a).rejects.toThrow('upstream down');
    await expect(b).rejects.toThrow('upstream down');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.get('k')).toBeUndefined();

    // The failed key is not poisoned — a later load retries.
    await expect(cache.load('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('keeps a stale value available after a failed refresh', async () => {
    const c = clock();
    const cache = createTtlCache<string>({ ttlMs: 100, staleMs: 10_000, now: c.now });
    cache.set('k', 'old');
    c.advance(200);

    await expect(
      cache.load('k', async () => {
        throw new Error('upstream down');
      }),
    ).rejects.toThrow();

    expect(cache.getStale('k')).toBe('old');
  });
});
