import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ApiError, withApiRoute } from '@/lib/api/with-api-route'
import { findGuestByManageToken } from '@/lib/services/guest-alert-subscribers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { getVapidPublicKey } from '@/lib/push/vapid'

const bodySchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(8).max(200),
    auth: z.string().min(8).max(200),
  }),
  guestToken: z.string().min(16).max(200).optional(),
})

export async function POST(request: NextRequest) {
  return withApiRoute(
    request,
    async ({ request: req }) => {
      if (!getVapidPublicKey()) throw new ApiError(404, 'Web push is not configured')

      const service = createServiceRoleSupabaseClient()
      if (!service) throw new ApiError(503, 'Push is not configured')

      let json: unknown
      try {
        json = await req.json()
      } catch {
        throw new ApiError(400, 'Invalid JSON body')
      }

      const parsed = bodySchema.safeParse(json)
      if (!parsed.success) throw new ApiError(400, 'Invalid push subscription')

      let userId: string | null = null
      let guestSubscriberId: string | null = null

      if (parsed.data.guestToken) {
        const guest = await findGuestByManageToken(service, parsed.data.guestToken)
        if (!guest) throw new ApiError(401, 'Invalid manage token')
        guestSubscriberId = guest.id
      } else {
        const supabase = await createServerSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new ApiError(401, 'Sign in or use a manage link to enable push')
        userId = user.id
      }

      const { error } = await service.from('push_subscriptions').upsert(
        {
          user_id: userId,
          guest_subscriber_id: guestSubscriberId,
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
        } as never,
        { onConflict: 'endpoint' },
      )

      if (error) throw new ApiError(500, 'Could not save push subscription')
      return NextResponse.json({ ok: true })
    },
    { context: 'push/subscribe', errorMessage: 'Could not subscribe to push', rateLimitBucket: 'account' },
  )
}
