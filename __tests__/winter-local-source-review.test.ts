/** @jest-environment node */
jest.mock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: jest.fn() }))
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const fetchMock = jest.mocked(fetchWithTimeout)
const gridUrl = 'https://api.weather.gov/gridpoints/BOU/63,62'

beforeEach(() => {
  jest.resetModules()
  fetchMock.mockReset()
  jest.doMock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: fetchMock }))
})

it.each([404, 503])('cancels unread response bodies when NWS returns HTTP %s', async status => {
  const cancel = jest.fn()
  const body = new ReadableStream<Uint8Array>({ cancel })
  fetchMock.mockResolvedValue(new Response(body, { status }))
  const { fetchNwsPayload, UnsupportedNwsPoint } = await import('@/lib/winter/local-source')
  if (status === 404) {
    await expect(fetchNwsPayload('https://api.weather.gov/points/39,-105', true)).rejects.toBeInstanceOf(UnsupportedNwsPoint)
  } else {
    await expect(fetchNwsPayload(gridUrl)).rejects.toThrow('NWS forecast request failed')
  }
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(body.locked).toBe(false)
})

it('cancels an unread body when its declared size exceeds the response limit', async () => {
  const cancel = jest.fn()
  const body = new ReadableStream<Uint8Array>({ cancel })
  fetchMock.mockResolvedValue(new Response(body, { headers: { 'Content-Length': '9000000' } }))
  const { fetchNwsPayload } = await import('@/lib/winter/local-source')
  await expect(fetchNwsPayload(gridUrl)).rejects.toThrow('NWS response exceeded size limit')
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(body.locked).toBe(false)
})

it('cancels and releases the reader when streamed bytes exceed the response limit', async () => {
  const cancel = jest.fn()
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)) },
    cancel,
  })
  fetchMock.mockResolvedValue(new Response(body))
  const { fetchNwsPayload } = await import('@/lib/winter/local-source')
  await expect(fetchNwsPayload(gridUrl)).rejects.toThrow('NWS response exceeded size limit')
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(body.locked).toBe(false)
})

it('attempts reader cancellation and releases its lock when reading fails', async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error('stream interrupted')) } })
  const response = new Response(body)
  const reader = body.getReader()
  const cancel = jest.spyOn(reader, 'cancel')
  jest.spyOn(body, 'getReader').mockReturnValue(reader)
  fetchMock.mockResolvedValue(response)
  const { fetchNwsPayload } = await import('@/lib/winter/local-source')
  await expect(fetchNwsPayload(gridUrl)).rejects.toThrow('stream interrupted')
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(body.locked).toBe(false)
})
