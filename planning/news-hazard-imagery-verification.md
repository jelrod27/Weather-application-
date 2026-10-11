# News hazard imagery: issue 675, phase 1

Review baseline: `e80b59901e6a6ac34b8582624791f1551497ab48` (main).

The owner approved implementation and a PR for phase 1, with the Matt Pocock
code-review skill run before pushing. Newsletter integrity, verified-active
status, grouping, and page refresh remain the later phases of
[issue 675](https://github.com/jelrod27/Weather-application-/issues/675).

## Behavior

NWS CAP event types select fixed compact vector Hazard Illustrations. High wind,
freeze/frost, flash flood, other flooding, tornado, severe thunderstorm, fire
weather, marine, and winter use distinct drawings. Unknown types use a neutral
weather-report illustration. CAP message identity, area, effective time and
expiry are retained; headline edits do not choose the drawing. Timing is shown
in UTC without claiming verified-active status.

Severe/tropical headline-hash image pools are removed. NHC products whose image
identity and issuance cannot be established use a tropical illustration.
The SPC RSS feed contains moving latest-image URLs; a validated Day 1–3 product,
issue date/time and valid interval instead select its dated archive map. A
missing or broken archive map falls back to a neutral illustration while keeping
its verified validity interval and archive link. The source link opens the same
archived issuance. Earthquake ShakeMaps require matching
USGS event identity; named-volcano photos are labeled reference views rather
than current eruption imagery. Editorial images retain provider credits where
supplied; otherwise “Via [publisher]” identifies the source without inventing a
photographer. Stock references are explicitly illustrative.

Default, featured, compact, and hero cards share rendering, credits, captions,
map containment and image-error recovery. Product maps are not cropped or
covered by priority badges. Credit-link interaction does not open a second tab
for the containing article. A failed image URL does not suppress a replacement.

## Evidence

- Provider contracts inspected October 11, 2026: [NWS Atom alerts](https://api.weather.gov/alerts/active?severity=Severe,Extreme&urgency=Immediate,Expected),
  [SPC outlook feed](https://www.spc.noaa.gov/products/spcacrss.xml),
  [dated Day 2 archive](https://www.spc.noaa.gov/products/outlook/archive/2026/day2otlk_20261011_1730.html),
  and [NHC Atlantic feed](https://www.nhc.noaa.gov/index-at.xml).
- Dated public NOAA fixtures in `__tests__/fixtures/news/`, with retrieval
  provenance, reproduce High Wind / Freeze / Flash Flood and Day 2 outlooks.
- Initial Jest run: 289 suites, 2,317 tests passed (`npm test -- --runInBand news rss`).
  The path pattern also matches this worktree's name, so the full suite ran.
- After review fixes: all seven targeted RSS/image/card suites passed, 94 tests.
  Regression coverage includes nested publisher attribution, quoted illustration
  descriptions, scientific reference-map containment and retained product facts
  after image failure.
- Both TypeScript projects passed. Production build passed with the same
  placeholder public environment values as CI. Existing framework deprecation
  and live-data/static-generation diagnostics remain outside this phase.
- Repository lint passed with existing warnings; changed files are checked
  separately before commit. Knip passed with existing configuration hints.
- Standalone Chromium rendering of the actual card/hero components with compiled
  CSS passed at 1440px and 390px: distinct warning illustrations, legible facts,
  and no horizontal overflow. This static gallery does not exercise page hydration,
  network loading or navigation and does not replace full-page E2E evidence.
- Added desktop/mobile Playwright imagery tests with a deliberately synthetic
  map to test bounds, legends, attribution and actual failed image loads.

## Standards

The independent Matt Pocock code-review standards review found two documented
convention issues: inline object parameter shapes and import ordering. Both were
fixed, and follow-up review through `0a2b43b` found no remaining documented
violations or material baseline smells. Standards: 2 findings resolved, 0 open.

## Spec

The independent phase-1 spec review found scientific reference-map cropping,
lost nested publisher metadata, missing product facts after image failure, and
quote handling that truncated some illustrative captions. All four were fixed
with regression coverage. Full-page browser verification is recorded below.
Follow-up review through `0a2b43b` found no remaining
actionable phase-1 gaps or scope creep. Spec: 4 findings resolved, 0 open.

## Deployed and CI verification

Automatic approval review rejected both local production-server launch attempts,
including a hidden background launch, with only “blocked by policy” as the
reason. At `e24fbed`, all five focused Chromium news tests passed against the
authenticated Vercel preview, including desktop/mobile imagery, map bounds and
broken-image fallbacks. Screenshots were inspected. The full CI E2E suite,
Lighthouse, build, unit tests, type checks, lint and security gates also passed.

## CodeRabbit follow-up

Two additional findings were reproduced and fixed before merge:

- Marine Storm Warnings/Watches and Hurricane Force Wind Warnings now select
  marine illustrations; Tropical Storm and Hurricane Warnings remain tropical.
- Invalid or relative earthquake links return missing imagery without rejecting
  the batch. Other earthquake items still receive their matching ShakeMaps;
  valid URLs on unrelated hosts remain rejected without a fetch.

The added regressions produced five failures before the fixes. After the fixes,
all seven targeted suites passed (102 tests), and changed-file lint passed.
The updated commit must pass the same required CI gates before merge.

## Limits

- NHC image matching is conservative: an unverified advisory/outlook gets an
  illustration, not a mutable basin map or unrelated satellite image.
- Product validity labels are evidence, not an active-warning determination.
  The existing active rail semantics and source-health gaps are phase 3/4 work.
- Provider image availability can still change; every surface has an honest
  fallback and the original source remains reachable.
