# Product requirements (PRDs)

Canonical location for **long-form product specs** used by humans and AI agents. Root-level `PRD-*.md` files were consolidated here to keep the repository root tidy.

## In this folder

| Document | Summary |
|----------|---------|
| [PRD-open-meteo-migration.md](./PRD-open-meteo-migration.md) | Migrating primary weather source from OpenWeatherMap to Open-Meteo |
| [PRD-stargazer.md](./PRD-stargazer.md) | Astrophotography forecast page (Stargazer) |
| [PRD-newsletter-redesign.md](./PRD-newsletter-redesign.md) | Weekly newsletter generator redesign |
| [PRD-news-overhaul.md](./PRD-news-overhaul.md) | News section overhaul — fix dead feeds, remove orphaned subsystem, tiered caching + feed-health monitoring |

## Referenced elsewhere but not in this tree

These paths appear in local automation (for example `.claude/ralph-loop.local.md`) but **no longer exist as files** in the repo. If you still need them, recover from **git history**, **GitHub gists**, or **closed PR/issue** attachments, then drop copies here under `planning/prds/` and update this table.

| Historical path | Topic (from references) |
|-----------------|-------------------------|
| `docs/PRD-sun-forecast-space-weather.md` | Sun forecast, space weather dashboard, news + AI context |
| `docs/PRD-aviation-turbulence.md` | Aviation / turbulence UI (e.g. Section 14 nitpicks) |

## GitHub

PRDs that lived only in **GitHub** (issue bodies, wiki, gists, or PR descriptions) are not duplicated here automatically. Search the repo’s **closed PRs** and **issues** for titles containing `PRD` or paste recovered markdown into `planning/prds/` with a dated name (for example `PRD-legacy-feature-YYYY-MM-DD.md`) and link it in this README.
