/**
 * 16-Bit Weather Platform - Weather API Rate Limiter
 * 
 * Implements per-user and per-IP rate limiting for weather API endpoints.
 * Features:
 * - Prefer Supabase user ID when authenticated
 * - Fallback to IP address from x-forwarded-for header
 * - Dual window: 120 req/hour + 30 req/5min burst
 * - Returns 429 with Retry-After header when exceeded
 * 
 * Environment variables for tuning:
 * - WEATHER_RATE_LIMIT_HOURLY: Requests per hour (default: 120)
 * - WEATHER_RATE_LIMIT_BURST: Requests per burst window (default: 30)
 * - WEATHER_RATE_LIMIT_BURST_WINDOW_MS: Burst window in ms (default: 300000 = 5 min)
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';

// Helper to safely parse env integers with validation
function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

// Rate limit configuration from env vars with sensible defaults
const HOURLY_LIMIT = parseEnvInt(process.env.WEATHER_RATE_LIMIT_HOURLY, 120);
const BURST_LIMIT = parseEnvInt(process.env.WEATHER_RATE_LIMIT_BURST, 30);
const BURST_WINDOW_MS = parseEnvInt(process.env.WEATHER_RATE_LIMIT_BURST_WINDOW_MS, 300000); // 5 minutes
const HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limit stores
interface RateLimitEntry {
  count: number;
  resetTime: number;
  burstCount: number;
  burstResetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  burstRemaining: number;
  burstResetTime: number;
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
 * Check rate limit for a client identifier
 * Implements dual window: hourly + burst
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window or expired - create fresh entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + HOURLY_WINDOW_MS,
      burstCount: 1,
      burstResetTime: now + BURST_WINDOW_MS,
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      allowed: true,
      remaining: HOURLY_LIMIT - 1,
      resetTime: newEntry.resetTime,
      burstRemaining: BURST_LIMIT - 1,
      burstResetTime: newEntry.burstResetTime,
    };
  }

  // Check if burst window has reset
  if (now > entry.burstResetTime) {
    entry.burstCount = 0;
    entry.burstResetTime = now + BURST_WINDOW_MS;
  }

  // Check burst limit first (more restrictive)
  if (entry.burstCount >= BURST_LIMIT) {
    return {
      allowed: false,
      remaining: Math.max(0, HOURLY_LIMIT - entry.count),
      resetTime: entry.resetTime,
      burstRemaining: 0,
      burstResetTime: entry.burstResetTime,
    };
  }

  // Check hourly limit
  if (entry.count >= HOURLY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      burstRemaining: Math.max(0, BURST_LIMIT - entry.burstCount),
      burstResetTime: entry.burstResetTime,
    };
  }

  // Increment counters
  entry.count++;
  entry.burstCount++;

  return {
    allowed: true,
    remaining: HOURLY_LIMIT - entry.count,
    resetTime: entry.resetTime,
    burstRemaining: BURST_LIMIT - entry.burstCount,
    burstResetTime: entry.burstResetTime,
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
      limit: HOURLY_LIMIT,
      remaining: result.remaining,
      burstLimit: BURST_LIMIT,
      burstRemaining: result.burstRemaining,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(effectiveRetryAfter),
        'X-RateLimit-Limit': String(HOURLY_LIMIT),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        'X-RateLimit-Burst-Limit': String(BURST_LIMIT),
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
export async function rateLimitRequest(request: NextRequest): Promise<
  | { allowed: true; result: RateLimitResult; headers: Record<string, string> }
  | { allowed: false; response: NextResponse }
> {
  try {
    const identifier = await getClientIdentifier(request);
    const result = checkRateLimit(identifier);

    if (!result.allowed) {
      return { allowed: false, response: createRateLimitResponse(result) };
    }

    return {
      allowed: true,
      result,
      headers: {
        'X-RateLimit-Limit': String(HOURLY_LIMIT),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        'X-RateLimit-Burst-Limit': String(BURST_LIMIT),
        'X-RateLimit-Burst-Remaining': String(result.burstRemaining),
        'X-RateLimit-Burst-Reset': String(Math.ceil(result.burstResetTime / 1000)),
      },
    };
  } catch (error) {
    // Fail open: a limiter malfunction must never take a weather route down.
    // Some routes call this gate before entering their try/catch, so an
    // exception here would escape JSON error handling entirely.
    console.error('[weather-rate-limiter] Limiter failure, failing open:', error);
    const now = Date.now();
    return {
      allowed: true,
      result: {
        allowed: true,
        remaining: HOURLY_LIMIT,
        resetTime: now + HOURLY_WINDOW_MS,
        burstRemaining: BURST_LIMIT,
        burstResetTime: now + BURST_WINDOW_MS,
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
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    return {
      allowed: true,
      remaining: HOURLY_LIMIT,
      resetTime: now + HOURLY_WINDOW_MS,
      burstRemaining: BURST_LIMIT,
      burstResetTime: now + BURST_WINDOW_MS,
    };
  }

  if (now > entry.burstResetTime) {
    return {
      allowed: true,
      remaining: HOURLY_LIMIT - entry.count,
      resetTime: entry.resetTime,
      burstRemaining: BURST_LIMIT,
      burstResetTime: now + BURST_WINDOW_MS,
    };
  }

  return {
    allowed: entry.count < HOURLY_LIMIT && entry.burstCount < BURST_LIMIT,
    remaining: Math.max(0, HOURLY_LIMIT - entry.count),
    resetTime: entry.resetTime,
    burstRemaining: Math.max(0, BURST_LIMIT - entry.burstCount),
    burstResetTime: entry.burstResetTime,
  };
}
