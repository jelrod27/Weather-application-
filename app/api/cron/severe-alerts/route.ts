import type { NextRequest } from 'next/server'
import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'
import { deliverSevereAlertAllClearEmail, deliverSevereAlertEmail } from '@/lib/services/severe-alert-email-delivery'
import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const auth = verifyCronBearer(request)
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status })
  }

  const supabase = createServiceRoleSupabaseClient()
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    let emailsSent = 0
    let emailsFailed = 0
    let emailsSkipped = 0

    let allClearEmailsSent = 0

    const result = await runSevereAlertMonitor(supabase, {
      onNewAlert: async (item) => {
        const emailResult = await deliverSevereAlertEmail(supabase, item)
        if (emailResult.sent) emailsSent += 1
        else if (emailResult.skipped) emailsSkipped += 1
        else emailsFailed += 1
      },
      onAllClear: async (item) => {
        const emailResult = await deliverSevereAlertAllClearEmail(supabase, item)
        if (emailResult.sent) allClearEmailsSent += 1
      },
    })

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      emailsSent,
      emailsSkipped,
      emailsFailed,
      allClearEmailsSent,
      ...result,
    })
  } catch (error) {
    console.error('[cron/severe-alerts] unhandled error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
