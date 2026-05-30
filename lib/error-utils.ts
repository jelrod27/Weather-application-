import { sanitizeLogValue } from "@/lib/sanitize-log"
/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 *
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Error Handling Utilities
 * Centralized error handling for consistent error messages and logging
 * Integrated with Sentry for production error tracking
 */

export enum WeatherErrorType {
  API_KEY_MISSING = 'API_KEY_MISSING',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GEOLOCATION_ERROR = 'GEOLOCATION_ERROR',
  INVALID_LOCATION = 'INVALID_LOCATION',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface WeatherError {
  type: WeatherErrorType
  message: string
  userMessage: string
  retryable: boolean
}

/**
 * Parse and categorize weather-related errors
 */
export function parseWeatherError(error: unknown): WeatherError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // API Key errors
    if (message.includes('api key') || message.includes('unauthorized')) {
      return {
        type: WeatherErrorType.API_KEY_MISSING,
        message: error.message,
        userMessage: 'Weather service is temporarily unavailable. Please try again later.',
        retryable: false
      }
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return {
        type: WeatherErrorType.NETWORK_ERROR,
        message: error.message,
        userMessage: 'Unable to connect to weather service. Please check your internet connection.',
        retryable: true
      }
    }
    
    // Location errors
    if (message.includes('location') || message.includes('not found') || message.includes('invalid')) {
      return {
        type: WeatherErrorType.INVALID_LOCATION,
        message: error.message,
        userMessage: 'Location not found. Please try a different city or zip code.',
        retryable: false
      }
    }
    
    // Rate limit errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        type: WeatherErrorType.RATE_LIMIT,
        message: error.message,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryable: true
      }
    }
    
    // Server errors
    if (message.includes('500') || message.includes('server error')) {
      return {
        type: WeatherErrorType.SERVER_ERROR,
        message: error.message,
        userMessage: 'Weather service is experiencing issues. Please try again later.',
        retryable: true
      }
    }
    
    // Generic error with message
    return {
      type: WeatherErrorType.UNKNOWN_ERROR,
      message: error.message,
      userMessage: error.message.includes('Failed to') ? error.message : 'An unexpected error occurred.',
      retryable: true
    }
  }
  
  // Unknown error type
  return {
    type: WeatherErrorType.UNKNOWN_ERROR,
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true
  }
}

/**
 * Parse geolocation errors
 */
function parseGeolocationError(error: GeolocationPositionError): WeatherError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        type: WeatherErrorType.GEOLOCATION_ERROR,
        message: 'Geolocation permission denied',
        userMessage: 'Location access denied. Please enable location services or search manually.',
        retryable: false
      }
    case error.POSITION_UNAVAILABLE:
      return {
        type: WeatherErrorType.GEOLOCATION_ERROR,
        message: 'Geolocation position unavailable',
        userMessage: 'Unable to determine your location. Please search manually.',
        retryable: true
      }
    case error.TIMEOUT:
      return {
        type: WeatherErrorType.GEOLOCATION_ERROR,
        message: 'Geolocation timeout',
        userMessage: 'Location request timed out. Please try again or search manually.',
        retryable: true
      }
    default:
      return {
        type: WeatherErrorType.GEOLOCATION_ERROR,
        message: 'Geolocation error',
        userMessage: 'Unable to get your location. Please search manually.',
        retryable: true
      }
  }
}

/**
 * Log error with appropriate level based on type
 */
export function logWeatherError(error: WeatherError, context?: string) {
  const prefix = context ? `[${context}]` : '[Weather]'
  
  switch (error.type) {
    case WeatherErrorType.API_KEY_MISSING:
      console.error(`${prefix} Critical: ${error.message}`)
      break
    case WeatherErrorType.NETWORK_ERROR:
    case WeatherErrorType.SERVER_ERROR:
      console.warn(`${prefix} Network/Server: ${error.message}`)
      break
    case WeatherErrorType.RATE_LIMIT:
      console.warn(`${prefix} Rate Limited: ${error.message}`)
      break
    case WeatherErrorType.INVALID_LOCATION:
      console.info(`${prefix} Invalid Location: ${error.message}`)
      break
    case WeatherErrorType.GEOLOCATION_ERROR:
      console.info(`${prefix} Geolocation: ${error.message}`)
      break
    default:
      console.error(`${prefix} Unknown: ${error.message}`)
  }
}

/**
 * Enhanced error handler for async operations
 */
async function handleAsyncWeatherOperation<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<{ data?: T; error?: WeatherError }> {
  try {
    const data = await operation()
    return { data }
  } catch (err) {
    const error = parseWeatherError(err)
    logWeatherError(error, context)

    if (fallback !== undefined) {
      return { data: fallback, error }
    }

    return { error }
  }
}

/**
 * Capture error to Sentry with context
 * Use this instead of console.error for production error tracking
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
      message: typeof error.message === "string" ? sanitizeLogValue(error.message) : error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      ...extra,
    },
  })
}

/**
 * Capture an API error with structured context
 */
function captureApiError(
  endpoint: string,
  statusCode: number,
  message: string,
  extra?: Record<string, unknown>
): void {
  Sentry.captureMessage(`API error: ${endpoint}`, {
    level: statusCode >= 500 ? 'error' : 'warning',
    tags: {
      context: 'api',
      endpoint,
      statusCode: String(statusCode),
    },
    extra: {
      message,
      ...extra,
    },
  })
}