/**
 * Pins pollen fetch in lib so server weather never HTTP-self-proxies,
 * and the Google key is never logged on upstream failure.
 */

import { fetchPollenForLocation } from '@/lib/pollen/fetch-pollen'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo'
import { logRouteError } from '@/lib/error-utils'

jest.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: jest.fn(),
}))

jest.mock('@/lib/open-meteo', () => ({
  fetchOpenMeteoAirQuality: jest.fn(),
}))

jest.mock('@/lib/error-utils', () => ({
  logRouteError: jest.fn(),
}))

const mockFetchWithTimeout = fetchWithTimeout as jest.MockedFunction<typeof fetchWithTimeout>
const mockFetchOpenMeteoAirQuality = fetchOpenMeteoAirQuality as jest.MockedFunction<
  typeof fetchOpenMeteoAirQuality
>
const mockLogRouteError = logRouteError as jest.MockedFunction<typeof logRouteError>

describe('fetchPollenForLocation', () => {
  const originalKey = process.env.GOOGLE_POLLEN_API_KEY

  afterEach(() => {
    jest.clearAllMocks()
    if (originalKey === undefined) delete process.env.GOOGLE_POLLEN_API_KEY
    else process.env.GOOGLE_POLLEN_API_KEY = originalKey
  })

  it('maps Google pollen without calling /api/weather/pollen', async () => {
    process.env.GOOGLE_POLLEN_API_KEY = 'secret-key-value'
    mockFetchWithTimeout.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dailyInfo: [
          {
            pollenTypeInfo: [
              { code: 'TREE', indexInfo: { value: 4, category: 'Moderate' } },
              { code: 'GRASS', indexInfo: { value: 1, category: 'Low' } },
              { code: 'WEED', indexInfo: { value: 0, category: 'None' } },
            ],
            plantInfo: [],
          },
        ],
      }),
    } as Response)

    const result = await fetchPollenForLocation(40.71, -74.01)

    expect(result.source).toBe('google')
    expect(result.tree.Tree).toBe('Moderate')
    expect(mockFetchOpenMeteoAirQuality).not.toHaveBeenCalled()
    expect(mockFetchWithTimeout.mock.calls[0][0]).toContain('pollen.googleapis.com')
    expect(JSON.stringify(result)).not.toContain('secret-key-value')
  })

  it('does not log the Google key when upstream fetch throws', async () => {
    process.env.GOOGLE_POLLEN_API_KEY = 'secret-key-value'
    mockFetchWithTimeout.mockRejectedValueOnce(
      new Error('fetch failed: https://pollen.googleapis.com/v1/forecast:lookup?key=secret-key-value'),
    )
    mockFetchOpenMeteoAirQuality.mockRejectedValueOnce(new Error('aq down'))

    await fetchPollenForLocation(40.71, -74.01)

    expect(mockLogRouteError).toHaveBeenCalled()
    const logged = JSON.stringify(mockLogRouteError.mock.calls)
    expect(logged).not.toContain('secret-key-value')
  })

  it('falls back to Open-Meteo when Google key is absent', async () => {
    delete process.env.GOOGLE_POLLEN_API_KEY
    mockFetchOpenMeteoAirQuality.mockResolvedValueOnce({
      hourly: {
        time: ['2025-03-25T14:00'],
        birch_pollen: [35],
        grass_pollen: [10],
        ragweed_pollen: [5],
      },
      utc_offset_seconds: 0,
    } as never)

    const result = await fetchPollenForLocation(40.71, -74.01)

    expect(mockFetchWithTimeout).not.toHaveBeenCalled()
    expect(result.source).toBe('open-meteo')
    expect(result.tree.Birch).toBe('Moderate')
  })
})
