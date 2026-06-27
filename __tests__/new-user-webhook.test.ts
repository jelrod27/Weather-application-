/**
 * Unit tests for new-user registration webhook
 */

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string
    headers: Headers
    private bodyText: string

    constructor(url: string, init?: { method?: string; headers?: Headers; body?: string }) {
      this.url = url
      this.headers = init?.headers ?? new Headers()
      this.bodyText = init?.body ?? ''
    }

    async json() {
      return JSON.parse(this.bodyText)
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/services/admin-notify-service', () => ({
  notifyNewRegistration: jest.fn().mockResolvedValue({
    email: { sent: true },
    slack: { sent: true },
    discord: { sent: false, reason: 'DISCORD_WEBHOOK_URL not configured' },
  }),
}))

import { NextRequest } from 'next/server'
import {
  parseProfileInsertPayload,
  verifyWebhookSecret,
  POST,
} from '@/app/api/webhooks/new-user/route'
import { notifyNewRegistration } from '@/lib/services/admin-notify-service'

const mockNotify = notifyNewRegistration as jest.MockedFunction<typeof notifyNewRegistration>

const VALID_PAYLOAD = {
  type: 'INSERT',
  table: 'profiles',
  schema: 'public',
  record: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'newuser@example.com',
    username: 'newuser',
    full_name: 'New User',
    created_at: '2026-06-25T12:00:00.000Z',
  },
}

function makeRequest(options: { secret?: string; body?: unknown }): NextRequest {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (options.secret !== undefined) {
    headers.set('x-webhook-secret', options.secret)
  }

  return new NextRequest('http://localhost:3000/api/webhooks/new-user', {
    method: 'POST',
    headers,
    body: JSON.stringify(options.body ?? VALID_PAYLOAD),
  })
}

describe('new-user webhook', () => {
  const originalSecret = process.env.SUPABASE_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = 'test-webhook-secret'
    mockNotify.mockClear()
  })

  afterAll(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = originalSecret
  })

  describe('verifyWebhookSecret', () => {
    it('accepts matching secrets', () => {
      const request = makeRequest({ secret: 'test-webhook-secret' })
      expect(verifyWebhookSecret(request, 'test-webhook-secret')).toBe(true)
    })

    it('rejects wrong secrets', () => {
      const request = makeRequest({ secret: 'wrong-secret' })
      expect(verifyWebhookSecret(request, 'test-webhook-secret')).toBe(false)
    })
  })

  describe('parseProfileInsertPayload', () => {
    it('parses a profiles INSERT record', () => {
      const parsed = parseProfileInsertPayload(VALID_PAYLOAD)
      expect(parsed).toEqual({
        userId: VALID_PAYLOAD.record.id,
        email: VALID_PAYLOAD.record.email,
        username: 'newuser',
        fullName: 'New User',
        createdAt: VALID_PAYLOAD.record.created_at,
      })
    })

    it('ignores non-INSERT events', () => {
      expect(parseProfileInsertPayload({ ...VALID_PAYLOAD, type: 'UPDATE' })).toBeNull()
    })
  })

  describe('POST', () => {
    it('returns 401 when webhook secret is invalid', async () => {
      const response = await POST(makeRequest({ secret: 'bad-secret' }))
      expect(response.status).toBe(401)
      expect(mockNotify).not.toHaveBeenCalled()
    })

    it('notifies on valid profiles INSERT payload', async () => {
      const response = await POST(makeRequest({ secret: 'test-webhook-secret' }))
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.ok).toBe(true)
      expect(json.userId).toBe(VALID_PAYLOAD.record.id)
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          username: 'newuser',
        }),
      )
    })

    it('skips non-profile INSERT events without error', async () => {
      const response = await POST(
        makeRequest({
          secret: 'test-webhook-secret',
          body: { ...VALID_PAYLOAD, table: 'user_preferences' },
        }),
      )
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.skipped).toBe(true)
      expect(mockNotify).not.toHaveBeenCalled()
    })
  })
})
