/** @jest-environment node */

import { verifyTurnstileToken } from '@/lib/security/turnstile'

describe('verifyTurnstileToken', () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY
  const originalFetch = global.fetch

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalSecret
    global.fetch = originalFetch
  })

  it('allows traffic when the secret is not configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    await expect(verifyTurnstileToken(undefined)).resolves.toBe(true)
  })

  it('rejects a missing token when the secret is set', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    await expect(verifyTurnstileToken(undefined)).resolves.toBe(false)
  })

  it('accepts a Cloudflare success response', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch

    await expect(verifyTurnstileToken('token-token-token')).resolves.toBe(true)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('treats a siteverify timeout as verification failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = jest.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
      const err = Object.assign(new Error('aborted'), { name: 'TimeoutError' })
      if (init?.signal) {
        init.signal.addEventListener('abort', () => undefined)
      }
      return Promise.reject(err)
    }) as unknown as typeof fetch

    await expect(verifyTurnstileToken('token-token-token')).resolves.toBe(false)
  })
})
