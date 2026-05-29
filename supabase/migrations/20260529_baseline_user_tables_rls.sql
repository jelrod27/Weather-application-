-- Baseline RLS capture for core user tables (SEC-011, 2026-05-29)
--
-- The schemas and RLS policies for profiles / saved_locations /
-- user_preferences were created out-of-band (Supabase dashboard + the
-- handle_new_user auth trigger) and never captured in supabase/migrations/.
-- That leaves the security-critical RLS posture unversioned and unreviewable,
-- and a regression in the dashboard would not show up in code review.
--
-- This migration reproduces the CURRENT live RLS posture idempotently so it is
-- version-controlled and reviewable. It is a faithful capture of live state
-- (read from pg_policies on 2026-05-29), so applying it is a no-op against the
-- live DB and safely re-establishes the same policies on a fresh rebuild.
--
-- NOTE: The table column definitions themselves are still created via the
-- dashboard / auth trigger and are intentionally NOT recreated here (to avoid
-- guessing column types). Capture full CREATE TABLE baselines separately when
-- convenient. This migration only pins the RLS posture.

-- ---------------------------------------------------------------------------
-- profiles: owner-scoped on auth.uid() = id
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- saved_locations: owner-scoped on auth.uid() = user_id
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.saved_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own locations" ON public.saved_locations;
CREATE POLICY "Users can view own locations" ON public.saved_locations
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own locations" ON public.saved_locations;
CREATE POLICY "Users can insert own locations" ON public.saved_locations
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own locations" ON public.saved_locations;
CREATE POLICY "Users can update own locations" ON public.saved_locations
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own locations" ON public.saved_locations;
CREATE POLICY "Users can delete own locations" ON public.saved_locations
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- user_preferences: owner-scoped on auth.uid() = user_id (single ALL policy)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING ((SELECT auth.uid()) = user_id);
