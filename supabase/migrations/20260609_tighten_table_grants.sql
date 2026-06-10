-- Applied to the live database 2026-06-09 (via MCP; see README.md).
--
-- Tighten default table grants: anon/authenticated held ALL (including
-- TRUNCATE, REFERENCES, TRIGGER) on every public table via Supabase default
-- privileges. RLS already governs row access, but TRUNCATE is not subject
-- to RLS, and the broad grants contradict the documented service-role-only
-- posture for aeroapi_usage. Re-grant exactly what the RLS policies support
-- per table:
--   profiles:         SELECT/INSERT/UPDATE policies for authenticated (no DELETE policy)
--   saved_locations:  SELECT/INSERT/UPDATE/DELETE policies for authenticated
--   user_preferences: FOR ALL policy for authenticated
--   aeroapi_usage:    service-role only (deny-all RLS; the RPC is the only writer)

REVOKE ALL ON TABLE public.aeroapi_usage FROM anon, authenticated;

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.saved_locations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_locations TO authenticated;

REVOKE ALL ON TABLE public.user_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_preferences TO authenticated;
