/** @jest-environment node */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const realFetch = global.fetch
afterEach(() => { global.fetch = realFetch; jest.useRealTimers() })

it.each(['http', 'network'])('stops %s retry backoff at the caller deadline', async failure => {
  jest.useFakeTimers()
  const controller = new AbortController()
  let attempts = 0
  global.fetch = jest.fn(async () => {
    attempts++
    if (failure === 'network') throw new TypeError('fetch failed')
    return new Response(null, { status: 429, headers: { 'Retry-After': '5' } })
  })
  let settled = false
  const result = fetchWithTimeout('https://example.test/alerts', {
    signal: controller.signal, maxRetries: 1, baseBackoffMs: 1000,
  }).catch(error => { settled = true; return error })
  setTimeout(() => controller.abort(), 100)
  try {
    await jest.advanceTimersByTimeAsync(100)
    expect(settled).toBe(true)
    expect(await result).toMatchObject({ name: 'AbortError' })
    expect(attempts).toBe(1)
  } finally {
    await jest.advanceTimersByTimeAsync(10_000)
    await result
  }
})
