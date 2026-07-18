/**
 * AeroAPI usage observability endpoint.
 *
 * Returns the current and prior UTC month's query counts from
 * `public.aeroapi_usage`. Gated by the same Bearer cron secret as
 * /api/cron/keep-alive — not exposed to authenticated or anon users.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/aeroapi-usage
 *   { "cap": 800, "current": { "month": "2026-05", "queryCount": 137 },
 *     "prior":   { "month": "2026-04", "queryCount": 462 } }
 */

import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { PLACEHOLDER_URL, PLACEHOLDER_SERVICE_KEY } from '@/lib/supabase/constants';
import { AEROAPI_DEFAULT_MONTHLY_CAP } from '@/lib/services/aeroapi-usage';
import { verifyCronBearer } from '@/lib/cron/verify-cron-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function utcMonthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function priorUtcMonthKey(d: Date): string {
  const prior = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return utcMonthKey(prior);
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyCronBearer(request);
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_SERVICE_KEY;
    if (supabaseUrl === PLACEHOLDER_URL || serviceRoleKey === PLACEHOLDER_SERVICE_KEY) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const currentMonth = utcMonthKey(now);
    const priorMonth = priorUtcMonthKey(now);

    const { data, error } = await supabase
      .from('aeroapi_usage')
      .select('month, query_count, updated_at')
      .in('month', [currentMonth, priorMonth]);

    if (error) {
      console.error('[cron/aeroapi-usage] query failed:', error.message);
      return Response.json({ error: 'Query failed' }, { status: 503 });
    }

    const rows = (data ?? []) as Array<{ month: string; query_count: number; updated_at: string }>;
    const currentRow = rows.find((r) => r.month === currentMonth) ?? null;
    const priorRow = rows.find((r) => r.month === priorMonth) ?? null;

    const capRaw = process.env.AEROAPI_MONTHLY_CAP;
    const cap = capRaw ? Number.parseInt(capRaw, 10) : AEROAPI_DEFAULT_MONTHLY_CAP;

    return Response.json({
      cap: Number.isFinite(cap) && cap > 0 ? cap : AEROAPI_DEFAULT_MONTHLY_CAP,
      current: currentRow
        ? { month: currentMonth, queryCount: currentRow.query_count, updatedAt: currentRow.updated_at }
        : { month: currentMonth, queryCount: 0, updatedAt: null },
      prior: priorRow
        ? { month: priorMonth, queryCount: priorRow.query_count, updatedAt: priorRow.updated_at }
        : { month: priorMonth, queryCount: 0, updatedAt: null },
    });
  } catch (error) {
    console.error('[cron/aeroapi-usage] unhandled error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
