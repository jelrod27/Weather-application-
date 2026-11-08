# Reliability and accuracy follow-ups implementation plan

> **For agentic workers:** Use the repository handbook and the task boundaries below. Implement independent areas in parallel, test locally, and obtain independent review before each commit. Do not push until the integrated local validation passes.

**Goal:** Address the five follow-up areas requested on November 8, 2026 in five reviewable commits and one PR.

**Architecture:** Preserve the current Next.js/React application and provider boundaries. Repair verified defects at their existing seams, retain truthful unavailable states, and keep source-feasibility research outside runtime code.

**Tech stack:** Next.js 16, React 19, strict TypeScript, npm, Jest, Playwright, Supabase, Python research helpers.

**Spec:** User request in this chat; `CODING.md`; cloud research issue [#666](https://github.com/jelrod27/Weather-application-/issues/666); remaining concerns in `space-weather-reliability-verification-2026-11-07.md`.

## Global constraints

- Five area commits on `codex/reliability-followups-2026-11-08`, starting from main `661081d8d001104feb931ba4e60ce56ff30175a3`; one PR after local testing and repairs.
- Preserve unrelated work. Use npm and normal Git hooks. No force-push, merge, production database mutation, paid provider access, or hook bypass.
- Write meaningful regression tests before behavior fixes. Keep upstream failures visible without manufacturing successful weather observations.
- Local tests use canonical `TMPDIR=/private/tmp` for existing publication-path tests on macOS.
- Changes to shared test-project inclusions are integrated centrally. Workers do not edit package manifests, lockfile, or TypeScript project configuration.

## Review focus

- Missing radar imagery must remain a failed request, with bounded retries and no synthetic clear-weather tile.
- Alert state reads must retain batch isolation and atomic delivery ownership; historical Sentry counts alone do not justify changing already-corrected code.
- Newsletter date validation must use a dated context, catch the observed contradictions, and avoid treating a model opinion as proof of factual correctness.
- Space Weather must not turn missing, stale, malformed, predicted, or monthly observations into current daily measurements.
- Research denominators must include unavailable slots, ambiguous cloud codes must remain ambiguous, and nearby observations must not become overhead identifications.

## Task 1 — Dependency security and CodeQL triage

**Files:** `package.json`, `package-lock.json`, a dated security verification note under `planning/`.

- [x] Record baseline npm audit and dependency paths; distinguish advisory IDs from affected ancestor packages.
- [x] Verify patched versions and Node/API compatibility against the npm registry. Upgrade narrowly without downgrading the application/toolchain or suppressing unresolved advisories.
- [x] Trace CodeQL #332 from network prose to the generated Markdown write, filename construction and render boundary; fix a concrete vulnerability if found, otherwise record an evidence-backed disposition.
- [x] Install the exact lockfile and run dependency-sensitive local checks. Record any advisory without a compatible fix and its actual use.
- [x] Independently review and commit this area, including this plan.

## Task 2 — Alert and radar reliability

**Files:** `app/api/radar/tile/[...path]/route.ts`, dedicated route regression tests, dated verification note. Existing monitor code and tests are the reference for alert state batching.

- [x] Reconfirm PR #704's batched `loadMonitorStates` behavior with existing HTTP-level tests before proposing any new batching change.
- [x] Reproduce missing-tile exception classification, then retain upstream status so a known missing image gets an honest failed response and diagnostics without an application-defect exception.
- [x] Test unexpected failures, concurrent requests, stale fallback and the one-hour ceiling; preserve client recovery and proxy allow-list/rate limits.
- [x] Independently review and commit this area (`5c6f4ac`; 49 focused tests and test-project type checking passed).

## Task 3 — Newsletter temporal precision

**Files:** focused temporal validation/helper under `scripts/newsletter/`, `sunday.ts`, `data/sunday-evidence.ts`, validation integration, newsletter tests and README.

- [x] Pin the November 12–13 Thursday/Friday contradiction and November 3 16:10–19:08 UTC local-time window with failing tests.
- [x] Supply deterministic weekdays and source time-zone context; validate supported explicit weekday/date claims and local clock descriptions against dated source evidence. Reject contradictions rather than silently editing model prose.
- [x] Run the gate before publication and include detected contradictions in bounded generation correction/retry handling; exhausted contradictions must fail generation.
- [x] Test correct claims, date/year boundaries, DST/local dates, ranges, quoted/reference material, and incomplete evidence without inventing missing facts.
- [x] Verify the publication receipt and image gates still apply. Independently review and commit this area.

## Task 4 — Space Weather accuracy

**Files:** affected Space Weather routes, helpers and components; focused Jest and browser tests; dated verification note.

- [x] Map and verify remaining sunspot labeling, alert product classification, imagery contract, freshness/range and navigation findings against current NOAA/NASA contracts.
- [x] Add regressions for still-valid defects, then make the smallest corrections within the existing provider/UI architecture.
- [x] Preserve the previous release's same-spacecraft joins, unavailable/partial statuses and bounded flare retry behavior.
- [x] Run affected route/component/browser checks and independently review before committing this area.

## Task 5 — Scientific cloud-type source research

**Files:** `planning/research/cloud-types-*`, `planning/prds/PRD-read-your-sky-cloud-types.md`, PRD index.

- [x] Follow issue #666: predeclare 12 coordinates and evaluation policies before scoring; compare DWD BUFR, Meteomatics and meteoblue using primary sources and permitted real data.
- [x] Decode/sample available records, record exact retention and failures, report missing seven-day slots explicitly, and verify the research helper against known fixtures.
- [x] Produce cited taxonomy/rights/access/cost comparison, policy sensitivity, Field note A evidence examples, and go/conditional-go/no-go decision with release gates.
- [x] Keep research outside production code and avoid paid trials/provider contact. Independently review and commit this area.

## Integrated local release gate

- [x] Full Jest, both TypeScript projects, lint, Knip and production build.
- [x] Local Playwright for affected flows in Chromium and Firefox; broaden to the full suite as appropriate for shared behavior. Local Lighthouse forecast/radar/sky gates.
- [x] Repair local failures and repeat only affected checks, then perform a whole-branch independent review.
- [x] Confirm exactly five coherent area commits, clean worktree, no secrets, and current main compatibility.
- [ ] Summarize changes, evidence and limitations; push normally and open one PR using `gh`. Do not merge. (Publication is the next step after this local validation record.)
