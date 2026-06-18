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

  it('returns US radar metadata with Iowa NEXRAD provider', async () => {
    const res = await GET(new NextRequest('http://localhost/api/radar/metadata?lat=40.7128&lon=-74.006'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.selectedProvider.id).toBe('iowa-nexrad')
    expect(body.fallbackProvider).toBeUndefined()
    expect(body.frames.length).toBeGreaterThan(0)
    expect(res.headers['Cache-Control']).toContain('s-maxage=120')
  })

  it('returns Canada radar metadata', async () => {
    const res = await GET(new NextRequest('http://localhost/api/radar/metadata?lat=53.5461&lon=-113.4938'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.selectedProvider.id).toBe('canada-geomet')
  })
})
