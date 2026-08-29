/**
 * Tiny p-limit-style pool: at most `concurrency` tasks in flight.
 * No extra dependency — used for account/guest iteration in the severe monitor.
 */
export const SEVERE_MONITOR_CONCURRENCY = 8

export async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return

  const limit = Math.max(1, Math.min(Math.floor(concurrency), items.length))
  let next = 0

  const workers = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const item = items[next]
      next += 1
      if (item === undefined) break
      await fn(item)
    }
  })

  await Promise.all(workers)
}
