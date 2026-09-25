/** @jest-environment node */

import { Readable } from 'node:stream'
import { sendSeverePushNotifications } from '@/lib/push/send'
import { requestPublicHttps } from '@/lib/security/public-https'
import type { SevereWeatherAlertPayload } from '@/lib/services/severe-alert-types'

jest.mock('@/lib/push/vapid', () => ({ getVapidConfig: () => ({ subject: 'mailto:test@example.com', publicKey: 'test', privateKey: 'test' }) }))
jest.mock('@/lib/security/public-https', () => ({ requestPublicHttps: jest.fn() }))
jest.mock('web-push', () => ({ generateRequestDetails: (subscription: { endpoint: string }) => ({ endpoint: subscription.endpoint, headers: {}, body: Buffer.from('encrypted') }) }))

const payload: SevereWeatherAlertPayload = {
  alertId: 'alert', event: 'Tornado Warning', headline: 'Take shelter', severity: 'Extreme', urgency: 'Immediate',
  expires: '2099-01-01T00:00:00Z', areaDesc: 'Test', locationName: 'Test', savedLocationId: 'place', warningsHref: '/warnings',
}

function client(endpoints: string[]) {
  const selection = { data: endpoints.map((endpoint, i) => ({ id: `push-${i}`, endpoint, p256dh: 'key', auth: 'key' })), error: null }
  const load = jest.fn().mockResolvedValue(selection)
  const cleanup = jest.fn().mockResolvedValue({ error: null })
  const remove = jest.fn().mockReturnValue(Object.assign(Promise.resolve({ error: null }), { abortSignal: cleanup }))
  return {
    remove, load, cleanup,
    supabase: { from: () => ({
      select: () => ({ eq: () => Object.assign(Promise.resolve(selection), { abortSignal: load }) }),
      delete: () => ({ eq: remove }),
    }) },
  }
}

beforeEach(() => { jest.clearAllMocks() })

it('never sends to previously stored untrusted endpoints', async () => {
  const { supabase } = client(['https://127.0.0.1/internal', 'https://attacker.example/push'])
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  try {
    expect(await sendSeverePushNotifications(supabase as never, { userId: 'u1' }, payload)).toEqual({ sent: 0, failed: 2, skipped: false })
    expect(requestPublicHttps).not.toHaveBeenCalled()
  } finally { log.mockRestore() }
})

it('applies the recipient deadline to subscription loading', async () => {
  const { supabase, load } = client([])
  const controller = new AbortController()
  const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
  try {
    await sendSeverePushNotifications(supabase as never, { userId: 'u1' }, payload)
    expect(load).toHaveBeenCalledWith(controller.signal)
  } finally { timeout.mockRestore() }
})

it('applies the same recipient deadline to expired-subscription cleanup', async () => {
  const { supabase, load, cleanup } = client(['https://fcm.googleapis.com/expired'])
  const controller = new AbortController()
  const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
  const response = Object.assign(Readable.from([]), { statusCode: 410 })
  jest.mocked(requestPublicHttps).mockResolvedValue(response as never)
  try {
    await sendSeverePushNotifications(supabase as never, { userId: 'u1' }, payload)
    expect(load).toHaveBeenCalledWith(controller.signal)
    expect(cleanup).toHaveBeenCalledWith(controller.signal)
  } finally { timeout.mockRestore() }
})

it('keeps guest delivery ownership and removes expired push subscriptions', async () => {
  const { supabase, remove } = client(['https://fcm.googleapis.com/expired'])
  const response = Object.assign(Readable.from([]), { statusCode: 410 })
  jest.mocked(requestPublicHttps).mockResolvedValue(response as never)
  expect(await sendSeverePushNotifications(supabase as never, { guestSubscriberId: 'g1' }, payload)).toMatchObject({ sent: 0, failed: 1 })
  expect(remove).toHaveBeenCalledWith('id', 'push-0')
  expect(response.destroyed).toBe(true)
})

it('does not let many devices multiply a recipient deadline', async () => {
  const { supabase } = client(Array.from({ length: 20 }, (_, i) => `https://fcm.googleapis.com/push/${i}`))
  const controller = new AbortController()
  const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  jest.mocked(requestPublicHttps).mockImplementation(async (_endpoint, { signal }) => {
    expect(signal).toBe(controller.signal)
    controller.abort()
    throw new Error('deadline exceeded')
  })
  try {
    expect(await sendSeverePushNotifications(supabase as never, { userId: 'u1' }, payload)).toEqual({ sent: 0, failed: 20, skipped: false })
    expect(timeout).toHaveBeenCalledWith(3000)
    expect(requestPublicHttps).toHaveBeenCalledTimes(1)
  } finally { timeout.mockRestore(); log.mockRestore() }
})

it('accepts provider success without buffering or waiting for its response body', async () => {
  const { supabase } = client(['https://web.push.apple.com/push'])
  const response = Object.assign(new Readable({ read() {} }), { statusCode: 201 })
  jest.mocked(requestPublicHttps).mockResolvedValue(response as never)
  expect(await sendSeverePushNotifications(supabase as never, { userId: 'u1' }, payload)).toMatchObject({ sent: 1, failed: 0 })
  expect(response.destroyed).toBe(true)
})
