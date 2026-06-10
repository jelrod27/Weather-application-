/**
 * Unit tests for weather/[city]/layout.tsx metadata generation
 * Verifies direct Open-Meteo enrichment and that transient API failures
 * don't flood Sentry.
 */

// Mock modules before imports
jest.mock('next/cache', () => ({
  // Pass through: tests exercise the inner fetch logic directly.
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

jest.mock('@/lib/open-meteo', () => ({
  fetchOpenMeteoForecast: jest.fn(),
}))

jest.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: jest.fn(),
}))

jest.mock('@/lib/error-utils', () => ({
  captureError: jest.fn(),
}))

import { generateMetadata } from '@/app/weather/[city]/layout'
import { fetchOpenMeteoForecast } from '@/lib/open-meteo'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { captureError } from '@/lib/error-utils'

const mockForecast = fetchOpenMeteoForecast as jest.MockedFunction<typeof fetchOpenMeteoForecast>
const mockFetchWithTimeout = fetchWithTimeout as jest.MockedFunction<typeof fetchWithTimeout>
const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>

function mockGeoSuccess() {
  mockFetchWithTimeout.mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [
        { latitude: 39.52, longitude: -119.81, admin1: 'Nevada', country_code: 'US' },
      ],
    }),
  } as Response)
}

function mockForecastSuccess() {
  mockForecast.mockResolvedValue({
    current: { temperature_2m: 72.4, weather_code: 0 },
    daily: {
      time: ['2026-06-09', '2026-06-10', '2026-06-11'],
      temperature_2m_max: [75, 78, 74],
      weather_code: [0, 2, 61],
    },
  } as never)
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('generateMetadata', () => {
  const makeParams = (city: string) => Promise.resolve({ city })

  it('should not call captureError for transient timeout failures in metadata fetch', async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error('Request timed out after 8000ms'))

    const metadata = await generateMetadata({ params: makeParams('reno-nv') })

    // Should still return valid metadata
    expect(metadata.title).toContain('Reno Nv')
    expect(metadata.description).toBeDefined()

    // Should NOT send transient API errors to Sentry - this is non-critical metadata enhancement
    expect(mockCaptureError).not.toHaveBeenCalled()
  })

  it('should return enhanced metadata when weather fetch succeeds', async () => {
    mockGeoSuccess()
    mockForecastSuccess()

    const metadata = await generateMetadata({ params: makeParams('reno-nv') })

    expect(metadata.description).toContain('72')
    expect(metadata.description).toContain('Clear')
    expect(mockCaptureError).not.toHaveBeenCalled()
  })

  it('should degrade to static metadata when geocoding finds nothing', async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response)

    const metadata = await generateMetadata({ params: makeParams('reno-nv') })

    expect(metadata.title).toContain('Reno Nv')
    expect(metadata.description).not.toContain('Current weather')
    expect(mockCaptureError).not.toHaveBeenCalled()
  })

  it('should call captureError for unexpected metadata fetch failures', async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error('Something exploded'))

    const metadata = await generateMetadata({ params: makeParams('reno-nv') })

    expect(metadata.title).toContain('Reno Nv')
    expect(mockCaptureError).toHaveBeenCalled()
  })

  it('should use 16bitweather.co URLs and dynamic OG images in metadata', async () => {
    mockGeoSuccess()
    mockForecastSuccess()

    const metadata = await generateMetadata({ params: makeParams('reno-nv') })

    const metaStr = JSON.stringify(metadata)
    expect(metaStr).not.toContain('16-bit-weather.vercel.app')
    expect(metaStr).not.toContain('og-image.png')
  })
})
