-- Applied to the live database 2026-06-09 (via MCP; see README.md).
--
-- The storm_reports table inherited Supabase default privileges at creation
-- (ALL to anon/authenticated), and the hardening migration revoked only
-- SELECT. That left anon/authenticated with table-level INSERT, UPDATE,
-- DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN. RLS blocks the row
-- operations, but TRUNCATE is not subject to RLS. Reset to the intended
-- posture: column-level SELECT plus INSERT for authenticated only.

DO $$
BEGIN
  IF to_regclass('public.storm_reports') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.storm_reports FROM anon, authenticated;

    -- Re-apply intended grants (REVOKE ALL above also clears column ACLs).
    GRANT SELECT (
      id,
      report_type,
      description,
      latitude,
      longitude,
      location_name,
      image_url,
      occurred_at,
      created_at,
      status
    ) ON TABLE public.storm_reports TO anon, authenticated;

    GRANT INSERT ON TABLE public.storm_reports TO authenticated;
  END IF;
END;
$$;
