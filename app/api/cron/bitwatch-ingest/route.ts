import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'
import { INGEST_SUPABASE_TIMEOUT_MS, runBitwatchIngest } from '@/lib/bitwatch/ingest'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { logRouteError } from '@/lib/error-utils'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withApiRoute } from '@/lib/api/with-api-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

export async function GET(request: NextRequest) {
  return withApiRoute(request, async () => {
    const auth = verifyCronBearer(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const supabase = createServiceRoleSupabaseClient({ timeoutMs: INGEST_SUPABASE_TIMEOUT_MS })
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    try {
      const result = await runBitwatchIngest(supabase)
      return NextResponse.json({ success: result.ok, ...result })
    } catch (error) {
      logRouteError('cron/bitwatch-ingest', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, { rateLimit: false, context: 'cron/bitwatch-ingest' })
}
