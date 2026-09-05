-- Performance advisors, 2026-09-05: three unindexed foreign keys, plus the
-- two range scans the new Bitwatch retention step (lib/bitwatch/ingest.ts)
-- runs every minute.
CREATE INDEX IF NOT EXISTS alert_subscriptions_saved_location_id
  ON public.alert_subscriptions (saved_location_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_guest_subscriber_id
  ON public.push_subscriptions (guest_subscriber_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id
  ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS bitwatch_source_messages_observed_at
  ON public.bitwatch_source_messages (observed_at);
CREATE INDEX IF NOT EXISTS bitwatch_warning_events_status_updated_at
  ON public.bitwatch_warning_events (status, updated_at);

-- auth_rls_initplan: evaluate auth.uid() once per statement, not per row.
-- Same predicate as before; only the call form changes.
DROP POLICY IF EXISTS "Authenticated insert pending storm reports" ON public.storm_reports;
CREATE POLICY "Authenticated insert pending storm reports"
  ON public.storm_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT auth.uid()) = user_id) AND (status = 'pending'::text));
