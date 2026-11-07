/** @jest-environment node */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { fetchEnabledSevereSubscriptions } from '@/lib/services/severe-alert-subscriptions'
import { fetchEnabledGuestSubscribers } from '@/lib/services/guest-alert-subscribers'

const loaders = [fetchEnabledSevereSubscriptions, fetchEnabledGuestSubscribers]

it.each(loaders)('distinguishes failed recipient queries from successfully read empty lists (%#)', async (load) => {
  let fail = true
  const client = createClient<Database>('https://test.supabase.co', 'test-key', {
    db: { retry: false }, auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async () => new Response(JSON.stringify(fail ? { message: 'database unavailable' } : []), {
      status: fail ? 400 : 200, headers: { 'Content-Type': 'application/json' },
    }) },
  })
  await expect(load(client)).rejects.toThrow('database unavailable')
  fail = false
  await expect(load(client)).resolves.toEqual([])
})
