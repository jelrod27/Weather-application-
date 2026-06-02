import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { PLACEHOLDER_URL, PLACEHOLDER_SERVICE_KEY } from '@/lib/supabase/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    // Constant-time bearer-token compare. The previous `!==` short-circuited
    // on first differing byte; remote timing attacks over HTTPS are noisy in
    // practice but the fix is one line.
    const authHeader = request.headers.get('authorization') ?? ''
    const expected = `Bearer ${cronSecret}`
    const a = Buffer.from(authHeader)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_SERVICE_KEY

    if (supabaseUrl === PLACEHOLDER_URL || serviceRoleKey === PLACEHOLDER_SERVICE_KEY) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('[cron/keep-alive] Database ping failed:', error.message)
      return Response.json({ error: 'Service unavailable' }, { status: 503 })
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Database is alive',
    })
  } catch (error) {
    console.error('[cron/keep-alive] unhandled error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
