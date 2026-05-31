-- Security sweep hardening (2026-05-29)
--
-- Two low-severity, defense-in-depth fixes surfaced by the full security sweep.
-- Both are non-destructive and reversible.

-- ---------------------------------------------------------------------------
-- SEC-006: weather_cache had an unconditional anon-readable SELECT policy
-- ("Public read weather cache" USING (true)). The table holds non-user cached
-- weather data and is currently unused, but `USING (true)` for the public role
-- is the exact broad-anon pattern we want to avoid: if the table is ever
-- repurposed for user-linked data, every row would be world-readable.
--
-- Fix: drop the permissive policy. RLS stays ENABLED with no policy, which
-- denies all access to anon/authenticated (only service_role bypasses RLS) --
-- matching the deny-all posture used by public.aeroapi_usage.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read weather cache" ON public.weather_cache;

-- Ensure RLS remains enabled (no-op if already on).
ALTER TABLE IF EXISTS public.weather_cache ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- SEC-007: handle_new_user() is a SECURITY DEFINER trigger function, but
-- Supabase auto-grants EXECUTE on new functions to anon/authenticated and
-- exposes them via PostgREST (/rest/v1/rpc/handle_new_user). Calling a trigger
-- function directly via RPC supplies no NEW record so it errors rather than
-- inserting rows, but there is no reason to expose it at all.
--
-- Fix: strip the EXECUTE grants. The trigger still fires on auth.users insert
-- because triggers run as the table owner regardless of EXECUTE grants.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
