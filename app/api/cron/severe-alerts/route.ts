import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'
import { deliverSevereAlertEmail } from '@/lib/services/severe-alert-email-delivery'
import { deliverGuestSevereAlertEmail } from '@/lib/services/guest-alert-email-delivery'
import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { sendSeverePushNotifications } from '@/lib/push/send'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { logRouteError } from '@/lib/error-utils'
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

    const supabase = createServiceRoleSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    try {
      let emailsSent = 0
      let emailsFailed = 0
      let emailsSkipped = 0

      const result = await runSevereAlertMonitor(supabase, {
        onNewAlert: async (item) => {
          const emailResult = await deliverSevereAlertEmail(supabase, item)
          if (emailResult.sent) emailsSent += 1
          else if (emailResult.skipped) emailsSkipped += 1
          else emailsFailed += 1
          await sendSeverePushNotifications(supabase, { userId: item.subscription.user_id }, item.payload)
        },
        onNewGuestAlert: async (item) => {
          const emailResult = await deliverGuestSevereAlertEmail(supabase, item)
          if (emailResult.sent) emailsSent += 1
          else if (emailResult.skipped) emailsSkipped += 1
          else emailsFailed += 1
          await sendSeverePushNotifications(
            supabase,
            { guestSubscriberId: item.subscriber.id },
            item.payload,
          )
        },
      })

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        emailsSent,
        emailsSkipped,
        emailsFailed,
        ...result,
      })
    } catch (error) {
      logRouteError('cron/severe-alerts', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, { rateLimit: false, context: 'cron/severe-alerts' })
}
