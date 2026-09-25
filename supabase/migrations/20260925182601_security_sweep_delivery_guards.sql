-- Apply before deploying the guest-subscribe change. Quota errors fail closed.
-- Profile creation is owned by the existing Auth trigger; browser clients only
-- edit these six presentation/preferences fields. RLS still limits row ownership.
REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (username, full_name, avatar_url, default_location, preferred_units, timezone)
  ON public.profiles TO authenticated;

CREATE TABLE public.guest_alert_email_limits (
  recipient_hash text PRIMARY KEY CHECK (recipient_hash ~ '^[a-f0-9]{64}$'),
  last_claimed_at timestamptz NOT NULL,
  claim_times timestamptz[] NOT NULL CHECK (cardinality(claim_times) BETWEEN 1 AND 5)
);

ALTER TABLE public.guest_alert_email_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_alert_email_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_alert_email_limits TO service_role;

-- Invoker privileges: only the service role can execute or access the table.
-- ON CONFLICT takes a row lock so competing workers cannot spend the same slot.
CREATE FUNCTION public.claim_guest_alert_email_slot(p_recipient_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  claimed_at timestamptz := clock_timestamp();
  affected integer;
BEGIN
  IF p_recipient_hash IS NULL OR p_recipient_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid recipient hash';
  END IF;

  INSERT INTO public.guest_alert_email_limits AS budget
    (recipient_hash, last_claimed_at, claim_times)
  VALUES (p_recipient_hash, claimed_at, ARRAY[claimed_at])
  ON CONFLICT (recipient_hash) DO UPDATE SET
    last_claimed_at = claimed_at,
    claim_times = ARRAY(
      SELECT t FROM unnest(budget.claim_times) AS t
      WHERE t > claimed_at - interval '24 hours'
    ) || claimed_at
  WHERE budget.last_claimed_at <= claimed_at - interval '5 minutes'
    AND (SELECT count(*) FROM unnest(budget.claim_times) AS t
         WHERE t > claimed_at - interval '24 hours') < 5;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_alert_email_slot(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_alert_email_slot(text) TO service_role;
