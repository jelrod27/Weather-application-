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
missing or broken archive map falls back to a neutral illustration. The source
link opens the same archived issuance. Earthquake ShakeMaps require matching
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
- Jest: 289 suites, 2,317 tests passed (`npm test -- --runInBand news rss`).
  The path pattern also matches this worktree's name, so the full suite ran.
- Both TypeScript projects passed. Production build passed with the same
  placeholder public environment values as CI. Existing framework deprecation
  and live-data/static-generation diagnostics remain outside this phase.
- Repository lint passed with existing warnings; changed files are checked
  separately before commit.
- Added desktop/mobile Playwright imagery tests with a deliberately synthetic
  map to test bounds, legends, attribution and actual failed image loads.

## Pending verification

Automatic approval review rejected both local production-server launch attempts,
including a hidden background launch, with only “blocked by policy” as the
reason. Local full-page browser journeys and Lighthouse therefore remain
unverified. The PR's deployed preview, Playwright and Lighthouse checks must
provide that evidence before merge. No automatic publication or merge is part
of this work.

## Limits

- NHC image matching is conservative: an unverified advisory/outlook gets an
  illustration, not a mutable basin map or unrelated satellite image.
- Product validity labels are evidence, not an active-warning determination.
  The existing active rail semantics and source-health gaps are phase 3/4 work.
- Provider image availability can still change; every surface has an honest
  fallback and the original source remains reachable.
