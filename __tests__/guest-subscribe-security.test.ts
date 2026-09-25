/** @jest-environment node */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/alerts/guest-subscribe/route'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { upsertGuestSubscriber } from '@/lib/services/guest-alert-subscribers'
import { sendGuestVerifyEmail, sendGuestManageEmail } from '@/lib/services/guest-alert-email'

jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }) }))
jest.mock('@/lib/supabase/service-role-client', () => ({ createServiceRoleSupabaseClient: jest.fn() }))
jest.mock('@/lib/security/turnstile', () => ({ requestIp: () => '203.0.113.1', verifyTurnstileToken: async () => true }))
jest.mock('@/lib/services/guest-alert-subscribers', () => ({ upsertGuestSubscriber: jest.fn() }))
jest.mock('@/lib/services/guest-alert-email', () => ({ sendGuestVerifyEmail: jest.fn(), sendGuestManageEmail: jest.fn() }))

describe('guest email recipient cooldown', () => {
  const rpc = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    rpc.mockResolvedValue({ data: true, error: null })
    jest.mocked(createServiceRoleSupabaseClient).mockReturnValue({ rpc } as never)
    jest.mocked(upsertGuestSubscriber).mockResolvedValue({
      subscriber: { email: 'owner@example.com', locationLabel: 'Test' } as never,
      verifyToken: 'verify', manageToken: 'manage', alreadyVerified: false,
    })
    jest.mocked(sendGuestVerifyEmail).mockResolvedValue({ sent: true })
    jest.mocked(sendGuestManageEmail).mockResolvedValue({ sent: true })
  })

  const subscribe = (email = 'owner@example.com') => POST(new NextRequest('https://www.16bitweather.co/api/alerts/guest-subscribe', {
    method: 'POST', body: JSON.stringify({ email, lat: 40, lon: -100, locationLabel: 'Test' }),
  }))

  it('returns the same response during cooldown without sending or rotating tokens', async () => {
    const accepted = await (await subscribe()).json()
    jest.mocked(upsertGuestSubscriber).mockClear()
    jest.mocked(sendGuestVerifyEmail).mockClear()
    rpc.mockResolvedValue({ data: false, error: null })
    expect(await (await subscribe()).json()).toEqual(accepted)
    expect(upsertGuestSubscriber).not.toHaveBeenCalled()
    expect(sendGuestVerifyEmail).not.toHaveBeenCalled()
    expect(sendGuestManageEmail).not.toHaveBeenCalled()
  })

  it('fails closed when the shared quota cannot be claimed', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } })
    expect((await subscribe()).status).toBe(503)
    expect(upsertGuestSubscriber).not.toHaveBeenCalled()
    expect(sendGuestVerifyEmail).not.toHaveBeenCalled()
  })

  it('uses the same hashed quota key across email casing and whitespace', async () => {
    await subscribe(' Owner@Example.com ')
    await subscribe('owner@example.com')
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1])
    expect(rpc.mock.calls[0][1]).toEqual({ p_recipient_hash: expect.stringMatching(/^[a-f0-9]{64}$/) })
  })
})
