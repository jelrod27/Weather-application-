/** @jest-environment node */

import {
  mapWithConcurrency,
  SEVERE_MONITOR_CONCURRENCY,
} from '@/lib/services/severe-alert-monitor-concurrency'

describe('mapWithConcurrency', () => {
  it('never runs more than the bound in parallel', async () => {
    let current = 0
    let max = 0
    const items = Array.from({ length: 20 }, (_, i) => i)

    await mapWithConcurrency(items, 6, async () => {
      current += 1
      max = Math.max(max, current)
      await new Promise((resolve) => setTimeout(resolve, 15))
      current -= 1
    })

    expect(max).toBe(6)
    expect(max).toBeLessThanOrEqual(SEVERE_MONITOR_CONCURRENCY)
  })

  it('resolves immediately for an empty list', async () => {
    const fn = jest.fn()
    await mapWithConcurrency([], 8, fn)
    expect(fn).not.toHaveBeenCalled()
  })
})
