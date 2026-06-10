-- Fix a latent permission failure in the storm_reports column grants.
--
-- 20260430_storm_reports_hardening.sql revoked table-wide SELECT and
-- re-granted column-level SELECT excluding `status` (and `user_id`). But the
-- API route (app/api/storm-reports/route.ts GET) filters with
-- .eq('status', 'approved'): in Postgres, a column referenced in a WHERE
-- clause requires SELECT privilege on that column, so every anon or
-- authenticated GET would fail with 42501 "permission denied for column
-- status" once the table is deployed.
--
-- Granting SELECT on `status` is safe: the row-level SELECT policy
-- (USING (status = 'approved')) still hides non-approved rows, and exposing
-- the literal value 'approved' on rows the policy already filters to
-- approved leaks nothing. `user_id` stays ungranted.
--
-- Idempotent: GRANT is additive and safe to re-run. Guarded so the file can
-- sit in the tree before the storm_reports table itself is deployed.

DO $$
BEGIN
  IF to_regclass('public.storm_reports') IS NOT NULL THEN
    GRANT SELECT (status) ON TABLE public.storm_reports TO anon;
    GRANT SELECT (status) ON TABLE public.storm_reports TO authenticated;
  END IF;
END;
$$;
