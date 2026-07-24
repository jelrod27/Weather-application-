/**
 * Shared API route ceremony: rate-limit first, then run the handler.
 */

import type { NextRequest, NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'

export type RateLimitHeaders = Record<string, string>

export type ApiRouteContext = {
  request: NextRequest
  rateLimitHeaders: RateLimitHeaders
}

/**
 * Wrap a route handler with the standard rate-limit gate.
 * On deny, returns the limiter response; on allow, passes headers to the handler.
 */
export async function withApiRoute(
  request: NextRequest,
  handler: (ctx: ApiRouteContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const rateLimit = await rateLimitRequest(request)
  if (!rateLimit.allowed) {
    return rateLimit.response
  }

  return handler({
    request,
    rateLimitHeaders: rateLimit.headers,
  })
}
