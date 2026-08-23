-- Close leftover privileges on service-managed alert tables.
-- 20260704 revoked authenticated INSERT/UPDATE/DELETE on subscriptions and
-- narrowed user_alerts to SELECT + UPDATE(read_at), but never revoked anon
-- and left TRUNCATE (which bypasses RLS) on all three tables.

REVOKE ALL ON TABLE public.alert_subscriptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.alert_subscriptions TO authenticated;

REVOKE ALL ON TABLE public.user_alerts FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_alerts TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.user_alerts TO authenticated;

REVOKE ALL ON TABLE public.alert_monitor_state FROM anon, authenticated;
