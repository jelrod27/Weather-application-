-- Tighten client writes: users may only mark alerts read; subscriptions are service-managed.

REVOKE INSERT, UPDATE, DELETE ON public.alert_subscriptions FROM authenticated;
GRANT SELECT ON public.alert_subscriptions TO authenticated;

REVOKE UPDATE ON public.user_alerts FROM authenticated;
GRANT SELECT ON public.user_alerts TO authenticated;
GRANT UPDATE (read_at) ON public.user_alerts TO authenticated;

DROP POLICY IF EXISTS "Users can update own alert subscriptions" ON public.alert_subscriptions;
DROP POLICY IF EXISTS "Users can insert own alert subscriptions" ON public.alert_subscriptions;
DROP POLICY IF EXISTS "Users can delete own alert subscriptions" ON public.alert_subscriptions;

DROP POLICY IF EXISTS "Users can update own alerts" ON public.user_alerts;
CREATE POLICY "Users can update own alerts"
  ON public.user_alerts
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
