# Alert reliability fixes

Scope: fix the investigated cron monitoring gaps, monitor state N+1 reads, and duplicate warning detail loading. Preserve delivery claims, hazard preferences, per-place writes, and fresh warning data. No deployment or production configuration mutation.

1. Cron monitoring: add failing route tests for authenticated check-in lifecycle, semantic partial failures, email/push dispatch, healthy skips and instrumentation isolation; implement explicit check-ins and remove unsupported automatic flag.
2. Monitor reads: add failing multi-place query-count and delivery tests; batch prior state reads in bounded chunks for accounts and guests. Failed reads must skip affected places without interpreting state as empty; continue unrelated places. Preserve bounded per-place processing and atomic delivery claims. Test actual Supabase query serialization with a fake HTTP transport.
3. Warning loading: add real React request-cache tests for metadata/page deduplication and cross-request freshness/errors; implement request-scoped cache and retain inactive/unavailable recovery.
4. Validate targeted tests, both TypeScript projects, lint, full unit suite and production build; independent final code review. Record evidence below.

Ownership: root monitor services/tests and integration config; cron worker routes/config/helper/tests; warnings worker warning page/helper/tests. Shared interface SevereMonitorRunResult remains unchanged.

## Initial implementation evidence

- Cron TDD: initial route run failed 18 cases for missing check-ins and HTTP-200 partial failures; final monitoring suite has 28 passing cases.
- State batching TDD: three subscriptions reproduced three state reads instead of one. Final tests prove one read per 100 IDs, exact Supabase HTTP query serialization, missing rows versus unreadable history, chunk failure isolation, subsequent-run deduplication and bounded per-place writes.
- Warning TDD: six real Flight request-cache tests failed on duplicate loads before the wrapper; all six now pass alongside existing recovery tests. Later requests refresh both successful and failed lookups.
- Independent code review found recipient-list and push-list database failures were still being reported as healthy skips. Seven regression cases reproduced these failures; fixes preserve readable account/guest delivery independently and report push lookup failures explicitly. No deferred review findings.
- Final validation: npm test -- --runInBand: 302 suites, 2,540 tests passed. npm run typecheck and npm run typecheck:tests passed. npm run lint passed with 89 existing warnings and zero errors. npm run build passed; git diff --check passed.
- Not run during initial implementation: browser E2E and Lighthouse. This change alters server execution/data sharing; coverage uses route tests, actual Supabase HTTP serialization and genuine React server rendering. No live email/push delivery or production database writes were performed.
- Follow-up: run warning-page browser E2E before deployment, verify paired check-ins for both minute cron jobs, and confirm monitor notification recipients in Sentry. Unreadable batches skip processing safely and are retried by the next scheduled run; HTTP 503 now identifies partial failures.

## Files changed

- app/api/cron/severe-alerts/route.ts
- app/api/cron/bitwatch-ingest/route.ts
- lib/cron/with-cron-monitor.ts
- next.config.mjs
- lib/services/severe-alert-monitor.ts
- lib/services/severe-alert-monitor-state.ts
- lib/services/severe-alert-monitor-account.ts
- lib/services/severe-alert-monitor-guest.ts
- lib/services/severe-alert-subscriptions.ts
- lib/services/guest-alert-subscribers.ts
- lib/push/send.ts
- app/warnings/[id]/page.tsx
- __tests__/cron-semantic-monitoring.test.ts
- __tests__/severe-alert-monitor.test.ts
- __tests__/severe-alert-monitor-state.test.ts
- __tests__/severe-alert-recipient-loading.test.ts
- __tests__/push-delivery-security.test.ts
- __tests__/warning-detail-loading.test.tsx
- tsconfig.tests.json
- planning/alert-reliability-fixes-2026-11-07.md

The preexisting Sentry investigation report is preserved unchanged.

## Release integration and dependency cleanup

- Reapplied the radar and alert fixes cleanly onto production main at c49f6c1 in an isolated release worktree, preserving the newer dependency and content releases.
- Removed the unused @onkernel/sdk dev dependency, cloud browser lifecycle files, remote fixtures and mode switches. Native Playwright browsers handle both local and deployed-preview runs; preview bypass headers and CI Chromium selection remain.
- Removed obsolete Kernel setup references from current testing guidance. Historical key detection in gitleaks remains intact.
- Dependency analysis found no additional packages required by the bundled fixes; package-lock changes remove only the unused leaf dependency.
- Latest-main validation: 304 suites / 2,587 tests passed, both TypeScript projects passed, lint passed with 89 existing warnings, Knip passed and production build passed. The local test command uses a canonical TMPDIR to avoid the existing macOS /var versus /private/var alias in newsletter subprocess fixtures; no newsletter source changes were needed.
- Kernel removal reproduction: a stale KERNEL_API_KEY with no preview URL previously prevented Playwright from loading; after cleanup the same command discovers all six warning cases across Chromium and Firefox.
