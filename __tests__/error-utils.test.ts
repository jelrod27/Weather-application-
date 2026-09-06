/**
 * @jest-environment node
 */

import * as Sentry from '@sentry/nextjs'
import {
  captureError,
  isExpectedUpstreamHttpError,
  logRouteError,
  toError,
} from '@/lib/error-utils'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}))

const mockedSentry = Sentry as jest.Mocked<typeof Sentry>

describe('toError', () => {
  it('keeps real Error instances', () => {
    const err = new Error('boom')
    expect(toError(err)).toBe(err)
  })

  it('uses message and code from a Postgrest-shaped object', () => {
    const err = toError({
      code: '23514',
      message: 'new row for relation "user_preferences" violates check constraint "user_preferences_theme_check"',
    })
    expect(err.message).toContain('user_preferences_theme_check')
    expect(err.message).toContain('23514')
    expect(err.message).not.toBe('[object Object]')
  })
})

describe('isExpectedUpstreamHttpError', () => {
  it('matches NWS 5xx and 429 only', () => {
    expect(isExpectedUpstreamHttpError(new Error('NWS alerts HTTP 500'))).toBe(true)
    expect(isExpectedUpstreamHttpError(new Error('NWS alerts HTTP 502'))).toBe(true)
    expect(isExpectedUpstreamHttpError(new Error('NWS alerts HTTP 429'))).toBe(true)
  })

  it('does not treat an NWS 4xx as upstream noise, since that is our request', () => {
    expect(isExpectedUpstreamHttpError(new Error('NWS alerts HTTP 400'))).toBe(false)
    expect(isExpectedUpstreamHttpError(new Error('NWS alerts HTTP 403'))).toBe(false)
    expect(isExpectedUpstreamHttpError(new Error('NWS alerts HTTP 404'))).toBe(false)
  })

  it('matches Open-Meteo 429/500', () => {
    expect(isExpectedUpstreamHttpError(new Error('Open-Meteo Forecast API error 429: quota'))).toBe(true)
    expect(isExpectedUpstreamHttpError(new Error('Open-Meteo Forecast API error 500: {"error":true}'))).toBe(true)
  })

  it('does not match our own defects', () => {
    expect(isExpectedUpstreamHttpError(new Error('Failed to update preferences'))).toBe(false)
    expect(isExpectedUpstreamHttpError({ message: 'NWS alerts HTTP 400' })).toBe(false)
  })
})

describe('captureError / logRouteError', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('does not open a Sentry issue for expected upstream HTTP errors', () => {
    captureError(new Error('NWS alerts HTTP 502'), 'Alerts API')
    logRouteError('Precipitation API', new Error('Open-Meteo Forecast API error 429: limit'))

    expect(mockedSentry.captureException).not.toHaveBeenCalled()
    expect(mockedSentry.addBreadcrumb).toHaveBeenCalled()
  })
})
