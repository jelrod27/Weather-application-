/** @jest-environment node */

import { createElement, type ReactElement, type ReactNode } from 'react'
import { Writable } from 'node:stream'
import WarningDetailPage, { generateMetadata } from '@/app/warnings/[id]/page'
import { loadCanonicalAlertBySlug } from '@/lib/bitwatch/ingest'
import { fetchActiveAlertsDetail, type NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

// Use the real server React export and Flight renderer that Next ships. React's
// default client export makes cache a no-op; a hand-written cache mock would
// conceal request-lifetime regressions.
jest.mock('react', () => jest.requireActual('next/dist/compiled/react/react.react-server'))
jest.mock('next/dist/compiled/react', () => jest.requireActual('next/dist/compiled/react/react.react-server'))
jest.mock('react/jsx-runtime', () => jest.requireActual('next/dist/compiled/react/jsx-runtime.react-server'))
jest.mock('next/link', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/page-wrapper', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/warnings/warning-recovery', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/warnings/warning-area-map', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/warnings/warning-detail-body', () => ({ WarningDetailBody: () => null }))
jest.mock('@/lib/supabase/service-role-client', () => ({ createServiceRoleSupabaseClient: jest.fn() }))
jest.mock('@/lib/bitwatch/ingest', () => ({ loadCanonicalAlertBySlug: jest.fn() }))
jest.mock('@/lib/services/nws-alerts-service', () => ({ fetchActiveAlertsDetail: jest.fn() }))

const { renderToPipeableStream } = jest.requireActual<{
  renderToPipeableStream(model: ReactNode, manifest: Record<string, never>, options: { onError(error: unknown): void }): { pipe(destination: Writable): void }
}>('next/dist/compiled/react-server-dom-webpack/server.node')

function alert(id = 'test-alert', event = 'Tornado Warning'): NWSAlertDetail {
  return {
    id, event, headline: event, areaDesc: 'Travis County', severity: 'Extreme',
    urgency: 'Immediate', expires: '2099-01-01T01:00:00Z',
    sent: '2099-01-01T00:00:00Z', effective: '2099-01-01T00:00:00Z',
    ends: '2099-01-01T01:00:00Z', description: 'Take shelter', instruction: 'Go indoors',
    certainty: 'Observed', response: 'Shelter', sender: 'NWS', geometry: null,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
    messageType: 'Alert', warningEventId: id, vtecAction: null, vtecRaw: [],
    ugc: [], affectedZones: [], motion: null,
  }
}

// Every render creates a fresh genuine React request/cache. Probe captures the
// route results before rendering client UI, which existing recovery tests cover.
async function renderRequest<T>(work: () => Promise<T>): Promise<T> {
  let result: T | undefined
  async function Probe(): Promise<null> {
    result = await work()
    return null
  }
  await new Promise<void>((resolve, reject) => {
    const destination = new Writable({ write(_chunk, _encoding, callback) { callback() } })
    destination.on('finish', resolve)
    destination.on('error', reject)
    renderToPipeableStream(createElement(Probe), {}, { onError: reject }).pipe(destination)
  })
  if (result === undefined) throw new Error('Server render did not resolve the warning request')
  return result
}

function loadRoute(id = 'test-alert') {
  const props = {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({ returnTo: '/warnings?state=TX' }),
  }
  return Promise.all([generateMetadata(props), WarningDetailPage(props)])
}

function recoveryProps(page: ReactElement): { reason: string; returnTo: string; id: string } {
  return (page.props as { children: ReactElement<{ reason: string; returnTo: string; id: string }> }).children.props
}

describe('warning detail request loading', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(createServiceRoleSupabaseClient).mockReturnValue(null)
    jest.mocked(fetchActiveAlertsDetail).mockResolvedValue([alert()])
  })

  it('shares the canonical lookup between concurrent metadata and page rendering', async () => {
    const client = {} as NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>
    jest.mocked(createServiceRoleSupabaseClient).mockReturnValue(client)
    jest.mocked(loadCanonicalAlertBySlug).mockResolvedValue(alert())

    const [metadata] = await renderRequest(() => loadRoute())

    expect(metadata.title).toBe('Tornado Warning — Travis County')
    expect(loadCanonicalAlertBySlug).toHaveBeenCalledTimes(1)
    expect(loadCanonicalAlertBySlug).toHaveBeenCalledWith(client, 'test-alert')
    expect(fetchActiveAlertsDetail).not.toHaveBeenCalled()
  })

  it('shares one active-feed fallback when the canonical warning is absent', async () => {
    const client = {} as NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>
    jest.mocked(createServiceRoleSupabaseClient).mockReturnValue(client)
    jest.mocked(loadCanonicalAlertBySlug).mockResolvedValue(null)

    const [metadata] = await renderRequest(() => loadRoute())

    expect(metadata.title).toBe('Tornado Warning — Travis County')
    expect(loadCanonicalAlertBySlug).toHaveBeenCalledTimes(1)
    expect(fetchActiveAlertsDetail).toHaveBeenCalledTimes(1)
  })

  it('keeps distinct warning identifiers separate within the same request', async () => {
    jest.mocked(fetchActiveAlertsDetail).mockResolvedValue([alert(), alert('second-alert', 'Flood Warning')])

    const [[first], [second]] = await renderRequest(() => Promise.all([loadRoute(), loadRoute('second-alert')]))

    expect(first.title).toBe('Tornado Warning — Travis County')
    expect(second.title).toBe('Flood Warning — Travis County')
    expect(fetchActiveAlertsDetail).toHaveBeenCalledTimes(2)
  })

  it('loads changed warning data on the next request', async () => {
    const [first] = await renderRequest(() => loadRoute())
    jest.mocked(fetchActiveAlertsDetail).mockResolvedValue([alert('test-alert', 'Updated Tornado Warning')])
    const [second] = await renderRequest(() => loadRoute())

    expect(first.title).toBe('Tornado Warning — Travis County')
    expect(second.title).toBe('Updated Tornado Warning — Travis County')
    expect(fetchActiveAlertsDetail).toHaveBeenCalledTimes(2)
  })

  it('shares failures for a request and retries successfully on a later request', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.mocked(fetchActiveAlertsDetail).mockRejectedValue(new Error('offline'))
      const [metadata, page] = await renderRequest(() => loadRoute())
      expect(metadata).toMatchObject({ title: 'Warning', robots: { index: false } })
      expect(recoveryProps(page)).toMatchObject({ reason: 'unavailable', id: 'test-alert', returnTo: '/warnings?state=TX' })
      expect(fetchActiveAlertsDetail).toHaveBeenCalledTimes(1)

      jest.mocked(fetchActiveAlertsDetail).mockResolvedValue([alert()])
      const [recovered] = await renderRequest(() => loadRoute())
      expect(recovered.title).toBe('Tornado Warning — Travis County')
      expect(fetchActiveAlertsDetail).toHaveBeenCalledTimes(2)
    } finally {
      log.mockRestore()
    }
  })

  it('retains inactive recovery and checks the feed again on a later request', async () => {
    jest.mocked(fetchActiveAlertsDetail).mockResolvedValue([])
    const [metadata, page] = await renderRequest(() => loadRoute())

    expect(metadata).toMatchObject({ title: 'Warning expired', robots: { index: false } })
    expect(recoveryProps(page)).toMatchObject({ reason: 'inactive', id: 'test-alert', returnTo: '/warnings?state=TX' })
    expect(fetchActiveAlertsDetail).toHaveBeenCalledTimes(1)

    jest.mocked(fetchActiveAlertsDetail).mockResolvedValue([alert()])
    const [recovered] = await renderRequest(() => loadRoute())
    expect(recovered.title).toBe('Tornado Warning — Travis County')
    expect(fetchActiveAlertsDetail).toHaveBeenCalledTimes(2)
  })
})
