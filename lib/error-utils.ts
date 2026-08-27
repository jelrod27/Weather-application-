import * as Sentry from '@sentry/nextjs'
import { sanitizeLogValue } from '@/lib/sanitize-log'

/**
 * Capture error to Sentry with context.
 * Use this instead of console.error for production error tracking.
 */
export function captureError(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))

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
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

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
  if (isAbortError(error)) {
    console.warn(`[${context}] upstream timeout`)
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
