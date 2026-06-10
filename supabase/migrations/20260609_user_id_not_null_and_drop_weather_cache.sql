-- Applied to the live database 2026-06-09 (via MCP; see README.md).
--
-- Integrity hardening:
--
-- 1. Remove orphaned NULL-owner rows from saved_locations. The live DB held
--    10 rows from a single broken test batch (all created at the same
--    instant on 2025-09-06, NULL city, NULL user_id). RLS scopes every
--    policy to auth.uid() = user_id, so NULL-owner rows are permanently
--    invisible and unreachable by every user role.
--
-- 2. saved_locations.user_id and user_preferences.user_id were nullable.
--    Only a service-role or trigger bug can create NULL-owner rows (see
--    above for proof it happened) and they orphan forever. Forbid it.
--
-- 3. weather_cache was a dead table: zero application references (client
--    caching is localStorage-based), 0 rows, deny-all RLS since the
--    security sweep. Drop it.

DELETE FROM public.saved_locations WHERE user_id IS NULL;
-- The live DB had no NULL-owner preference rows, but mirror the cleanup so
-- this file cannot abort on other environments that do.
DELETE FROM public.user_preferences WHERE user_id IS NULL;

ALTER TABLE public.saved_locations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_preferences ALTER COLUMN user_id SET NOT NULL;

DROP TABLE IF EXISTS public.weather_cache;
