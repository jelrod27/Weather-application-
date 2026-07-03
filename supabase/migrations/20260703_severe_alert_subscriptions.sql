-- Location-scoped severe weather alert subscriptions, monitor state, and in-app alerts.

CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_location_id UUID NOT NULL REFERENCES public.saved_locations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('severe_weather')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS alert_subscriptions_unique
  ON public.alert_subscriptions (user_id, saved_location_id, kind);

CREATE INDEX IF NOT EXISTS alert_subscriptions_enabled_kind
  ON public.alert_subscriptions (kind, enabled)
  WHERE enabled = true;

ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alert subscriptions"
  ON public.alert_subscriptions
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own alert subscriptions"
  ON public.alert_subscriptions
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own alert subscriptions"
  ON public.alert_subscriptions
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own alert subscriptions"
  ON public.alert_subscriptions
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- Tracks active NWS alert ids per subscription for diffing (new vs cleared).
CREATE TABLE IF NOT EXISTS public.alert_monitor_state (
  subscription_id UUID PRIMARY KEY REFERENCES public.alert_subscriptions(id) ON DELETE CASCADE,
  active_alert_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_monitor_state ENABLE ROW LEVEL SECURITY;

-- In-app alert center rows (cron writes via service role).
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.alert_subscriptions(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('severe_weather', 'severe_weather_all_clear')),
  payload JSONB NOT NULL DEFAULT '{}',
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_alerts_user_id_created_at
  ON public.user_alerts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_alerts_unread
  ON public.user_alerts (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON public.user_alerts
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.user_alerts
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_subscriptions TO authenticated;
GRANT ALL ON public.alert_subscriptions TO service_role;

GRANT ALL ON public.alert_monitor_state TO service_role;

GRANT SELECT, UPDATE ON public.user_alerts TO authenticated;
GRANT ALL ON public.user_alerts TO service_role;
