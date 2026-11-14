/** @jest-environment node */
jest.mock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: jest.fn() }))
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const fetchMock = jest.mocked(fetchWithTimeout)
const NOW = Date.parse('2026-11-14T17:00:00Z')
function collection() {
  return { type: 'FeatureCollection', features: [{ type: 'Feature',
    properties: { issue_time: '2026-11-14 08:26:53', start_time: '2026-11-14 12:00:00', end_time: '2026-11-15 12:00:00', outlook: 'Slight (10-39%)', idp_source: 'wwd_day1_psnow_gt_04' },
    geometry: { type: 'Polygon', coordinates: [[[-110, 40], [-109, 40], [-109, 41], [-110, 40]]] },
  }] }
}
beforeEach(() => {
  jest.resetModules()
  jest.useFakeTimers({ now: NOW })
  fetchMock.mockReset()
  jest.doMock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: fetchMock }))
})
afterEach(() => jest.useRealTimers())

it('coalesces the source snapshot and keeps original acquisition time on cache hits', async () => {
  fetchMock.mockImplementation(async () => Response.json(collection()))
  const { fetchWinterOutlook } = await import('@/lib/winter/outlooks')
  const selection = { product: 'snow', day: 1, threshold: 4 } as const
  const first = await fetchWinterOutlook(selection)
  jest.setSystemTime(NOW + 60_000)
  const second = await fetchWinterOutlook(selection)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(first.status).toBe('available')
  expect(second.fetchedAt).toBe(first.fetchedAt)
})
it('rejects oversized source bodies even without a content-length header', async () => {
  fetchMock.mockResolvedValue(new Response('x'.repeat(2_000_001)))
  const { fetchWinterOutlook } = await import('@/lib/winter/outlooks')
  await expect(fetchWinterOutlook({ product: 'snow', day: 1, threshold: 4 })).rejects.toThrow(/Oversized/)
})
it('rejects upstream HTTP errors rather than treating them as no contours', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 503 }))
  const { fetchWinterOutlook } = await import('@/lib/winter/outlooks')
  await expect(fetchWinterOutlook({ product: 'snow', day: 1, threshold: 4 })).rejects.toThrow(/503/)
})

it('expires cached WSSI at its issuance freshness boundary, before source validity ends', async () => {
  const body = collection()
  Object.assign(body.features[0].properties, { issue_time: '2026-11-14 1101Z', impact: 'MINOR', idp_source: 'WSSI_OVERALL_Day_1' })
  fetchMock.mockImplementation(async () => Response.json(body))
  const { fetchWinterOutlook } = await import('@/lib/winter/outlooks')
  const selection = { product: 'impacts', day: 1, threshold: 4 } as const
  expect((await fetchWinterOutlook(selection)).status).toBe('available')
  jest.setSystemTime(NOW + 60_000)
  const result = await fetchWinterOutlook(selection)
  expect(result.status).toBe('stale')
  expect(result.contours.features).toEqual([])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('fetches a newly published WSSI cycle as soon as the cached cycle reaches its freshness boundary', async () => {
  const body = collection()
  Object.assign(body.features[0].properties, { issue_time: '2026-11-14 1101Z', impact: 'MINOR', idp_source: 'WSSI_OVERALL_Day_1' })
  const replacement = { ...body, features: body.features.map(feature => ({ ...feature, properties: { ...feature.properties, issue_time: '2026-11-14 1701Z' } })) }
  fetchMock.mockResolvedValueOnce(Response.json(body)).mockResolvedValueOnce(Response.json(replacement))
  const { fetchWinterOutlook } = await import('@/lib/winter/outlooks')
  const selection = { product: 'impacts', day: 1, threshold: 4 } as const
  expect((await fetchWinterOutlook(selection)).issuedAt).toBe('2026-11-14T11:01:00.000Z')
  jest.setSystemTime(NOW + 60_000)
  const updated = await fetchWinterOutlook(selection)
  expect(updated.status).toBe('available')
  expect(updated.issuedAt).toBe('2026-11-14T17:01:00.000Z')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('retries a cached stale cycle after a one-minute backoff and recovers when NOAA publishes its replacement', async () => {
  const body = collection()
  Object.assign(body.features[0].properties, { issue_time: '2026-11-14 1101Z', impact: 'MINOR', idp_source: 'WSSI_OVERALL_Day_1' })
  const replacement = { ...body, features: body.features.map(feature => ({ ...feature, properties: { ...feature.properties, issue_time: '2026-11-14 1702Z' } })) }
  fetchMock.mockResolvedValueOnce(Response.json(body)).mockResolvedValueOnce(Response.json(body)).mockResolvedValueOnce(Response.json(replacement))
  const { fetchWinterOutlook } = await import('@/lib/winter/outlooks')
  const selection = { product: 'impacts', day: 1, threshold: 4 } as const
  expect((await fetchWinterOutlook(selection)).status).toBe('available')
  jest.setSystemTime(NOW + 60_000)
  expect((await fetchWinterOutlook(selection)).status).toBe('stale')
  jest.setSystemTime(NOW + 90_000)
  expect((await fetchWinterOutlook(selection)).status).toBe('stale')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  jest.setSystemTime(NOW + 120_000)
  const result = await fetchWinterOutlook(selection)
  expect(result.status).toBe('available')
  expect(result.issuedAt).toBe('2026-11-14T17:02:00.000Z')
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it.each([
  ['non-OK', { status: 503 }],
  ['oversized header', { headers: { 'Content-Length': '2000001' } }],
])('cancels %s response bodies before rejecting them', async (_, init) => {
  const response = new Response('{}', init)
  const cancel = jest.spyOn(response.body!, 'cancel')
  fetchMock.mockResolvedValue(response)
  const { fetchWinterOutlook } = await import('@/lib/winter/outlooks')
  await expect(fetchWinterOutlook({ product: 'snow', day: 1, threshold: 4 })).rejects.toThrow()
  expect(cancel).toHaveBeenCalledTimes(1)
})
