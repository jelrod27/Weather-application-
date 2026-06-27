# Vercel security pass — 16-Bit Weather

Quarterly checklist for the production Vercel project (`16bitweather.co`). Run after env changes, dependency upgrades, or Vercel platform incidents.

## 1. Vercel dashboard

| Check | Where | Action |
| --- | --- | --- |
| Security actions | Project → **Security** | Resolve open findings (exposed secrets, misconfigurations). |
| Activity log | Team → **Activity** | Scan for unexpected deploys, env edits, or member changes. |
| Deployment Protection | Project → **Settings → Deployment Protection** | Keep **Production** protected; use bypass secret only in CI (`VERCEL_AUTOMATION_BYPASS_SECRET`). |
| Firewall / WAF | Project → **Firewall** (if enabled) | Review blocked traffic and rate-limit rules. |
| Domains & TLS | Project → **Settings → Domains** | Confirm apex + `www` point to this project; TLS auto-renewal healthy. |
| Team access | Team → **Members** | Remove stale accounts; least-privilege roles. |

## 2. Environment variables (mark Sensitive)

In **Project → Settings → Environment Variables**, mark server-only secrets as **Sensitive** and scope to the correct environments (Production / Preview / Development).

### Must be server-only (never `NEXT_PUBLIC_`)

| Variable | Used for |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Welcome email, cron, admin DB |
| `SUPABASE_WEBHOOK_SECRET` | `/api/webhooks/new-user` |
| `CRON_SECRET` | `/api/cron/*` |
| `RESEND_API_KEY` | Transactional + admin email |
| `OPENWEATHER_API_KEY` | Legacy weather endpoints |
| `GOOGLE_POLLEN_API_KEY` | Pollen API |
| `NASA_API_KEY` | Space/APOD |
| `AEROAPI_KEY` | Aviation flight data |
| `OPENSKY_USERNAME` / `OPENSKY_PASSWORD` | Live flight positions |
| `ANTHROPIC_API_KEY` | Newsletter generator (scripts) |
| `SLACK_WEBHOOK_URL` / `DISCORD_WEBHOOK_URL` | Admin registration alerts |
| `KERNEL_API_KEY` | CI Playwright (GitHub Actions, not Vercel) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | CI only — preview deploy access |

### Intentionally public (`NEXT_PUBLIC_`)

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Anon key is RLS-scoped |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Designed for browser |
| `NEXT_PUBLIC_BASE_URL` | OAuth redirects, OG URLs |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics project key (browser) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest host |
| `NEXT_PUBLIC_SENTRY_DSN` | Client error reporting |

After rotating any secret: **redeploy Production** so running instances pick up new values.

## 3. Repository & CI (GitHub)

| Check | Location |
| --- | --- |
| CodeQL | `.github/workflows/` — log injection / security queries |
| Dependabot | GitHub → **Security → Dependabot** |
| Secret scanning | Pre-commit/pre-push gitleaks (`.husky/`) |
| Branch protection | `main` requires PR + passing checks |

## 4. Supabase (paired with Vercel)

- **Auth redirect URLs** include `https://16bitweather.co/auth/callback` and local dev.
- **Database webhooks** use `SUPABASE_WEBHOOK_SECRET`; rotate if leaked.
- **RLS** enabled on user tables; service role used only in server routes.
- **Pro checklist**: `planning/supabase-pro-upgrade-checklist.md`

## 5. Post-incident response (April 2026 Vercel env leak pattern)

If Vercel reports env exposure:

1. Rotate **all** server secrets listed above (assume compromise).
2. Rotate Supabase **service role** and webhook secret if service role was in Vercel env.
3. Mark every secret **Sensitive** in Vercel.
4. Redeploy Production; verify auth, webhooks, cron, welcome email.
5. Review PostHog/Sentry for anomalous traffic after rotation.

## 6. Monthly quick scan (~10 min)

- [ ] Vercel Security tab — zero open actions
- [ ] No new `NEXT_PUBLIC_` vars added without review
- [ ] Preview deployments not indexed (`robots` / no sensitive preview data)
- [ ] Sentry: no spike in auth or webhook errors
- [ ] Supabase auth users / failed sign-ins normal

Last updated: 2026-06-25
