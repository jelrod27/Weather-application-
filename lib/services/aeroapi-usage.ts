/**
 * App-side monthly cap for FlightAware AeroAPI calls.
 *
 * AeroAPI's free tier ($5/month credit) charges the credit card on file once
 * exhausted. FlightAware does NOT offer vendor-side spending limits on the
 * personal tier, so this is the only thing standing between us and the bill.
 *
 * Pattern: a single-row-per-UTC-month counter in `public.aeroapi_usage`.
 * The atomic RPC `increment_aeroapi_usage(cap)` either bumps the counter
 * and returns the new value, or returns NULL when the cap is reached. The
 * RPC is a single conditional INSERT/UPDATE — no TOCTOU window.
 *
 * Fail-closed semantics:
 *   - RPC returns null (cap hit) → caller falls through to MockProvider.
 *   - RPC throws / Supabase down → caller falls through to MockProvider.
 *   - Any uncertainty path leans toward "do not call AeroAPI."
 *
 * The increment fires BEFORE the AeroAPI fetch. If the fetch fails, the
 * counter still went up. Over-count is the safe direction; under-count
 * lets us blow past the cap.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const AEROAPI_DEFAULT_MONTHLY_CAP = 800;

let cachedClient: SupabaseClient | null = null;

function getServiceRoleClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  cachedClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

function readCapFromEnv(): number {
  const raw = process.env.AEROAPI_MONTHLY_CAP;
  if (!raw) return AEROAPI_DEFAULT_MONTHLY_CAP;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return AEROAPI_DEFAULT_MONTHLY_CAP;
  return parsed;
}

let capWarnedThisProcess = false;

/**
 * Atomic check-and-increment. Returns:
 *   - { allowed: true, count: <new count> } when under the cap.
 *   - { allowed: false } when the cap is hit OR the RPC failed (fail-closed).
 *
 * The count returned is the value AFTER the increment, useful for logging.
 */
export async function tryIncrementAeroApiUsage(): Promise<
  { allowed: true; count: number } | { allowed: false; reason: 'cap_hit' | 'rpc_failed' | 'no_supabase' }
> {
  const cap = readCapFromEnv();

  const supabase = getServiceRoleClient();
  if (!supabase) {
    // Fail closed: if Supabase isn't configured we can't track usage, so
    // refusing the call is safer than risking an unbounded bill.
    return { allowed: false, reason: 'no_supabase' };
  }

  let data: number | null;
  try {
    // Hard timeout — the fail-closed contract demands a prompt verdict.
    // A slow / half-open path to PostgREST would otherwise stall every
    // flight lookup until the request times out at the route boundary.
    const result = await supabase
      .rpc('increment_aeroapi_usage', { p_cap: cap })
      .abortSignal(AbortSignal.timeout(1500));
    if (result.error) {
      console.warn('[aeroapi-usage] RPC error, failing closed:', result.error.message);
      return { allowed: false, reason: 'rpc_failed' };
    }
    data = result.data as number | null;
  } catch (err) {
    console.warn('[aeroapi-usage] RPC threw, failing closed:', err);
    return { allowed: false, reason: 'rpc_failed' };
  }

  if (data === null) {
    if (!capWarnedThisProcess) {
      capWarnedThisProcess = true;
      console.warn(`[aeroapi-usage] Monthly cap of ${cap} reached; falling back to mock provider for the rest of the UTC month`);
    }
    return { allowed: false, reason: 'cap_hit' };
  }

  return { allowed: true, count: data };
}
