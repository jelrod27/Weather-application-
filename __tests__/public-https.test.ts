/** @jest-environment node */

import { lookup } from 'node:dns'
import { EventEmitter } from 'node:events'
import { request } from 'node:https'
import { Readable } from 'node:stream'
import type { IncomingMessage } from 'node:http'
import { isPublicAddress, publicHttpsLookup, readPublicHtml, requestPublicHttps } from '@/lib/security/public-https'

jest.mock('node:dns', () => ({ lookup: jest.fn() }))
jest.mock('node:https', () => ({ ...jest.requireActual('node:https'), request: jest.fn() }))

function response(statusCode = 200, body = '<html>ok</html>', headers: Record<string, string> = {}): IncomingMessage {
  return Object.assign(Readable.from([Buffer.from(body)]), { statusCode, headers }) as IncomingMessage
}

function serve(...responses: IncomingMessage[]) {
  for (const res of responses) {
    jest.mocked(request).mockImplementationOnce(((_url: URL, _options: unknown, onResponse: (res: IncomingMessage) => void) => {
      const req = Object.assign(new EventEmitter(), { end: () => { queueMicrotask(() => onResponse(res)) } })
      return req
    }) as never)
  }
}

beforeEach(() => { jest.clearAllMocks() })

describe('outbound address policy', () => {
  it.each([
    '127.0.0.1', '0.0.0.0', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '192.0.2.1', '198.18.0.1', '224.0.0.1', '255.255.255.255',
    '::', '::1', 'fe80::1', 'fc00::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:8.8.8.8', '2001:db8::1',
  ])('blocks non-public or translated address %s', (address) => {
    expect(isPublicAddress(address)).toBe(false)
  })

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('accepts public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(true)
  })

  it('rejects mixed DNS answers instead of allowing a private fallback', () => {
    jest.mocked(lookup).mockImplementationOnce(((_host: string, _options: unknown, done: (...args: unknown[]) => void) => {
      done(null, [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }])
    }) as never)
    const callback = jest.fn()
    publicHttpsLookup('publisher.example', { all: true }, callback)
    expect(callback).toHaveBeenCalledWith(expect.any(Error), '')
  })

  it('hands the vetted address directly to the socket without a second DNS resolution', () => {
    jest.mocked(lookup).mockImplementationOnce(((_host: string, _options: unknown, done: (...args: unknown[]) => void) => {
      done(null, [{ address: '8.8.8.8', family: 4 }])
    }) as never)
    const callback = jest.fn()
    publicHttpsLookup('publisher.example', {}, callback)
    expect(callback).toHaveBeenCalledWith(null, '8.8.8.8', 4)
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it('uses the guarded DNS lookup and the caller deadline for the actual request', async () => {
    serve(response())
    const signal = new AbortController().signal
    const res = await requestPublicHttps('https://publisher.example/article', { signal })
    const options = jest.mocked(request).mock.calls[0][1] as { agent: { options: { lookup: unknown } }; signal: AbortSignal }
    expect(options.agent.options.lookup).toBe(publicHttpsLookup)
    expect(options.signal).toBe(signal)
    res.destroy()
  })
})

describe('article redirects and resource bounds', () => {
  it.each(['https://127.0.0.1/internal', 'https://[::1]/', 'http://publisher.example/', 'https://user:pass@publisher.example/', 'https://publisher.example:8443/']) (
    'blocks a redirect to %s before another request is sent', async (location) => {
      const res = response(302, '', { location })
      serve(res)
      await expect(readPublicHtml('https://publisher.example/article', 6000, 48_000)).rejects.toThrow()
      expect(request).toHaveBeenCalledTimes(1)
      expect(res.destroyed).toBe(true)
    },
  )

  it('shares one overall deadline across valid redirects and limits returned bytes', async () => {
    const final = response(200, 'abcdefgh')
    serve(response(302, '', { location: '/final' }), final)
    await expect(readPublicHtml('https://publisher.example/article', 6000, 4)).resolves.toBe('abcd')
    const calls = jest.mocked(request).mock.calls
    expect(String(calls[1][0])).toBe('https://publisher.example/final')
    expect((calls[0][1] as { signal: AbortSignal }).signal).toBe((calls[1][1] as { signal: AbortSignal }).signal)
    expect(final.destroyed).toBe(true)
  })

  it('stops redirect loops after three hops', async () => {
    serve(...Array.from({ length: 4 }, () => response(302, '', { location: '/again' })))
    await expect(readPublicHtml('https://publisher.example/', 6000, 48_000)).rejects.toThrow(/redirects/)
    expect(request).toHaveBeenCalledTimes(4)
  })
})
