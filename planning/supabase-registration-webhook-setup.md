# Supabase registration webhook setup

After deploying the `/api/webhooks/new-user` route, configure a Database Webhook in the Supabase Dashboard so you receive email and Slack/Discord alerts when a new profile row is created.

## Prerequisites

Set these environment variables in Vercel (production) and optionally in `.env.local` for testing:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_WEBHOOK_SECRET` | Shared secret sent in the `x-webhook-secret` header |
| `ADMIN_NOTIFICATION_EMAIL` | Your inbox for signup alerts |
| `RESEND_API_KEY` | Resend API key (admin alerts + post-confirmation welcome email) |
| `RESEND_FROM_EMAIL` | Verified sender (e.g. `16 Bit Weather <noreply@16bitweather.co>`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Marks `profiles.welcome_email_sent_at` after welcome email (server-only) |
| `SLACK_WEBHOOK_URL` | Optional Slack incoming webhook |
| `DISCORD_WEBHOOK_URL` | Optional Discord webhook |

Generate a strong random secret for `SUPABASE_WEBHOOK_SECRET` (e.g. `openssl rand -hex 32`).

## Supabase Dashboard steps

1. Open your **production** Supabase project (not local).
2. Go to **Database → Webhooks → Create a new hook**.
3. **Name:** `new-user-registration`
4. **Table:** `public.profiles`
5. **Events:** `INSERT` only
6. **Type:** HTTP Request
7. **Method:** POST
8. **URL:** `https://www.16bitweather.co/api/webhooks/new-user`
9. **HTTP Headers:** add `x-webhook-secret` with the same value as `SUPABASE_WEBHOOK_SECRET` in Vercel.
10. Save the webhook.

## Why `profiles` and not `auth.users`?

The `handle_new_user()` trigger creates a `profiles` row (and `user_preferences`) after signup. Alerting on `profiles` INSERT means you only get notified when provisioning succeeded — for both email/password and OAuth signups.

## Verification

1. Create a test account on staging or production.
2. Check Vercel function logs for `[webhooks/new-user]`.
3. Confirm email/Slack/Discord delivery.
4. Supabase **Authentication → Users** remains a manual backup view.

## Retries and duplicates

Supabase may retry failed webhook deliveries. Duplicate admin emails on retry are possible; acceptable for low-volume signup alerts. Add an `admin_events` dedupe table later if needed.

## User welcome email (post-confirmation)

Supabase sends the **confirmation** email. After the user confirms (or completes OAuth), the app sends a separate **welcome** email via Resend:

1. Primary: `GET /auth/callback` after `exchangeCodeForSession` (confirm link or OAuth).
2. Fallback: `POST /api/auth/welcome-email` when the dashboard loads (covers password sign-in after confirm).

Requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `SUPABASE_SERVICE_ROLE_KEY`. Run migration `20260625_profiles_welcome_email_sent.sql` so `profiles.welcome_email_sent_at` prevents duplicate sends.
