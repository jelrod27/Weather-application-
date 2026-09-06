import * as Sentry from '@sentry/nextjs'
import { sanitizeLogValue } from '@/lib/sanitize-log'
import { isAbortError } from '@/lib/abort-error'

export { isAbortError }

/**
 * Normalize unknown thrown values so Postgrest `{ message, code }` objects
 * do not become `Error: [object Object]` in Sentry.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'object' && error !== null) {
    const record = error as { message?: unknown; code?: unknown }
    if (typeof record.message === 'string' && record.message.length > 0) {
      const suffix = typeof record.code === 'string' ? ` (${record.code})` : ''
      return new Error(`${record.message}${suffix}`)
    }
  }
  return new Error(String(error))
}

/**
 * True when the error is an expected third-party HTTP failure we already
 * degrade around (NWS 5xx/429, Open-Meteo 429/5xx). These are upstream
 * blips, not defects — callers should return 502 via ApiError, not open
 * a Sentry issue. An NWS 4xx is deliberately excluded: that is our request
 * being wrong (an out-of-coverage point, a bad parameter) and must stay
 * visible until the caller handles it.
 */
export function isExpectedUpstreamHttpError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message
  if (/^NWS alerts HTTP (5\d\d|429)$/.test(message)) return true
  if (/^Open-Meteo .+ API error (429|5\d\d)\b/.test(message)) return true
  return false
}

/**
 * Capture error to Sentry with context.
 * Use this instead of console.error for production error tracking.
 */
export function captureError(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>
): void {
  if (isAbortError(error) || isExpectedUpstreamHttpError(error)) {
    captureUpstreamTimeout(context, extra)
    return
  }

  const errorObj = toError(error)

  Sentry.captureException(errorObj, {
    tags: { context },
    extra: {
      ...extra,
      originalError: error instanceof Error ? undefined : error,
    },
  })
}

/**
 * True when an error is a fetch aborted by our own AbortController timeout
 * rather than a genuine failure. The abort reason surfaces as an AbortError
 * (a DOMException in some runtimes, an Error in others), so match on `name`
 * instead of `instanceof Error`. These are transient upstream-latency events,
 * not defects, and callers that already degrade gracefully should treat them
 * as noise rather than opening a Sentry issue.
 */
/**
 * Record a transient upstream timeout as a Sentry breadcrumb (warning level)
 * instead of capturing it as an exception. Use for expected third-party
 * slowness that the caller already handles gracefully — it keeps the context
 * for any later error without manufacturing an issue per timeout.
 */
export function captureUpstreamTimeout(
  context: string,
  extra?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category: 'upstream-timeout',
    level: 'warning',
    message: context,
    data: extra,
  })
}

/**
 * Log a route failure to the console AND to Sentry.
 *
 * A fetch aborted by our own timeout is recorded as a breadcrumb rather than an
 * exception — transient upstream latency the caller already degrades around is
 * context, not a defect.
 */
export function logRouteError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  if (isAbortError(error) || isExpectedUpstreamHttpError(error)) {
    console.warn(`[${context}] expected upstream failure`)
    captureUpstreamTimeout(context, extra)
    return
  }

  console.error(`[${context}]`, error)
  captureError(error, context, extra)
}

/**
 * Capture a database error with structured context
 */
export function captureDbError(
  operation: string,
  error: { message?: string; code?: string; details?: string; hint?: string },
  extra?: Record<string, unknown>
): void {
  Sentry.captureMessage(`Database error in ${sanitizeLogValue(operation)}`, {
    level: 'error',
    tags: {
      context: 'database',
      operation,
      errorCode: error.code || 'unknown',
    },
    extra: {
      message: typeof error.message === 'string' ? sanitizeLogValue(error.message) : error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      ...extra,
    },
  })
}
