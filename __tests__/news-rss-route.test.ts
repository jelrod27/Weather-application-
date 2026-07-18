jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string
    nextUrl: { searchParams: URLSearchParams }

    constructor(url: string) {
      this.url = url
      this.nextUrl = { searchParams: new URLSearchParams(new URL(url).search) }
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

jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({
    allowed: true,
    headers: { 'X-RateLimit-Remaining': '99' },
  }),
}))

jest.mock('@/lib/services/rss/rssAggregator', () => ({
  aggregateFeeds: jest.fn().mockResolvedValue({
    items: [],
    happeningNow: [],
    featured: null,
    stats: {},
    lastUpdated: new Date('2026-07-18T00:00:00.000Z'),
  }),
  getFeaturedItem: jest.fn().mockResolvedValue(null),
  getCategoryConfig: jest.fn().mockReturnValue([]),
  cacheControlForCategories: jest.fn().mockReturnValue('public, max-age=60'),
}))

import { GET } from '@/app/api/news/rss/route'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { aggregateFeeds } from '@/lib/services/rss/rssAggregator'
import { NextRequest } from 'next/server'

const mockedRateLimit = rateLimitRequest as jest.MockedFunction<typeof rateLimitRequest>
const mockedAggregate = aggregateFeeds as jest.MockedFunction<typeof aggregateFeeds>

describe('GET /api/news/rss', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRateLimit.mockResolvedValue({
      allowed: true,
      headers: { 'X-RateLimit-Remaining': '99' },
    } as Awaited<ReturnType<typeof rateLimitRequest>>)
  })

  it('returns the rate-limit response when denied', async () => {
    const denied = { status: 429, json: async () => ({ error: 'Too Many Requests' }) }
    mockedRateLimit.mockResolvedValueOnce({
      allowed: false,
      response: denied as never,
    })

    const res = await GET(new NextRequest('http://localhost/api/news/rss'))
    expect(res).toBe(denied)
    expect(mockedAggregate).not.toHaveBeenCalled()
  })

  it('aggregates feeds when rate limit allows', async () => {
    const res = await GET(new NextRequest('http://localhost/api/news/rss'))
    expect(res.status).toBe(200)
    expect(mockedRateLimit).toHaveBeenCalled()
    expect(mockedAggregate).toHaveBeenCalled()
  })
})
