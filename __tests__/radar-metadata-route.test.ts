jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string
    nextUrl: { searchParams: URLSearchParams }

    constructor(url: string) {
      this.url = url
      this.nextUrl = { searchParams: new URL(url).searchParams }
    }
  },
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status || 200,
      headers: init?.headers || {},
      json: async () => body,
    })),
  },
}))

const sampleManifest = {
  version: '2.0',
  generated: 1718841600,
  host: 'https://tilecache.rainviewer.com',
  radar: {
    past: [
      { time: 1718840400, path: '/v2/radar/1718840400' },
      { time: 1718841000, path: '/v2/radar/1718841000' },
      { time: 1718841600, path: '/v2/radar/1718841600' },
    ],
  },
}

jest.mock('@/lib/radar/rainviewer/fetch-manifest', () => ({
  fetchRainViewerManifest: jest.fn(async () => ({
    version: sampleManifest.version,
    generated: sampleManifest.generated,
    host: sampleManifest.host,
    past: sampleManifest.radar.past,
  })),
}))

import { GET } from '@/app/api/radar/metadata/route'
import { NextRequest } from 'next/server'

describe('GET /api/radar/metadata', () => {
  it('returns 400 when coordinates are missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/radar/metadata'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Missing required parameters: lat, lon' })
  })

  it('returns 400 when coordinates are invalid', async () => {
    const res = await GET(new NextRequest('http://localhost/api/radar/metadata?lat=91&lon=-75'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Coordinates out of valid range' })
  })

  it('returns RainViewer metadata for US locations', async () => {
    const res = await GET(new NextRequest('http://localhost/api/radar/metadata?lat=40.7128&lon=-74.006'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.selectedProvider.id).toBe('rainviewer')
    expect(body.frames.length).toBe(3)
    expect(body.coverageRegion).toBe('us')
    expect(body.rainviewer.host).toContain('tilecache.rainviewer.com')
    const cacheControl = typeof res.headers.get === 'function'
      ? res.headers.get('Cache-Control')
      : (res.headers as Record<string, string>)['Cache-Control']
    expect(cacheControl).toContain('s-maxage=120')
  })

  it('returns RainViewer metadata for international locations', async () => {
    const res = await GET(new NextRequest('http://localhost/api/radar/metadata?lat=51.5072&lon=-0.1276'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.selectedProvider.id).toBe('rainviewer')
    expect(body.coverageRegion).toBe('global')
  })
})
