/**
 * 16-Bit Weather Platform - Weather API Rate Limiter
 *
 * Per-user / per-IP dual window. Buckets are isolated so hub reads (alerts,
 * news) and account routes cannot starve city search.
 *
 * Weather defaults: 400/hour + 90/5min burst — one search fans out to
 * geocode + forecast + AQ + pollen (and often a second geocode). Env overrides
 * still apply to the weather bucket:
 * - WEATHER_RATE_LIMIT_HOURLY
 * - WEATHER_RATE_LIMIT_BURST
 * - WEATHER_RATE_LIMIT_BURST_WINDOW_MS
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { createTtlCache } from '@/lib/cache/ttl-cache';

export type RateLimitBucket = 'weather' | 'account' | 'content';

type BucketLimits = {
  hourly: number;
  burst: number;
  burstWindowMs: number;
};

function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_BURST_WINDOW_MS = parseEnvInt(
  process.env.WEATHER_RATE_LIMIT_BURST_WINDOW_MS,
  300000,
);

const BUCKET_LIMITS: Record<RateLimitBucket, BucketLimits> = {
  weather: {
    hourly: parseEnvInt(process.env.WEATHER_RATE_LIMIT_HOURLY, 400),
    burst: parseEnvInt(process.env.WEATHER_RATE_LIMIT_BURST, 90),
    burstWindowMs: DEFAULT_BURST_WINDOW_MS,
  },
  account: { hourly: 240, burst: 60, burstWindowMs: DEFAULT_BURST_WINDOW_MS },
  content: { hourly: 180, burst: 40, burstWindowMs: DEFAULT_BURST_WINDOW_MS },
};

function limitsFor(bucket: RateLimitBucket = 'weather'): BucketLimits {
  return BUCKET_LIMITS[bucket] ?? BUCKET_LIMITS.weather;
}

// In-memory rate limit stores
interface RateLimitEntry {
  count: number;
  resetTime: number;
  burstCount: number;
  burstResetTime: number;
}

/**
 * An entry's lifetime IS the hourly window, so the cache's expiry replaces the
 * old `now > entry.resetTime` check and expired entries are swept on write —
 * no import-time `setInterval`, which started a real timer in every test that
 * imported this module.
 *
 * Deliberately unbounded: evicting under a size cap would let a flood of
 * distinct identifiers push out an active limit and reset someone's quota.
 */
const rateLimitStore = createTtlCache<RateLimitEntry>({ ttlMs: HOURLY_WINDOW_MS });

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  burstRemaining: number;
  burstResetTime: number;
  limit: number;
  burstLimit: number;
}

/**
 * Extract client identifier from request
 * Priority: Supabase user ID > x-forwarded-for IP > x-real-ip > 'anonymous'
 */
export async function getClientIdentifier(request: NextRequest): Promise<string> {
  // Try to get authenticated user first
  try {
    const user = await getServerUser();
    if (user?.id) {
      return `user:${user.id}`;
    }
  } catch {
    // Supabase not configured or error - fall through to IP
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'anonymous';
  
  return `ip:${ip}`;
}

/**
 * Check rate limit for a client identifier.
 * Buckets are isolated: weather search cannot be starved by alerts/news.
 */
export function checkRateLimit(
  identifier: string,
  bucket: RateLimitBucket = 'weather',
): RateLimitResult {
  const { hourly: hourlyLimit, burst: burstLimit, burstWindowMs } = limitsFor(bucket);
  const now = Date.now();
  const storeKey = `${bucket}:${identifier}`;
  const entry = rateLimitStore.get(storeKey);

  if (!entry) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + HOURLY_WINDOW_MS,
      burstCount: 1,
      burstResetTime: now + burstWindowMs,
    };
    rateLimitStore.set(storeKey, newEntry);

    return {
      allowed: true,
      remaining: hourlyLimit - 1,
      resetTime: newEntry.resetTime,
      burstRemaining: burstLimit - 1,
      burstResetTime: newEntry.burstResetTime,
      limit: hourlyLimit,
      burstLimit,
    };
  }

  if (now > entry.burstResetTime) {
    entry.burstCount = 0;
    entry.burstResetTime = now + burstWindowMs;
  }

  if (entry.burstCount >= burstLimit) {
    return {
      allowed: false,
      remaining: Math.max(0, hourlyLimit - entry.count),
      resetTime: entry.resetTime,
      burstRemaining: 0,
      burstResetTime: entry.burstResetTime,
      limit: hourlyLimit,
      burstLimit,
    };
  }

  if (entry.count >= hourlyLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      burstRemaining: Math.max(0, burstLimit - entry.burstCount),
      burstResetTime: entry.burstResetTime,
      limit: hourlyLimit,
      burstLimit,
    };
  }

  entry.count++;
  entry.burstCount++;

  return {
    allowed: true,
    remaining: hourlyLimit - entry.count,
    resetTime: entry.resetTime,
    burstRemaining: burstLimit - entry.burstCount,
    burstResetTime: entry.burstResetTime,
    limit: hourlyLimit,
    burstLimit,
  };
}

/**
 * Create a 429 Too Many Requests response with Retry-After header
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.burstResetTime - Date.now()) / 1000);
  const hourlyRetryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
  const effectiveRetryAfter = result.burstRemaining === 0 ? retryAfter : hourlyRetryAfter;

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Try again in ${effectiveRetryAfter} seconds.`,
      retryAfter: effectiveRetryAfter,
      limit: result.limit,
      remaining: result.remaining,
      burstLimit: result.burstLimit,
      burstRemaining: result.burstRemaining,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(effectiveRetryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        'X-RateLimit-Burst-Limit': String(result.burstLimit),
        'X-RateLimit-Burst-Remaining': String(result.burstRemaining),
        'X-RateLimit-Burst-Reset': String(Math.ceil(result.burstResetTime / 1000)),
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * Main rate limiting wrapper for weather API routes
 * Usage: Call this at the start of your route handler
 */
export async function rateLimitRequest(
  request: NextRequest,
  bucket: RateLimitBucket = 'weather',
): Promise<
  | { allowed: true; result: RateLimitResult; headers: Record<string, string> }
  | { allowed: false; response: NextResponse }
> {
  try {
    const identifier = await getClientIdentifier(request);
    const result = checkRateLimit(identifier, bucket);

    if (!result.allowed) {
      return { allowed: false, response: createRateLimitResponse(result) };
    }

    return {
      allowed: true,
      result,
      headers: {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        'X-RateLimit-Burst-Limit': String(result.burstLimit),
        'X-RateLimit-Burst-Remaining': String(result.burstRemaining),
        'X-RateLimit-Burst-Reset': String(Math.ceil(result.burstResetTime / 1000)),
      },
    };
  } catch (error) {
    console.error('[weather-rate-limiter] Limiter failure, failing open:', error);
    const now = Date.now();
    const { hourly: hourlyLimit, burst: burstLimit, burstWindowMs } = limitsFor(bucket);
    return {
      allowed: true,
      result: {
        allowed: true,
        remaining: hourlyLimit,
        resetTime: now + HOURLY_WINDOW_MS,
        burstRemaining: burstLimit,
        burstResetTime: now + burstWindowMs,
        limit: hourlyLimit,
        burstLimit,
      },
      headers: {},
    };
  }
}

/**
 * Get current rate limit status for a client (without consuming a request)
 * Note: Currently unused in production, kept for potential future use
 */
async function getRateLimitStatus(request: NextRequest): Promise<RateLimitResult> {
  const identifier = await getClientIdentifier(request);
  const { hourly: hourlyLimit, burst: burstLimit, burstWindowMs } = limitsFor('weather');
  const now = Date.now();
  const entry = rateLimitStore.get(`weather:${identifier}`);

  if (!entry) {
    return {
      allowed: true,
      remaining: hourlyLimit,
      resetTime: now + HOURLY_WINDOW_MS,
      burstRemaining: burstLimit,
      burstResetTime: now + burstWindowMs,
      limit: hourlyLimit,
      burstLimit,
    };
  }

  if (now > entry.burstResetTime) {
    return {
      allowed: true,
      remaining: hourlyLimit - entry.count,
      resetTime: entry.resetTime,
      burstRemaining: burstLimit,
      burstResetTime: now + burstWindowMs,
      limit: hourlyLimit,
      burstLimit,
    };
  }

  return {
    allowed: entry.count < hourlyLimit && entry.burstCount < burstLimit,
    remaining: Math.max(0, hourlyLimit - entry.count),
    resetTime: entry.resetTime,
    burstRemaining: Math.max(0, burstLimit - entry.burstCount),
    burstResetTime: entry.burstResetTime,
    limit: hourlyLimit,
    burstLimit,
  };
}
