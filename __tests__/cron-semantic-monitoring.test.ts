/** @jest-environment node */
import * as Sentry from '@sentry/nextjs'
import { NextRequest } from 'next/server'
import { GET as severeGET } from '@/app/api/cron/severe-alerts/route'
import { GET as ingestGET } from '@/app/api/cron/bitwatch-ingest/route'
import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { deliverSevereAlertEmail } from '@/lib/services/severe-alert-email-delivery'
import { deliverGuestSevereAlertEmail } from '@/lib/services/guest-alert-email-delivery'
import { sendSeverePushNotifications } from '@/lib/push/send'
import { runBitwatchIngest } from '@/lib/bitwatch/ingest'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import type { MonitorNewAlert, MonitorNewGuestAlert, SevereMonitorRunResult } from '@/lib/services/severe-alert-types'

jest.mock('@sentry/nextjs', () => ({ captureCheckIn: jest.fn() }))
jest.mock('@/lib/services/severe-alert-monitor', () => ({ runSevereAlertMonitor: jest.fn() }))
jest.mock('@/lib/services/severe-alert-email-delivery', () => ({ deliverSevereAlertEmail: jest.fn() }))
jest.mock('@/lib/services/guest-alert-email-delivery', () => ({ deliverGuestSevereAlertEmail: jest.fn() }))
jest.mock('@/lib/push/send', () => ({ sendSeverePushNotifications: jest.fn() }))
jest.mock('@/lib/bitwatch/ingest', () => ({ runBitwatchIngest: jest.fn(), INGEST_SUPABASE_TIMEOUT_MS: 20_000 }))
jest.mock('@/lib/supabase/service-role-client', () => ({ createServiceRoleSupabaseClient: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn() }))

const monitor = jest.mocked(runSevereAlertMonitor)
const ingest = jest.mocked(runBitwatchIngest)
const checkIn = jest.mocked(Sentry.captureCheckIn)
const client = jest.mocked(createServiceRoleSupabaseClient)
const email = jest.mocked(deliverSevereAlertEmail)
const guestEmail = jest.mocked(deliverGuestSevereAlertEmail)
const push = jest.mocked(sendSeverePushNotifications)
const originalSecret = process.env.CRON_SECRET

function request(token = 'test-secret'): NextRequest {
  return new NextRequest('https://example.test/api/cron/job', {
    headers: { authorization: `Bearer ${token}` },
  })
}

function monitorResult(errors: string[] = []): SevereMonitorRunResult {
  return { subscriptionsChecked: 0, guestSubscribersChecked: 0, uniquePoints: 0,
    newAlerts: 0, guestNewAlerts: 0, endedAlerts: 0, guestEndedAlerts: 0,
    scoutAlerts: 0, allClears: 0, errors }
}

const payload: MonitorNewAlert['payload'] = {
  alertId: 'alert', event: 'Tornado Warning', headline: 'Take shelter', severity: 'Extreme',
  urgency: 'Immediate', expires: '2026-11-08T00:00:00Z', areaDesc: 'Test County',
  locationName: 'Home', savedLocationId: 'location', warningsHref: '/warnings/alert', tier: 'critical',
}
const prefs = { notifyTornado: true, notifySevereThunderstorm: true, notifyFlashFlood: true, notifyUpgrades: true }
const alert: MonitorNewAlert['alert'] = {
  id: 'alert', event: payload.event, headline: payload.headline, severity: 'Extreme', urgency: payload.urgency,
  expires: payload.expires, areaDesc: payload.areaDesc, sent: '2026-11-07T23:00:00Z',
  effective: '2026-11-07T23:00:00Z', ends: payload.expires, description: '', instruction: '',
  certainty: 'Observed', response: 'Shelter', sender: 'NWS', geometry: null, hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
  messageType: 'Alert', warningEventId: 'event', vtecAction: null, vtecRaw: [], ugc: [], affectedZones: [], motion: null,
}
const registered: MonitorNewAlert = { subscription: { id: 'subscription', user_id: 'user',
  saved_location_id: 'location', latitude: 35, longitude: -97, locationLabel: 'Home', ...prefs },
  alert, userAlertId: 'user-alert', payload }
const guest: MonitorNewGuestAlert = { subscriber: { id: 'guest', email: 'guest@example.test',
  latitude: 35, longitude: -97, locationLabel: 'Home', enabled: true, verifiedAt: '2026-11-01T00:00:00Z', ...prefs },
  alert, deliveryId: 'guest-delivery', payload }

function dispatchBoth(): void {
  monitor.mockImplementation(async (_supabase, hooks) => {
    await hooks?.onNewAlert?.(registered)
    await hooks?.onNewGuestAlert?.(guest)
    return { ...monitorResult(), subscriptionsChecked: 1, guestSubscribersChecked: 1, newAlerts: 1, guestNewAlerts: 1 }
  })
}

function expectTerminal(slug: string, status: 'ok' | 'error'): void {
  expect(checkIn).toHaveBeenCalledTimes(2)
  expect(checkIn).toHaveBeenNthCalledWith(1, { monitorSlug: slug, status: 'in_progress' }, {
    schedule: { type: 'crontab', value: '* * * * *' }, timezone: 'UTC', checkinMargin: 1, maxRuntime: 1,
  })
  expect(checkIn).toHaveBeenNthCalledWith(2, expect.objectContaining({ monitorSlug: slug, checkInId: 'check-in-id', status }))
}

beforeEach(() => {
  jest.resetAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  client.mockReturnValue({} as NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>)
  checkIn.mockReturnValue('check-in-id')
  monitor.mockResolvedValue(monitorResult())
  ingest.mockResolvedValue({ ok: true, skipped: false, messages: 0, activeEvents: 0, watermark: null })
  email.mockResolvedValue({ sent: true })
  guestEmail.mockResolvedValue({ sent: true })
  push.mockResolvedValue({ sent: 1, failed: 0, skipped: false })
})
afterAll(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = originalSecret
})

describe.each([
  { slug: 'severe-alerts', handler: severeGET },
  { slug: 'bitwatch-ingest', handler: ingestGET },
])('$slug authenticated monitoring', ({ slug, handler }) => {
  it('rejects unauthorized calls before check-ins or database setup', async () => {
    expect((await handler(request('wrong'))).status).toBe(401)
    expect(checkIn).not.toHaveBeenCalled()
    expect(client).not.toHaveBeenCalled()
  })
  it('does not create a check-in when authentication is not configured', async () => {
    delete process.env.CRON_SECRET
    expect((await handler(request())).status).toBe(500)
    expect(checkIn).not.toHaveBeenCalled()
  })
  it('reports an authenticated empty successful run as healthy', async () => {
    const response = await handler(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true })
    expectTerminal(slug, 'ok')
  })
  it('reports missing service configuration as a failed run', async () => {
    client.mockReturnValue(null)
    expect((await handler(request())).status).toBe(500)
    expectTerminal(slug, 'error')
  })
  it('reports thrown processing errors without exposing their details', async () => {
    monitor.mockRejectedValue(new Error('private database detail'))
    ingest.mockRejectedValue(new Error('private database detail'))
    const response = await handler(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal server error' })
    expectTerminal(slug, 'error')
  })
  it('reports database client construction exceptions as failed runs', async () => {
    client.mockImplementation(() => { throw new Error('client setup failed') })
    expect((await handler(request())).status).toBe(500)
    expectTerminal(slug, 'error')
  })
  it.each(['start', 'finish'] as const)('isolates a thrown %s check-in from successful processing', async (phase) => {
    if (phase === 'start') checkIn.mockImplementationOnce(() => { throw new Error('Sentry offline') })
    else checkIn.mockReturnValueOnce('check-in-id').mockImplementationOnce(() => { throw new Error('Sentry offline') })
    const response = await handler(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true })
    expect(slug === 'severe-alerts' ? monitor : ingest).toHaveBeenCalledTimes(1)
  })
  it('preserves processing errors when both check-ins throw', async () => {
    checkIn.mockImplementation(() => { throw new Error('Sentry offline') })
    monitor.mockRejectedValue(new Error('private database detail'))
    ingest.mockRejectedValue(new Error('private database detail'))
    const response = await handler(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal server error' })
    expect(checkIn).toHaveBeenCalledTimes(2)
    expect(checkIn).toHaveBeenLastCalledWith(expect.objectContaining({ monitorSlug: slug, status: 'error' }))
  })
  it('isolates rejected check-in instrumentation from a semantic failure', async () => {
    // The SDK is synchronous today; guard rejected instrumentation if it ever becomes async.
    checkIn.mockImplementation(() => Promise.reject(new Error('Sentry unavailable')) as unknown as string)
    monitor.mockResolvedValue(monitorResult(['point fetch failed']))
    ingest.mockResolvedValue({ ok: false, skipped: false, messages: 0, activeEvents: 0, watermark: null, error: 'ingest failed' })
    const response = await handler(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ success: false })
  })
})

describe('severe delivery semantics', () => {
  it('returns partial monitor errors as a failed run', async () => {
    monitor.mockResolvedValue({ ...monitorResult(['point:35,-97: source unavailable']), subscriptionsChecked: 3 })
    const response = await severeGET(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ success: false, subscriptionsChecked: 3, errors: ['point:35,-97: source unavailable'] })
    expectTerminal('severe-alerts', 'error')
  })
  it('still dispatches email and push to registered and guest recipients', async () => {
    dispatchBoth()
    const response = await severeGET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, emailsSent: 2, emailsFailed: 0 })
    expect(email).toHaveBeenCalledWith(client.mock.results[0].value, registered)
    expect(guestEmail).toHaveBeenCalledWith(client.mock.results[0].value, guest)
    expect(push).toHaveBeenNthCalledWith(1, client.mock.results[0].value, { userId: 'user' }, payload)
    expect(push).toHaveBeenNthCalledWith(2, client.mock.results[0].value, { guestSubscriberId: 'guest' }, payload)
    expectTerminal('severe-alerts', 'ok')
  })
  it.each(['registered', 'guest'])('reports failed %s email while preserving push dispatch', async (recipient) => {
    dispatchBoth()
    if (recipient === 'registered') email.mockResolvedValue({ sent: false, reason: 'provider rejected' })
    else guestEmail.mockResolvedValue({ sent: false, reason: 'provider rejected' })
    const response = await severeGET(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ success: false, emailsSent: 1, emailsFailed: 1 })
    expect(push).toHaveBeenCalledTimes(2)
    expectTerminal('severe-alerts', 'error')
  })
  it('treats intentional email and push skips as healthy', async () => {
    dispatchBoth()
    email.mockResolvedValue({ sent: false, skipped: true })
    guestEmail.mockResolvedValue({ sent: false, skipped: true })
    push.mockResolvedValue({ sent: 0, failed: 0, skipped: true })
    const response = await severeGET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, emailsSkipped: 2, emailsFailed: 0 })
    expectTerminal('severe-alerts', 'ok')
  })
  it('reports push delivery failures as failed runs', async () => {
    dispatchBoth()
    push.mockResolvedValueOnce({ sent: 0, failed: 1, skipped: false })
    const response = await severeGET(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ success: false, pushesFailed: 1 })
    expectTerminal('severe-alerts', 'error')
  })
})

describe('bitwatch ingest semantics', () => {
  it('reports returned ingest errors as failed runs', async () => {
    ingest.mockResolvedValue({ ok: false, skipped: false, messages: 4, activeEvents: 2, watermark: null, error: 'source unavailable' })
    const response = await ingestGET(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ success: false, ok: false, messages: 4 })
    expectTerminal('bitwatch-ingest', 'error')
  })
  it('keeps a duplicate or leased run skip healthy and retains the database timeout', async () => {
    ingest.mockResolvedValue({ ok: true, skipped: true, messages: 0, activeEvents: 0, watermark: null })
    const response = await ingestGET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, skipped: true })
    expect(client).toHaveBeenCalledWith({ timeoutMs: 20_000 })
    expectTerminal('bitwatch-ingest', 'ok')
  })
})
