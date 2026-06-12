/**
 * Unit tests for lib/weather-rate-limit.ts
 * Seeds localStorage directly (same technique as the referee suite).
 */

import { checkRateLimit, recordRateLimitedRequest, MAX_REQUESTS_PER_HOUR } from '@/lib/weather-rate-limit'

const RATE_LIMIT_KEY = 'weather-app-rate-limit'
const ONE_HOUR_MS = 60 * 60 * 1000

beforeEach(() => {
    localStorage.clear()
})

describe('checkRateLimit', () => {
    it('allows requests when no prior requests exist', () => {
        const result = checkRateLimit()
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(MAX_REQUESTS_PER_HOUR)
        expect(result.message).toBeUndefined()
    })

    it('counts existing requests and returns correct remaining', () => {
        const now = Date.now()
        const data = {
            requests: [now - 1000, now - 2000, now - 3000],
            lastReset: now - 5000,
        }
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data))

        const result = checkRateLimit(now)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(MAX_REQUESTS_PER_HOUR - 3)
    })

    it('denies requests at the limit and returns a wait-time message', () => {
        const now = Date.now()
        // Oldest request is 30 minutes ago => wait time = 30 minutes
        const oldestRequest = now - 30 * 60 * 1000
        const requests = [oldestRequest]
        for (let i = 1; i < MAX_REQUESTS_PER_HOUR; i++) {
            requests.push(now - i * 1000)
        }
        const data = { requests, lastReset: now - ONE_HOUR_MS + 1000 }
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data))

        const result = checkRateLimit(now)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.message).toMatch(/Please wait \d+ minutes before searching again/)
    })

    it('resets the window and allows requests after 1 hour', () => {
        // All requests are older than 1 hour
        const now = Date.now()
        const oldTs = now - ONE_HOUR_MS - 1000
        const data = {
            requests: Array(MAX_REQUESTS_PER_HOUR).fill(oldTs),
            lastReset: oldTs,
        }
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data))

        const result = checkRateLimit(now)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(MAX_REQUESTS_PER_HOUR)
    })

    it('recovers gracefully from corrupted JSON in localStorage', () => {
        localStorage.setItem(RATE_LIMIT_KEY, 'not-json')
        const result = checkRateLimit()
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(MAX_REQUESTS_PER_HOUR)
    })
})

describe('recordRateLimitedRequest', () => {
    it('records a request and returns updated remaining count', () => {
        const result = recordRateLimitedRequest()
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(MAX_REQUESTS_PER_HOUR - 1)

        const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY)!)
        expect(stored.requests).toHaveLength(1)
    })

    it('returns denied state when at the limit', () => {
        const now = Date.now()
        const requests = Array.from({ length: MAX_REQUESTS_PER_HOUR - 1 }, (_, i) => now - i * 100)
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ requests, lastReset: now - 1000 }))

        const result = recordRateLimitedRequest(now)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
    })
})
