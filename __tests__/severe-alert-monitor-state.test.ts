/** @jest-environment node */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { loadMonitorStates } from '@/lib/services/severe-alert-monitor-state'

function makeClient(respond: (url: URL) => Response | Promise<Response>) {
  const urls: URL[] = []
  const client = createClient<Database>('https://state-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { retry: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input))
      urls.push(url)
      return respond(url)
    } },
  })
  return { client, urls }
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
}

describe('batched monitor state with the Supabase HTTP client', () => {
  it('uses one filtered request with only required columns and retains missing rows as empty state', async () => {
    const { client, urls } = makeClient(() => json([{ subscription_id: 'a', active_alert_ids: ['warning-1'] }]))
    const states = await loadMonitorStates(client, 'account', ['a', 'b', 'a'])
    expect(urls).toHaveLength(1)
    expect(urls[0].pathname).toBe('/rest/v1/alert_monitor_state')
    expect(urls[0].searchParams.get('select')).toBe('subscription_id,active_alert_ids')
    expect(urls[0].searchParams.get('subscription_id')).toBe('in.(a,b)')
    expect(states.get('a')).toEqual(['warning-1'])
    expect(states.get('b')).toEqual([])
  })

  it('chunks large guest lists and preserves state across chunk boundaries', async () => {
    const ids = Array.from({ length: 205 }, (_, index) => `guest-${index}`)
    const { client, urls } = makeClient((url) => {
      const requested = url.searchParams.get('subscriber_id')!.slice(4, -1).split(',')
      expect(requested.length).toBeLessThanOrEqual(100)
      return json(requested.map((id) => ({ subscriber_id: id, active_alert_ids: [`warning-${id}`] })))
    })
    const states = await loadMonitorStates(client, 'guest', ids)
    expect(urls).toHaveLength(3)
    expect(urls.every((url) => url.pathname.endsWith('/guest_alert_monitor_state'))).toBe(true)
    expect(states.get('guest-99')).toEqual(['warning-guest-99'])
    expect(states.get('guest-100')).toEqual(['warning-guest-100'])
    expect(states.get('guest-204')).toEqual(['warning-guest-204'])
  })

  it('marks only a failed chunk unreadable and continues later chunks', async () => {
    let call = 0
    const { client, urls } = makeClient(() => {
      call += 1
      return call === 1
        ? new Response(JSON.stringify({ message: 'state unavailable' }), { status: 400 })
        : json([])
    })
    const ids = Array.from({ length: 101 }, (_, index) => `sub-${index}`)
    const states = await loadMonitorStates(client, 'account', ids)
    expect(urls).toHaveLength(2)
    expect(states.get('sub-0')).toBeInstanceOf(Error)
    expect(states.get('sub-99')).toBeInstanceOf(Error)
    expect(states.get('sub-100')).toEqual([])
  })

  it('does not treat malformed state as empty history', async () => {
    const { client } = makeClient(() => json([
      { subscription_id: 'a', active_alert_ids: null },
      { subscription_id: 'b', active_alert_ids: ['warning'] },
    ]))
    const states = await loadMonitorStates(client, 'account', ['a', 'b'])
    expect(states.get('a')).toBeInstanceOf(Error)
    expect(states.get('b')).toEqual(['warning'])
  })

  it('fails closed for malformed responses and transport failures', async () => {
    for (const respond of [() => json(null), () => json([{ active_alert_ids: [] }]), () => { throw new Error('transport failed') }]) {
      const { client } = makeClient(respond)
      const states = await loadMonitorStates(client, 'guest', ['guest-a'])
      expect(states.get('guest-a')).toBeInstanceOf(Error)
    }
  })

  it('does not query for an empty list', async () => {
    const { client, urls } = makeClient(() => { throw new Error('unexpected request') })
    expect(await loadMonitorStates(client, 'account', [])).toEqual(new Map())
    expect(urls).toEqual([])
  })
})
