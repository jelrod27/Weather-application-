import { lookup } from 'node:dns'
import { Agent, request } from 'node:https'
import { isIP } from 'node:net'
import type { IncomingMessage, OutgoingHttpHeaders } from 'node:http'
import type { LookupFunction } from 'node:net'
import ipaddr from 'ipaddr.js'

/** Only globally routable addresses; also excludes IPv4-mapped/tunnel IPv6. */
export function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.parse(address).range() === 'unicast'
  } catch {
    return false
  }
}

export function publicHttpsUrl(raw: string): URL {
  const url = new URL(raw)
  if (
    url.protocol !== 'https:' || url.username || url.password || url.port ||
    isIP(url.hostname.replace(/^\[|\]$/g, '')) || !url.hostname.includes('.') ||
    url.hostname.endsWith('.')
  ) throw new Error('Unsupported outbound HTTPS destination')
  return url
}

// Validation happens in the socket's own lookup, not in a preflight DNS check.
// The resolved address is handed straight to the connection (no second lookup).
export const publicHttpsLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { family: options.family, hints: options.hints, all: true }, (error, addresses) => {
    if (error) return callback(error, '')
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      return callback(new Error('Outbound destination is not public'), '')
    }
    if (options.all) callback(null, addresses)
    else callback(null, addresses[0].address, addresses[0].family)
  })
}

const publicAgent = new Agent({ lookup: publicHttpsLookup })

/** No automatic redirects; callers must validate every new destination. */
export async function requestPublicHttps(
  rawUrl: string,
  options: {
    method?: 'GET' | 'POST'
    headers?: OutgoingHttpHeaders
    body?: Buffer | null
    signal: AbortSignal
  },
): Promise<IncomingMessage> {
  const url = publicHttpsUrl(rawUrl)
  return new Promise((resolve, reject) => {
    const req = request(url, {
      agent: publicAgent,
      method: options.method ?? 'GET',
      headers: options.headers,
      signal: options.signal,
    }, resolve)
    req.on('error', reject)
    req.end(options.body ?? undefined)
  })
}

/** A single deadline and byte budget cover redirects, headers and response data. */
export async function readPublicHtml(rawUrl: string, timeoutMs: number, maxBytes: number): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs)
  let url = rawUrl
  for (let hop = 0; hop <= 3; hop += 1) {
    const response = await requestPublicHttps(url, {
      signal,
      headers: {
        'User-Agent': '16-Bit Weather RSS Aggregator/1.0',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'identity',
      },
    })
    try {
      const status = response.statusCode ?? 0
      if ([301, 302, 303, 307, 308].includes(status)) {
        if (!response.headers.location || hop === 3) throw new Error('Invalid or excessive article redirects')
        url = publicHttpsUrl(new URL(response.headers.location, url).href).href
        continue
      }
      if (status < 200 || status >= 300) throw new Error('Article request failed')
      const chunks: Buffer[] = []
      let bytes = 0
      for await (const chunk of response) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        const part = buffer.subarray(0, maxBytes - bytes)
        chunks.push(part)
        bytes += part.length
        if (bytes >= maxBytes) break
      }
      return Buffer.concat(chunks).toString('utf8')
    } finally {
      response.destroy()
    }
  }
  throw new Error('Too many article redirects')
}
