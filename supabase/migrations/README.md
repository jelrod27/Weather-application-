# Migration directory state

Last reconciled: 2026-06-09 (full codebase review; see
planning/codebase-review-2026-06-09.md).

## How migrations are applied

Migrations are applied to the live project via the Supabase MCP
(`apply_migration`), which records a full-timestamp version in the live
`supabase_migrations.schema_migrations` table. The files in this directory
use date-only prefixes and serve as the reviewed source of record for what
was applied; their filenames do NOT match the version strings in live
history.

Consequence: do not run `supabase db push` against the live project. The
CLI would see every file here as unapplied. If CLI workflows are adopted,
squash to a dumped baseline first (`supabase db dump --schema public`) and
use `supabase migration repair` to align history.

## .sql.skip files

Files renamed to `.sql.skip` are intentionally inert:

- `20250103_auth_performance_indexes.sql.skip` - never applied; the live
  index set covers current query shapes and two of its indexes would
  duplicate existing unique indexes.
- `20251227_chat_tables.sql.skip` and `20260321_user_ai_memory.sql.skip` -
  create tables that were deliberately dropped by
  `20260509_drop_ai_chat_and_games_orphans.sql`. Running them against the
  live DB would resurrect dropped tables (nothing would drop them again).
- `20251230_fix_leaderboard_security_invoker.sql.skip` - references the
  dropped game_scores/games tables; would hard-fail and abort any
  sequential apply.
- `20260322_user_ai_memory_atomic_rpc.sql.skip` - predates this
  reconciliation; the AI memory subsystem it supports was removed.

## Live-only history

The live schema_migrations table also contains entries with no file here
(2026-01-18 search_path fixes, 2026-03-29 entries, and dashboard-era
fix-ups). The 2026-05-29 baseline migrations plus the 2026-06-09 files in
this directory describe the resulting state for the surviving tables.

## Supabase GitHub integration

Do not connect the Supabase GitHub integration (or "branching") to this
repository. It clones the repo on every push to `main` and tries to apply
the files here to the production database. Because these files are
records with date-only prefixes, it fails today; a correctly named file
would be applied on merge, outside the MCP workflow above. It was
disconnected on 2026-09-05 after the audit found it running eleven
times a day.
