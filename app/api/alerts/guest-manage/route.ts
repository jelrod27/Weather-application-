import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ApiError, withApiRoute } from '@/lib/api/with-api-route'
import {
  deleteGuestSubscriber,
  findGuestByManageToken,
  setGuestEnabled,
} from '@/lib/services/guest-alert-subscribers'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

const actionSchema = z.object({
  token: z.string().trim().min(16).max(200),
  action: z.enum(['pause', 'resume', 'delete']),
})

export async function POST(request: NextRequest) {
  return withApiRoute(
    request,
    async ({ request: req }) => {
      const supabase = createServiceRoleSupabaseClient()
      if (!supabase) throw new ApiError(503, 'Alerts are not configured')

      let json: unknown
      try {
        json = await req.json()
      } catch {
        throw new ApiError(400, 'Invalid JSON body')
      }

      const parsed = actionSchema.safeParse(json)
      if (!parsed.success) throw new ApiError(400, 'Invalid manage request')

      const subscriber = await findGuestByManageToken(supabase, parsed.data.token)
      if (!subscriber) throw new ApiError(404, 'Manage link is invalid')

      if (parsed.data.action === 'delete') {
        await deleteGuestSubscriber(supabase, subscriber.id)
        return NextResponse.json({ ok: true, status: 'deleted' })
      }

      await setGuestEnabled(supabase, subscriber.id, parsed.data.action === 'resume')
      return NextResponse.json({
        ok: true,
        status: parsed.data.action === 'resume' ? 'enabled' : 'paused',
      })
    },
    { context: 'alerts/guest-manage', errorMessage: 'Could not update subscription' },
  )
}
