# GitHub Actions secrets and variables

This is the complete list of what the workflows in `.github/workflows/` read.
Anything not listed here is unused and should be deleted rather than kept
"just in case". Deployment is handled by Vercel's Git integration, so no
workflow needs a Vercel token, org id, or project id.

## Repository secrets

| Name | Used by | Purpose |
| --- | --- | --- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | `e2e-preview.yml` | Lets Playwright reach a protected Vercel preview deployment. Value comes from Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation. |
| `SUPABASE_BACKUP_DB_PASSWORD` | `db-backup.yml` | Password of the read-only `backup_reader` role, nothing else; the job percent-encodes it and builds the session-pooler URL itself. The weekly job refuses to run until it exists. |

## `Production` environment secrets

The newsletter and education workflows bind to `environment: production`
only to read this secret. The environment is restricted to protected
branches, so a `workflow_dispatch` from a feature branch cannot use it.

| Name | Used by | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `newsletter-sunday.yml`, `newsletter-wednesday.yml`, `education-guide.yml` | Model calls for generated posts and guides. |

## Repository variables (optional)

| Name | Default if unset | Used by |
| --- | --- | --- |
| `NEWSLETTER_MODEL` | `claude-sonnet-4-6` | newsletter workflows |
| `EDUCATION_MODEL` | `claude-opus-5` | `education-guide.yml` |
| `EDUCATION_EFFORT` | `medium` | `education-guide.yml` |

## What CI does *not* need

- Supabase keys: `ci.yml`, `e2e-pr.yml`, and `lighthouse-pr.yml` build with
  placeholder `NEXT_PUBLIC_SUPABASE_*` values set in the workflow file.
- Weather API keys: Open-Meteo needs none. Google Pollen and other optional
  keys are Vercel runtime env vars, not CI secrets.
- `KERNEL_API_KEY`: opt-in legacy mode for Playwright (see `playwright.config.ts`);
  no workflow sets it.

## Vercel environment variables that CI depends on

`NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=true` on Preview deployments so
`e2e-preview.yml` can bypass auth via the test header (see
`lib/playwright-test-mode.ts`; the bypass is refused when `NODE_ENV` is
`production`).
