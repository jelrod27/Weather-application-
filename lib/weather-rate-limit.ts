import { safeStorage } from '@/lib/safe-storage'

const RATE_LIMIT_KEY = 'weather-app-rate-limit'
export const MAX_REQUESTS_PER_HOUR = 60  // Increased from 10 to prevent blocking legitimate usage
const ONE_HOUR_MS = 60 * 60 * 1000

interface RateLimitData {
    requests: number[]
    lastReset: number
}

export interface RateLimitCheck {
    allowed: boolean
    remaining: number
    message?: string
}

function getRateLimitData(): RateLimitData {
    try {
        const raw = safeStorage.getItem(RATE_LIMIT_KEY)
        if (!raw) return { requests: [], lastReset: Date.now() }
        const parsed = JSON.parse(raw)
        return {
            requests: Array.isArray(parsed?.requests)
                ? parsed.requests.filter((t: unknown): t is number => typeof t === 'number' && Number.isFinite(t))
                : [],
            lastReset: typeof parsed?.lastReset === 'number' && Number.isFinite(parsed.lastReset)
                ? parsed.lastReset
                : Date.now(),
        }
    } catch (error) {
        console.warn('Failed to get rate limit data:', error)
        return { requests: [], lastReset: Date.now() }
    }
}

function saveRateLimitData(data: RateLimitData): void {
    try {
        safeStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data))
    } catch (error) {
        console.warn('Failed to save rate limit data:', error)
    }
}

export function checkRateLimit(now: number = Date.now()): RateLimitCheck {
    let data = getRateLimitData()

    if (now - data.lastReset > ONE_HOUR_MS) {
        data = { requests: [], lastReset: now }
        saveRateLimitData(data)
    }

    const recentRequests = data.requests.filter((timestamp: number) => now - timestamp < ONE_HOUR_MS)
    const remaining = MAX_REQUESTS_PER_HOUR - recentRequests.length

    if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
        const oldestRequest = Math.min(...recentRequests)
        const waitTime = Math.ceil((ONE_HOUR_MS - (now - oldestRequest)) / 1000 / 60)
        return {
            allowed: false,
            remaining: 0,
            message: `Too many requests. Please wait ${waitTime} minutes before searching again.`
        }
    }

    return { allowed: true, remaining }
}

export function recordRateLimitedRequest(now: number = Date.now()): RateLimitCheck {
    let data = getRateLimitData()
    if (now - data.lastReset > ONE_HOUR_MS) {
        data = { requests: [], lastReset: now }
    }
    data.requests.push(now)
    data.requests = data.requests.filter((timestamp: number) => now - timestamp < ONE_HOUR_MS)
    saveRateLimitData(data)
    return checkRateLimit(now)
}
