-- Track one-time welcome email after email confirmation (server-set only).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.welcome_email_sent_at IS
  'When the post-confirmation welcome email was sent via Resend; NULL until sent.';
