# GitHub Actions secrets and variables

This is the complete list of what the workflows in `.github/workflows/` read.
Anything not listed here is unused and should be deleted rather than kept
"just in case". Deployment is handled by Vercel's Git integration, so no
workflow needs a Vercel token, org id, or project id.

## Repository secrets

| Name | Used by | Purpose |
| --- | --- | --- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | `preview-gate.yml` | Lets the trusted, checkout-free `workflow_run` preview gate reach protected same-repository Vercel deployments. Value comes from Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation. Never expose it to the PR-branch `deployment_status` workflow or fork PR code. |
| `SUPABASE_BACKUP_DB_PASSWORD` | `db-backup.yml` | Password of the read-only `backup_reader` role, nothing else; the job percent-encodes it and builds the session-pooler URL itself. The weekly job refuses to run until it exists. |

## `Production` environment secrets

The newsletter and education workflows bind to `environment: production`
only to read these secrets. The environment is restricted to protected
branches, so a `workflow_dispatch` from a feature branch cannot use them.

| Name | Used by | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `newsletter-sunday.yml`, `newsletter-wednesday.yml`, `education-guide.yml` | Model calls for generated posts and guides. |
| `CONTENT_BOT_TOKEN` | `newsletter-sunday.yml`, `newsletter-wednesday.yml`, `education-guide.yml` | Fine-grained personal access token that pushes the generated branch and opens the PR. Repository access: this repository only. Permissions: Contents read and write, Pull requests read and write. Required because "Allow GitHub Actions to create and approve pull requests" is off (hardening B3), so `GITHUB_TOKEN` cannot open PRs. Give it an expiry and rotate it; the jobs fail before pushing if it is missing. |

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

## Vercel preview trust boundary

The full Playwright suite runs only in the secretless PR workflow, against a local server. `e2e-preview.yml` is an unprivileged `deployment_status` bridge: its workflow file may be loaded from a PR branch, so it must never receive secrets or check out code. `preview-gate.yml` is a privileged `workflow_run` consumer loaded from **main**; it checks out no PR code, verifies the GitHub deployment and open internal PR through the API, restricts the URL, and only then sends the bypass header. It publishes a `Preview Smoke` commit status to the PR head SHA. Fork PRs can run secretless checks, but cannot pass the preview gate until a maintainer moves/replays their changes onto an internal branch. Do not enable automatic Vercel builds of fork PRs with production-connected preview credentials. Configure fork preview access in Vercel separately; GitHub Actions settings do not control it.

After merging these workflows, verify an internal PR receives a passing `Preview Smoke` status before adding it to branch protection. The old full-preview Playwright job is deliberately removed.
