import { createTtlCache } from '@/lib/cache/ttl-cache'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { record } from './local-normalize'
import { pointMetadata } from './local-point'

interface NwsPayload { data: unknown; fetchedAt: string }
const cache = createTtlCache<NwsPayload>({ ttlMs: 5 * 60_000, maxEntries: 512 })
const MAX_BYTES = 2 * 1024 * 1024
export class UnsupportedNwsPoint extends Error {}

/** Discovery URLs are untrusted: only exact, query-free NWS grid resource paths are allowed. */
export function safeNwsGridUrl(value: unknown, suffix: '' | '/forecast' | '/forecast/hourly'): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.origin !== 'https://api.weather.gov' || url.username || url.password || url.search || url.hash) return null
    const pattern = /^\/gridpoints\/[A-Z]{3,4}\/\d{1,3},\d{1,3}(\/forecast(?:\/hourly)?)?$/
    const match = pattern.exec(url.pathname)
    if (!match || (match[1] ?? '') !== suffix) return null
    return url.href
  } catch { return null }
}

async function boundedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined)
    throw new Error('NWS response exceeded size limit')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Empty NWS response')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) throw new Error('NWS response exceeded size limit')
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
}

/** Short-lived source caching preserves source timestamps; normalization runs at request time. */
export async function fetchNwsPayload(url: string, point = false): Promise<NwsPayload> {
  return cache.load(url, async () => {
    const response = await fetchWithTimeout(url, {
      timeoutMs: 8_000, maxRetries: 0, redirect: 'error', cache: 'no-store',
      headers: { Accept: 'application/geo+json', 'User-Agent': '16-Bit-Weather/winter-forecast (https://www.16bitweather.co)' },
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      if (point && [400, 404, 422].includes(response.status)) throw new UnsupportedNwsPoint('NWS does not support this point')
      throw new Error('NWS forecast request failed')
    }
    const data = await boundedJson(response)
    if (point && !pointMetadata(record(data).properties)) throw new Error('Invalid NWS point metadata')
    return { data, fetchedAt: new Date().toISOString() }
  }, point ? 12 * 60 * 60_000 : undefined)
}
