-- No-account warning email + browser push installations.
-- Service role only: guests never get a session against these tables.

CREATE TABLE IF NOT EXISTS public.guest_alert_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMPTZ,
  verify_token_hash TEXT,
  verify_token_expires_at TIMESTAMPTZ,
  manage_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guest_alert_subscribers_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS guest_alert_subscribers_verified_enabled
  ON public.guest_alert_subscribers (enabled)
  WHERE verified_at IS NOT NULL AND enabled = true;

CREATE TABLE IF NOT EXISTS public.guest_alert_monitor_state (
  subscriber_id UUID PRIMARY KEY REFERENCES public.guest_alert_subscribers(id) ON DELETE CASCADE,
  active_alert_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.guest_alert_subscribers(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guest_alert_deliveries_once UNIQUE (subscriber_id, alert_id)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_subscriber_id UUID REFERENCES public.guest_alert_subscribers(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint),
  CONSTRAINT push_subscriptions_owner CHECK (
    (user_id IS NOT NULL AND guest_subscriber_id IS NULL)
    OR (user_id IS NULL AND guest_subscriber_id IS NOT NULL)
  )
);

ALTER TABLE public.guest_alert_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_alert_monitor_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_alert_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.guest_alert_subscribers FROM PUBLIC;
REVOKE ALL ON public.guest_alert_subscribers FROM anon;
REVOKE ALL ON public.guest_alert_subscribers FROM authenticated;
REVOKE ALL ON public.guest_alert_monitor_state FROM PUBLIC;
REVOKE ALL ON public.guest_alert_monitor_state FROM anon;
REVOKE ALL ON public.guest_alert_monitor_state FROM authenticated;
REVOKE ALL ON public.guest_alert_deliveries FROM PUBLIC;
REVOKE ALL ON public.guest_alert_deliveries FROM anon;
REVOKE ALL ON public.guest_alert_deliveries FROM authenticated;
REVOKE ALL ON public.push_subscriptions FROM PUBLIC;
REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE ALL ON public.push_subscriptions FROM authenticated;

GRANT ALL ON public.guest_alert_subscribers TO service_role;
GRANT ALL ON public.guest_alert_monitor_state TO service_role;
GRANT ALL ON public.guest_alert_deliveries TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;
