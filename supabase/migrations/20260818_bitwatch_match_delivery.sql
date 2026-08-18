-- Bitwatch Place Match evidence + Delivery outbox. Service role only.

CREATE TABLE IF NOT EXISTS public.bitwatch_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_event_id TEXT NOT NULL,
  lifecycle_phase TEXT NOT NULL CHECK (lifecycle_phase IN ('new', 'upgrade', 'ended', 'scout')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'in_app')),
  subscriber_kind TEXT NOT NULL CHECK (subscriber_kind IN ('account', 'guest')),
  subscriber_id UUID NOT NULL,
  protected_place_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bitwatch_deliveries_once UNIQUE (
    warning_event_id,
    lifecycle_phase,
    channel,
    subscriber_kind,
    subscriber_id,
    protected_place_key
  )
);

CREATE INDEX IF NOT EXISTS bitwatch_deliveries_subscriber
  ON public.bitwatch_deliveries (subscriber_kind, subscriber_id, created_at DESC);

ALTER TABLE public.bitwatch_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bitwatch_deliveries FROM PUBLIC;
REVOKE ALL ON public.bitwatch_deliveries FROM anon;
REVOKE ALL ON public.bitwatch_deliveries FROM authenticated;
GRANT ALL ON public.bitwatch_deliveries TO service_role;

ALTER TABLE public.guest_alert_subscribers
  ADD COLUMN IF NOT EXISTS notify_tornado BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_severe_thunderstorm BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_flash_flood BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_upgrades BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.alert_subscriptions
  ADD COLUMN IF NOT EXISTS notify_tornado BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_severe_thunderstorm BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_flash_flood BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_upgrades BOOLEAN NOT NULL DEFAULT true;
