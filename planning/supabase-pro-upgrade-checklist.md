# Supabase Pro upgrade checklist

Use this when a Free-tier limit or product requirement makes the $25/mo Pro plan worth it. **Do not upgrade preemptively** at current scale.

## Stay on Free while all of these are true

- Under ~50k monthly active auth users
- Database under 500 MB
- Custom SMTP is configured (Resend), so auth email is not rate-capped
- No requirement for daily backups or 7-day auth audit logs
- Production project receives regular traffic (avoids inactivity pause)

## Upgrade to Pro ($25/mo) when any trigger fires

| Trigger | Why Pro helps |
|---------|----------------|
| Backups | Free has none. Until Pro, `.github/workflows/db-backup.yml` takes a weekly encrypted logical dump (see that file's header for restore steps). Inert until the age recipient key and the `SUPABASE_BACKUP_DB_PASSWORD` secret are provisioned (hardening plan, Phase C); until then a run fails on purpose rather than uploading nothing. |
| Branded auth emails | Not a Pro trigger: custom SMTP is configurable on every plan (Auth → SMTP Settings). Point it at Resend; the built-in sender is capped at 2 emails/hour and documented as not for production. |
| Backups / recovery | Daily backups, 7-day retention; Free has none |
| Auth audit / support | 7-day auth logs vs 1 hour on Free; email support |
| Database growth | 8 GB vs 500 MB on Free |
| Staging project always-on | Free dev projects pause after ~1 week idle |
| Registration alerts are business-critical | Pro adds reliability headroom; webhook itself works on Free |

## After upgrading

1. Leave **Spend Cap ON** (default) until you intentionally want pay-as-you-go overages.
2. Enable **daily backups** in project settings.
3. Configure **custom SMTP** for Auth if branded emails were the reason.
4. Optional: log drain to Sentry for auth failures.
5. Document the upgrade date and primary trigger in this file or team notes.

## Cost forecast

| Stage | Supabase | Notes |
|-------|----------|-------|
| Now (<100 MAU) | $0 Free | Resend free tier for admin signup emails |
| Growth (1k–10k MAU) | $0 Free or $25 Pro | Upgrade when a trigger above hits |
| Large (50k+ MAU) | $25 Pro | Auth overage $0.00325/user above 100k on Pro |

## Decision record

- **Keep Supabase** for auth + RLS + user tables — migration cost outweighs benefit today.
- **Registration notifications** use app-side Resend + Slack/Discord, not a paid Supabase feature.
- Revisit this checklist quarterly or when launching Condition Watch alert storage.
