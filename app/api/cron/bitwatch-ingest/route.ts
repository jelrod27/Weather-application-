import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'
import { INGEST_SUPABASE_TIMEOUT_MS, runBitwatchIngest } from '@/lib/bitwatch/ingest'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { logRouteError } from '@/lib/error-utils'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

export async function GET(request: NextRequest) {
  const auth = verifyCronBearer(request)
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status })
  }

  const supabase = createServiceRoleSupabaseClient({ timeoutMs: INGEST_SUPABASE_TIMEOUT_MS })
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const result = await runBitwatchIngest(supabase)
    return Response.json({ success: result.ok, ...result })
  } catch (error) {
    logRouteError('cron/bitwatch-ingest', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
