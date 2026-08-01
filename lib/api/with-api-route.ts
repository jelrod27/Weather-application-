/**
 * Shared API route ceremony: rate-limit, run the handler, and turn anything it
 * throws into a logged, Sentry-visible, consistently shaped error response.
 *
 * This module existed with only the rate-limit gate and three adopters while 20
 * other routes hand-rolled the identical three-line gate and 55 of 56 route
 * files that log errors reached only `console.error` — invisible to Sentry.
 *
 * Deliberately does NOT normalize each route's status code or message: those
 * are part of a route's existing contract with its callers, so they are passed
 * in per route. The mechanism is shared; the wording is not.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { logRouteError } from '@/lib/error-utils'

export type RateLimitHeaders = Record<string, string>

export type ApiRouteContext = {
  request: NextRequest
  rateLimitHeaders: RateLimitHeaders
}

export interface ApiRouteOptions {
  /**
   * Log/Sentry tag for this route, e.g. 'space-weather/kp-index'. Defaults to
   * the request pathname.
   */
  context?: string
  /**
   * Run the rate-limit gate. Default true. Cron routes authenticate by secret
   * and must not be limited by caller identity.
   */
  rateLimit?: boolean
  /** Body message when the handler throws. Default 'Internal server error'. */
  errorMessage?: string
  /** Status when the handler throws. Default 500. */
  errorStatus?: number
}

/**
 * Thrown by a handler to return a specific status without the wrapper treating
 * it as an unexpected failure. Not reported to Sentry — these are expected
 * outcomes (bad input, upstream 404), not defects.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function withApiRoute(
  request: NextRequest,
  handler: (ctx: ApiRouteContext) => Promise<NextResponse>,
  options: ApiRouteOptions = {},
): Promise<NextResponse> {
  const {
    context = request.nextUrl?.pathname ?? 'api',
    rateLimit = true,
    errorMessage = 'Internal server error',
    errorStatus = 500,
  } = options

  let rateLimitHeaders: RateLimitHeaders = {}

  if (rateLimit) {
    const result = await rateLimitRequest(request)
    if (!result.allowed) return result.response
    rateLimitHeaders = result.headers
  }

  try {
    return await handler({ request, rateLimitHeaders })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    logRouteError(context, error)
    return NextResponse.json({ error: errorMessage }, { status: errorStatus })
  }
}
