-- Bitwatch canonical Warning Event store. Service role only.

CREATE TABLE IF NOT EXISTS public.bitwatch_ingest_state (
  id TEXT PRIMARY KEY,
  watermark_sent TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  lease_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bitwatch_source_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nws_id TEXT NOT NULL,
  sender TEXT NOT NULL DEFAULT '',
  sent TIMESTAMPTZ NOT NULL,
  message_type TEXT NOT NULL,
  event TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  warning_event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bitwatch_source_messages_nws_sent UNIQUE (nws_id, sent)
);

CREATE INDEX IF NOT EXISTS bitwatch_source_messages_event_id
  ON public.bitwatch_source_messages (warning_event_id);

CREATE TABLE IF NOT EXISTS public.bitwatch_warning_events (
  id TEXT PRIMARY KEY,
  nws_id TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
  ended_reason TEXT,
  display JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bitwatch_warning_events_status
  ON public.bitwatch_warning_events (status, updated_at DESC);

ALTER TABLE public.bitwatch_ingest_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitwatch_source_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitwatch_warning_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bitwatch_ingest_state FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bitwatch_source_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bitwatch_warning_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.bitwatch_ingest_state TO service_role;
GRANT ALL ON public.bitwatch_source_messages TO service_role;
GRANT ALL ON public.bitwatch_warning_events TO service_role;
