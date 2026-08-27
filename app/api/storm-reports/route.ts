/**
 * Community storm reports — GET approved (public), POST pending (auth).
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  stormReportSubmitSchema,
  formatStormReportValidationErrors,
} from '@/lib/validations/storm-report'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('storm_reports')
      .select('id, report_type, description, latitude, longitude, location_name, image_url, occurred_at, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({ reports: [], total: 0, note: 'storm_reports table not deployed' })
      }
      logRouteError('storm-reports GET', error)
      return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
    }

    return NextResponse.json(
      { reports: data ?? [], total: data?.length ?? 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
          ...rateLimitHeaders,
        },
      }
    )
  } catch (e) {
    logRouteError('storm-reports GET', e)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
  }, { context: 'storm-reports GET' })
}

export async function POST(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: rateLimitHeaders })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = stormReportSubmitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatStormReportValidationErrors(parsed.error) },
        { status: 400 }
      )
    }

    const v = parsed.data
    const insertRow = {
      user_id: user.id,
      report_type: v.report_type,
      description: v.description,
      latitude: v.latitude,
      longitude: v.longitude,
      location_name: v.location_name?.trim() || null,
      image_url: v.image_url?.trim() || null,
      occurred_at: v.occurred_at ?? new Date().toISOString(),
      status: 'pending' as const,
    }

    // No .select() read-back: new rows are status 'pending', and the only
    // SELECT RLS policy is USING (status = 'approved'), so a RETURNING
    // representation would be denied (the insert succeeds, then the whole
    // request errors). The form does not use the new row's id.
    const { error } = await supabase
      .from('storm_reports')
      // Typed client schema may lag migrations in dev; runtime RLS still applies.
      .insert(insertRow as never)

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json(
          { error: 'Storm reports are not enabled on this deployment yet.' },
          { status: 503 }
        )
      }
      logRouteError('storm-reports POST', error)
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    logRouteError('storm-reports POST', e)
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }
  }, { rateLimitBucket: 'account', context: 'storm-reports POST' })
}
