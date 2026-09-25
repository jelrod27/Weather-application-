/** @jest-environment node */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/push/subscribe/route'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }) }))
jest.mock('@/lib/supabase/service-role-client', () => ({ createServiceRoleSupabaseClient: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }) }))
jest.mock('@/lib/push/vapid', () => ({ getVapidPublicKey: () => 'configured' }))

describe('push subscription destinations', () => {
  const upsert = jest.fn().mockResolvedValue({ error: null })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(createServiceRoleSupabaseClient).mockReturnValue({ from: () => ({ upsert }) } as never)
  })

  function subscribe(endpoint: string) {
    return POST(new NextRequest('https://www.16bitweather.co/api/push/subscribe', {
      method: 'POST', body: JSON.stringify({ endpoint, keys: { p256dh: 'test-key-long-enough', auth: 'test-key-long-enough' } }),
    }))
  }

  it.each([
    'https://127.0.0.1/internal', 'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/push', 'https://attacker.example/push',
    'https://fcm.googleapis.com.evil.example/push', 'https://evilpush.apple.com/push',
    'http://fcm.googleapis.com/push', 'https://user:pass@fcm.googleapis.com/push',
    'https://fcm.googleapis.com:8443/push',
  ])('rejects %s before storing it', async (endpoint) => {
    expect((await subscribe(endpoint)).status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it.each([
    'https://fcm.googleapis.com/fcm/send/token',
    'https://updates.push.services.mozilla.com/wpush/v2/token',
    'https://web.push.apple.com/token',
    'https://wns2-bl2p.notify.windows.com/w/?token=example',
  ])('accepts a supported provider: %s', async (endpoint) => {
    expect((await subscribe(endpoint)).status).toBe(200)
  })
})
