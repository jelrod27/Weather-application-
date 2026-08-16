-- One in-app/email row per warning coverage of a saved-location subscription.
-- Duplicate cron invocations must not page the same person twice.

CREATE UNIQUE INDEX IF NOT EXISTS user_alerts_severe_alert_once
  ON public.user_alerts (subscription_id, ((payload->>'alertId')))
  WHERE kind = 'severe_weather' AND subscription_id IS NOT NULL;
