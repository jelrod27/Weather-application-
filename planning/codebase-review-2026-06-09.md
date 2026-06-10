# Full Codebase Review and Remediation - 2026-06-09

Scope: full repository at commit e2ae4cb (main). Five-dimension audit: security,
correctness, performance/reliability, code health, data layer. Live Supabase
state inspected read-only via MCP. Baseline before changes: lint clean,
tsc clean, 482/482 unit tests pass, knip clean.

Prior art: SECURITY_FINDINGS.md (2026-05-29 sweep, remediated) and PR #430
(API hardening). All prior remediations were re-verified and hold; this pass
focuses on what they missed.

## Severity-sorted findings

### CRITICAL

C1. Single-word city searches misclassified as postal codes
- lib/weather/weather-geocoding.ts:104,137 - `/^[A-Z0-9]{3,10}$/i` matches
  letters-only input, so "London", "Paris", "Denver" parse as `type: 'zip'`.
  geocodeLocation then hits `?zip=London`, the route defaults country to US,
  `/^\d{5}$/` fails, 404 "ZIP code not found". Every single-word city search
  fails. Tests only covered multi-word cities.
- Fix: require at least one digit in the general postal pattern.
- Blast radius: dashboard search, city page metadata fetch (single-word slugs),
  any fetchWeatherData(city) caller. No legitimate letters-only postal format
  exists in the supported set (US/UK/CA patterns handle their own formats).

### HIGH

H1. Hourly forecast "now" window shifted by viewer/city timezone delta
- lib/weather/open-meteo-adapter.ts:160-183 - Open-Meteo returns tz-naive local
  wall-clock strings (timezone=auto); the adapter compares
  `new Date(naiveString).getTime()` (parsed in the runtime tz) against
  `Date.now()`. The 48h strip for a city N hours ahead of the viewer starts
  ~N hours in the past (stale "Now" + feels-like); cities behind start in the
  future. Display hour labels are unaffected (naive parse preserves wall clock).
- Fix: select startIdx using true epoch derived from `utc_offset_seconds`
  (already present in the API response). Preserve existing `dt` semantics -
  components/dashboard/location-card.tsx renders hour labels via
  `new Date(dt*1000).getHours()` and depends on the current behavior.
- Blast radius: hourly strip start index only.

H2. Missing rate limiting on expensive/paid proxy routes (NEW-1)
- app/api/aviation/flight-lookup (paid FlightAware AeroAPI - anonymous traffic
  can burn the 800/month cap in minutes, degrading the feature to mock data for
  the rest of the month), plus aviation/metar, aviation/pireps,
  space-weather/aurora, stargazer, stargazer/tle, extremes, gfs-image.
  None call rateLimitRequest; the shared limiter is already used by
  dashboard-weather, open-meteo/*, locations, geocoding, tile proxies.
- Mitigating: AeroAPI usage cap is atomic and fail-closed, so financial
  exposure is bounded; this is denial-of-feature, not unbounded spend.
- Fix: add the existing rateLimitRequest guard to each route.
- Blast radius: 8 routes; legitimate clients poll well under 120/hr.

H3. IP geolocation fallback chain: no timeouts, dead provider, Null Island
- lib/location-service.ts:206-235 - serial fetches with no AbortSignal; a hung
  ipapi.co stalls first-visit auto-location indefinitely. Third provider
  (api.ipgeolocation.io?apiKey=free) is not a real key - guaranteed dead.
- lib/location-service.ts:341 - ipinfo fallback defaults missing `loc` to
  "0,0", which passes the NaN guard and returns lat 0 / lon 0 (Gulf of Guinea).
- Fix: 3s timeout per attempt, drop the dead provider, return null when
  ipinfo omits loc.
- Blast radius: IP fallback path of auto-location.

H4. storm_reports feature dead in production; latent breakage when deployed
  (DL-01, DL-02)
- Live DB has no storm_reports table (migrations on disk since April, never
  applied); GET silently returns empty, POST returns 503.
- Worse, applying the migrations as-written breaks differently: the hardening
  migration grants column-level SELECT excluding `status`, but the route
  filters `.eq('status','approved')` (42501 permission denied); and POST chains
  `.insert().select('id').single()` whose RETURNING is denied by the
  SELECT policy (`status='approved'`) since new rows are 'pending'.
- Fix now (code): drop the POST read-back. Fix file (repo): follow-up migration
  granting SELECT(status). Applying migrations to live DB: Tier 3 (approval).
- Blast radius: storm reports POST response no longer returns the new row id
  (the form does not use it - verified).

### MEDIUM

M1. Pressure severity badge always "Low" for US users
- lib/weather-severity.ts:33 + open-meteo-adapter.ts:97 - US pressure is
  formatted "29.92 in"; getPressureCategory parses 29.92 against hPa
  thresholds (<1009 = Low). Every US/CA location shows "Low".
- Fix: detect inHg-scale values (p < 100) and convert before thresholding.

M2. Visibility card never receives data; severity always "Clear"
- lib/open-meteo.ts requests hourly visibility but open-meteo-adapter.ts:133
  hardcodes `visibility: undefined`; weather-display defaults to 10 mi ->
  "Clear" even in dense fog.
- Fix: map hourly visibility (meters -> miles) into day-0 details.

M3. Search/auto-location races in useWeatherController
- hooks/useWeatherController.ts:264-324 - handleSearch has no sequencing; a
  stale slow response overwrites a newer search's state (or a stale failure
  clobbers a newer success with setWeather(null)).
- :354-440 - auto-location effect can start twice (profile/preferences arrive
  after run #1 starts; autoLocationAttempted state is set only after awaits),
  racing IP location against the profile default location.
- Fix: request-id ref guard in handleSearch; synchronous ref guard at effect
  entry.

M4. Client cache keys ignore unit system (A4)
- hooks/useWeatherController.ts:172,182 + user-cache-service getLocationKey -
  cached WeatherData is unit-baked but keyed only by location; toggling C/F can
  serve wrong-unit payloads for up to cache TTL.
- Fix: append unit system to both keys; old entries age out.

M5. Stale theme whitelist corrupts preferences (F9/A5)
- lib/user-cache-service.ts:512 - validates against
  ['nord','miami',...] while ThemeType is ['nord','daybreak',...]; stored
  'daybreak' (the platform default) is rewritten to 'nord' on every
  getPreferences round-trip; nonexistent 'miami' passes.
- Fix: validate against THEME_LIST from theme-config; seed DEFAULT_THEME.

M6. Live-DB grants/objects drift (DL-04, DL-05, DL-08) - Tier 3
- anon/authenticated still hold ALL (incl. TRUNCATE) on all 5 public tables
  despite a revoke migration in live history; orphaned game functions
  (increment_play_count) remain anon-executable and reference dropped tables;
  leaked-password protection off; Postgres security patches pending.

M7. Migration history fully diverged from live DB (DL-03) - Tier 3
- Zero overlap between disk filenames and live schema_migrations; a
  `supabase db push` would resurrect dropped chat/AI tables and then hard-fail
  on the leaderboard view migration. Needs baseline squash + repair.

M8. generateMetadata self-HTTP chain, unbounded (A1)
- app/weather/[city]/layout.tsx:41 - every SSR of a city page makes 4+
  HTTP round-trips back into its own deployment with no timeout or revalidate,
  blocking TTFB; data is refetched by the client immediately anyway.
- Band-aid now: bounded fetches (timeouts) in the shared adapter/geocoding path.
  Architecture fix (direct lib calls + unstable_cache): Tier 3.

### LOW

L1. Corrupted weather-cache cleanup removes the wrong key
  (user-cache-service.ts:253 vs 237) - corrupt entries warn forever.
L2. RSS items with unparseable pubDate become Invalid Date and are silently
  dropped by the age filter (rssAggregator.ts:341,666).
L3. /api/extremes runs hot/cold batches serially and sends no Cache-Control
  (route.ts:87-94).
L4. Dead duplicate extremes pipeline with unbounded, key-parameterized fetches
  in lib/extremes/extremes-data.ts:185-330 (knip-invisible; latent key-leak
  hazard if ever wired up client-side).
L5. Dead searchCache state in useWeatherController (extra re-render per search).
L6. isStorageAvailable probe write on every cache op (~6+ per weather load).
L7. any-typed Supabase cookie adapters (middleware.ts:67, lib/supabase/server.ts:24)
  and untyped safeUpdates allowlist (lib/supabase/database.ts:93).
L8. _archive/ and tempest/ excluded from build only incidentally; not declared
  in tsconfig/knip.
L9. Tile-proxy CORS trusts the entire shared *.vercel.app apex (NEW-2) - Tier 3
  (needs project-name confirmation to tighten without breaking previews).
L10. In-memory rate limiter does not hold across serverless instances (NEW-3) -
  Tier 3 (needs Redis/KV dependency decision).
L11. saved_locations.user_id / user_preferences.user_id nullable (DL-06);
  weather_cache table is dead (DL-09); duplicate updated_at trigger functions
  and date-only migration prefixes (DL-10) - Tier 3, live-DB.
L12. npm audit: 4 moderate, all transitive (postcss via next; uuid via
  @lhci/cli) - fixable only upstream; monitor.
L13. Doc drift: CLAUDE.md still describes api/chat, @ai-sdk/anthropic,
  useNewsFeed.ts - none exist.
L14. Console [context] prefix convention honored by a minority of call sites;
  import-type convention scattered - Tier 3 (ESLint enforcement, not hand-fix).
L15. Duplicated formatTimeAgo (7 copies, diverging) and stargazer
  formatTime/formatDate (8 copies) - Tier 3 consolidation pass.
L16. Education pages (cloud-types, fun-facts, weather-systems) embed
  multi-hundred-line data blobs in page components - Tier 3.

## Remediation plan

Tier 1 (apply now): C1, H1, H2, H3, H4 code side.
Tier 2 (apply now): M1, M2, M3, M4, M5, M8 band-aid, L1-L8.
Tier 3 (deferred, awaiting approval):
- Live DB: apply storm_reports migrations + status grant (H4), grant revokes
  (M6), drop orphan functions (M6), NOT NULL user_id (L11), drop weather_cache
  (L11), leaked-password toggle + Postgres upgrade (M6), migration baseline
  squash/repair (M7).
- Architecture: generateMetadata direct lib calls + unstable_cache (M8),
  client cache semantics overhaul (coordinate-strip refetch, TTL split,
  route-change wipe scope - perf audit A3), fetchWithTimeout consolidation
  (adds retry behavior - B1), formatter dedup (L15), education-page data
  extraction (L16), ESLint enforcement of console-prefix and type-imports
  (L14), CORS tightening (L9), distributed rate limiting (L10).

Remediation status is tracked in git history on branch
audit/full-review-2026-06; see commit messages referencing finding IDs.

## Applied (2026-06-09, branch audit/full-review-2026-06)

- C1 geocoding postal misclassification (+ regression tests)
- H1 hourly window timezone shift (+ tz-explicit regression test)
- H2 rate limiting on flight-lookup, metar, pireps, stargazer, extremes.
  Deliberately skipped: stargazer/tle and aurora (cache-protected,
  limiter would force them dynamic); gfs-image (edge runtime, shared
  limiter is not edge-compatible - moved to Tier 3)
- H3 IP fallback timeouts + dead provider removal + Null Island guard
  (+ tests)
- H4 code side: POST read-back removed; status-grant migration file
  added (NOT applied to live DB - Tier 3)
- M1 pressure inHg categorization (+ tests)
- M2 visibility mapping (+ test); also restored the extremes travel
  detail fields dropped during the route extraction
- M3 search/auto-location race guards
- M4 unit-scoped cache keys
- M5 theme whitelist from canonical THEME_LIST (+ tests)
- M8 band-aid: 10s timeouts on the shared geocode/forecast fetch chain
- L1 corrupted-cache key fix (+ test), L2 RSS pubDate guard (+ test),
  L3 extremes parallelization + cache headers, L4 dead pipeline deleted,
  L5 dead searchCache state removed, L6 storage probe memoized,
  L7 typed cookie adapters + safeUpdates, L8 declared exclusions,
  L13 CLAUDE.md drift corrected.

Verification: lint clean (9 pre-existing warnings in untouched files),
tsc clean, 497/497 unit tests pass, production build passes.

## Tier 3 applied (2026-06-09, same branch, user-approved)

Live database (via Supabase MCP, each recorded in live history and
mirrored as a repo migration file):
- storm_reports + hardening + status grant applied; anon-role smoke test
  of the route query passes. Also tightened the table's inherited default
  grants (new finding: TRUNCATE et al were left granted).
- Grant tightening on profiles/saved_locations/user_preferences/
  aeroapi_usage (re-granted exactly what RLS policies support).
- Dropped orphaned game functions; dropped dead weather_cache table.
- user_id NOT NULL on saved_locations/user_preferences after deleting 10
  orphaned NULL-owner rows (single broken 2025-09-06 test batch).
- Repo: 4 dangerous/superseded legacy migrations renamed .sql.skip;
  supabase/migrations/README.md documents the history divergence and the
  db-push hazard.

Architecture:
- A1: generateMetadata now calls Open-Meteo geocoding/forecast directly,
  cached 15 min per slug (no more self-HTTP on city page SSR).
- A3: client cache serves cached data (background coordinate refresh,
  10-min TTL for the whole blob, navigation no longer wipes caches).
- B1: five fetch-timeout clones consolidated onto lib/fetch-with-timeout.
- B2/B3: formatTimeAgo (7 copies) and stargazer formatters (6 of 8
  copies; 2 intentionally divergent stay local) consolidated.
- L16: education page data blobs extracted to data/ modules.
- L9: tile-proxy CORS scoped to this project's preview hostnames.
- gfs-image: CDN caching (s-maxage) as the edge-appropriate abuse control.
- L14 (half): consistent-type-imports enforced via ESLint + autofix.

## Remaining (not automatable from here)

1. Supabase dashboard: enable leaked-password protection (Auth settings).
2. Supabase dashboard: schedule the Postgres minor upgrade (security
   patches pending on supabase-postgres-17.4.1.075).
3. Distributed rate limiting (Upstash/Vercel KV) - needs infra
   provisioning and secrets; in-memory limiter remains per-instance.
4. Console [context]-prefix sweep (147 sites) - declined as low-value
   churn; would need a custom ESLint rule to enforce.
