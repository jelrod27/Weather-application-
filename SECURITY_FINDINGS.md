# Security and Bug Sweep - 16bitweather

Date: 2026-05-29
Scope: Full codebase at `/Users/justinelrod/Projects/Weather-application`
Stack: Next.js 16 (App Router), React 19, Supabase (Postgres + Auth), OpenLayers, Vercel
Method: 8-phase grounded sweep.
Document state: remediated branch snapshot. The original pass was detection and
triage only; fixes were subsequently applied on branch
`security/sweep-fixes-2026-05` (see "Remediation status" near the end for the
authoritative per-finding state, with commit/verification details).

## Executive summary

This codebase is unusually well-hardened for its surface area. The areas that
normally produce CRITICAL/HIGH findings in this stack - SSRF in tile/data
proxies, IDOR on user tables, service_role key exposure, RLS gaps, open
redirects, auth-bypass test hooks - have all been deliberately defended, and
those defenses were verified against real code (see "Verified safe" sections).

No CRITICAL or HIGH findings. The actionable items are three MEDIUMs (one
confirmed HTTP parameter-injection in the NewsAPI proxy, the CSP `unsafe-inline`
posture, and gaps in rate limiting), a set of LOW/INFO hardening items, and two
correctness bugs.

Notable surface change vs. CLAUDE.md: there is currently **no Vercel AI SDK / AI
chat code in the tree** (`@ai-sdk/*`, `streamText`, `generateText`, `useChat`,
`anthropic(` all return zero hits in `app/`, `lib/`, `hooks/`, `components/`).
Phase 4 (AI SDK) therefore has no live attack surface to report. If an AI route
is reintroduced, re-run Phase 4 - an unauthenticated/unthrottled AI route would
be the highest-value target in this app.

---

## SECURITY FINDINGS

### SEC-001 - HTTP parameter / path injection in NewsAPI proxy
- Severity: MEDIUM
- Confidence: confirmed
- Location: `app/api/news/route.ts:111-160`
- Evidence:
  ```js
  const endpoint = searchParams.get('endpoint') || 'top-headlines';  // 111
  const country  = searchParams.get('country')  || 'us';             // 114
  const language = searchParams.get('language') || 'en';             // 116
  const pageSize = searchParams.get('pageSize') || '10';             // 117
  let apiUrl = `${NEWS_API_URL}/${endpoint}?`;                        // 143  (raw path segment)
  ...
  apiUrl += `country=${country}&`;     // 153  raw, no encodeURIComponent
  apiUrl += `category=${category}&`;   // 155  raw
  apiUrl += `language=${language}&`;   // 149  raw
  apiUrl += `pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;  // 160  raw
  ```
- Impact: `searchParams.get()` returns a URL-decoded string, which is then
  concatenated into the upstream URL without re-encoding. A request like
  `GET /api/news?country=us%26apiKey%3DattackerKey` produces upstream
  `...?country=us&apiKey=attackerKey&...`, splicing attacker-chosen query
  parameters into the server's NewsAPI request (override `apiKey`, `sources`,
  `sortBy`, etc.). `endpoint` is injected as a raw path segment
  (`endpoint=top-headlines/../everything`), allowing path manipulation within
  `newsapi.org`. The upstream host is hardcoded to `https://newsapi.org/v2`, so
  this is parameter/query smuggling against that one API, not arbitrary-URL
  SSRF. Note: `q` (line 147) and `domains` (line 148) are already handled safely
  (`encodeURIComponent` / charset strip); only `endpoint`, `country`,
  `category`, `language`, `pageSize` are unsafe.
- Remediation: Allowlist `endpoint` to `['top-headlines','everything']`;
  validate `country`/`language` as ISO-2, `category` against a fixed enum, and
  clamp `pageSize` to an integer in 1-100; wrap every interpolated value in
  `encodeURIComponent`.

### SEC-002 - CSP allows `'unsafe-inline'` in `script-src`
- Severity: MEDIUM
- Confidence: confirmed
- Location: `middleware.ts:14-38` (script-src at 16-17)
- Evidence:
  ```text
  script-src 'self' 'unsafe-inline' https://vercel.live https://vercel.com https://va.vercel-scripts.com
  ```
- Impact: `'unsafe-inline'` permits arbitrary inline `<script>` execution, which
  substantially defeats CSP's role as an anti-XSS backstop. Any future HTML or
  attribute injection that reaches the DOM would execute. The `connect-src`
  allowlist (line 29) limits exfiltration destinations and is a good
  complementary control, but does not stop inline execution. The inline comment
  documents this as required for SSG hydration (Next.js cannot inject
  per-request nonces into pre-baked static HTML) - a genuine App Router
  constraint. Residual risk is moderate today because Phase 5 found no
  untrusted-input HTML sink (React auto-escaping everywhere; the only
  `dangerouslySetInnerHTML` is escaped JSON-LD).
- Remediation: Move dynamically rendered routes toward nonce/hash-based
  `script-src` (or `strict-dynamic` with hashes for the bootstrap scripts) where
  feasible; otherwise treat as accepted risk and keep the no-untrusted-HTML
  invariant. `style-src 'unsafe-inline'` (line 22) is also present but far lower
  risk.

### SEC-003 - Missing/partial rate limiting on auth writes and proxy routes
- Severity: MEDIUM
- Confidence: confirmed
- Location: multiple (see list)
- Evidence: A rate limiter exists (`lib/services/weather-rate-limiter.ts`,
  120/hr + 30/5min) and is applied to `app/api/open-meteo/forecast`,
  `open-meteo/air-quality`, `dashboard-weather`, and `locations` POST
  (`app/api/locations/route.ts:8`). `app/api/news/route.ts:22-43` has its own
  limiter. The following have NO rate limiting:
  - `app/api/user/preferences/route.ts` - GET/PUT/POST (writes at 66/122), authenticated but unthrottled
  - `app/api/locations/route.ts` - GET (line 144); only POST is limited
  - `app/auth/callback/route.ts`, `app/auth/signout/route.ts` - auth routes
  - Expensive proxies: most of `app/api/space-weather/*`, `app/api/aviation/*`, `app/api/weather/{onecall,uv,pollen,precipitation,geocoding,noaa-wms,iowa-nexrad}`, `app/api/stargazer`
- Impact: Unbounded hammering of authenticated write paths (preferences) and
  upstream-proxying routes risks upstream-API quota exhaustion / cost
  amplification and DB write load. Additionally (INFO): every limiter is
  in-memory (`new Map`, `weather-rate-limiter.ts:41`; `news/route.ts:22`). On
  Vercel serverless each instance has its own map and instances are ephemeral,
  so limits are not enforced globally even where applied.
- Remediation: Apply `rateLimitRequest` to preferences writes, locations GET,
  auth routes, and the expensive proxy routes; migrate to a shared store
  (Upstash/Redis) for correctness across serverless instances.

### SEC-004 - Raw upstream error message returned to client
- Severity: LOW (information disclosure)
- Confidence: confirmed
- Location: `app/api/news/rss/route.ts:60-68`
- Evidence:
  ```js
  } catch (error) {
    console.error('RSS aggregation error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch news',  // 64
      items: [],
    }, { status: 500 });
  }
  ```
- Impact: Only route in `app/api/` that forwards a raw `error.message` to the
  response body (verified by grep). Leaked content is RSS-aggregation internals
  (upstream URLs, parser errors) - low value, no stack trace.
- Remediation: Return a static `message: 'Failed to fetch news'`; keep
  `console.error` server-side.

### SEC-005 - Wildcard `Access-Control-Allow-Origin: *` on news endpoints
- Severity: LOW
- Confidence: confirmed
- Location: `app/api/news/route.ts:278-288` (OPTIONS, line 282),
  `app/api/news/aggregate/route.ts:131-142` (OPTIONS, line 136)
- Evidence: `'Access-Control-Allow-Origin': '*'` in both preflight handlers.
- Impact: Any site can read these endpoints cross-origin. They are
  unauthenticated, read-only public news proxies with no
  `Access-Control-Allow-Credentials`, so no cookie/session theft is possible -
  the key mitigating factor. The tile proxies were already remediated to an
  allowlist (`lib/services/tile-proxy-cors.ts`); the news routes were not given
  the same treatment.
- Remediation: Reuse the `tileProxyOriginHeaders` allowlist for the news OPTIONS
  handlers, or accept as an intentional public API.

### SEC-006 - `weather_cache` table has anon-readable `USING (true)` SELECT policy
- Severity: LOW
- Confidence: confirmed (live DB inspected via Supabase MCP)
- Location: Supabase `public.weather_cache` (policy "Public read weather cache", `cmd: SELECT`, `roles: {public}`, `qual: true`); not in `supabase/migrations/`
- Impact: `anon` can `SELECT * FROM weather_cache` unconditionally. The table
  currently holds 0 rows of non-user cached weather data, so impact is minimal
  today. Flagged because `USING (true)` on the `public` role is the exact
  broad-anon pattern to surface: if the table is later repurposed for
  user-linked data, every row becomes world-readable with no per-user scope.
- Remediation: Drop the table if dead; otherwise replace `USING (true)` with a
  scoped policy or restrict to `service_role` (revoke SELECT from
  anon/authenticated), matching `aeroapi_usage`.

### SEC-007 - `handle_new_user()` SECURITY DEFINER function EXECUTE-granted to anon/authenticated
- Severity: LOW
- Confidence: confirmed (live DB; Supabase advisor lints 0028/0029)
- Location: Supabase `public.handle_new_user()` (trigger function exposed via PostgREST `/rpc/handle_new_user`)
- Impact: Defense-in-depth only. The function is `RETURNS trigger`; invoking it
  directly via RPC supplies no `NEW` record, so the body errors rather than
  inserting arbitrary rows. `search_path` is correctly pinned to `''`. No
  practical exploit, but it needlessly enlarges the RPC attack surface and
  trips the security advisor.
- Remediation: `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;` (triggers still fire as table owner).

### SEC-008 - `safeJsonLd` does not escape U+2028 / U+2029
- Severity: LOW (not exploitable as currently wired)
- Confidence: confirmed
- Location: `lib/utils.ts:22-25`
- Evidence:
  ```ts
  export function safeJsonLd(obj: unknown): string {
    return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  }
  ```
- Impact: `<`/`>` are escaped, so `</script>`, `<!--`, `<script>` breakouts are
  neutralized at all 7 sinks (all `<script type="application/ld+json">`, where
  content is parsed as data, not executed JS - so unescaped line separators
  cannot trigger execution). The reflected-city-slug hypothesis was traced and
  is inert (slug flows through `safeJsonLd` into a JSON-LD block; the `<` in a
  `</script>` payload is escaped). The helper would become unsafe only if reused
  inside an executable inline `<script>`.
- Remediation: Future-proof by also escaping ` `/` `.

### SEC-009 - 7Timer stargazer data source fetched over HTTP
- Severity: LOW
- Confidence: confirmed
- Location: `lib/stargazer/seven-timer.ts:3-15` (`SEVEN_TIMER_BASE = 'http://www.7timer.info/bin/astro.php'`)
- Impact: Only non-HTTPS external source in the app. Called server-side, so no
  browser mixed-content blocking on the HTTPS site. Residual risk is
  server-to-server: the response is cleartext and MITM-tamperable, and the
  parsed JSON populates stargazer forecasts.
- Remediation: Switch to HTTPS if 7Timer supports it; keep the call strictly
  server-side and validate/clamp the parsed numeric fields.

### SEC-010 - Supabase platform hardening (leaked-password protection off, Postgres patch available)
- Severity: LOW
- Confidence: confirmed (live security advisors)
- Location: Supabase project config (`auth_leaked_password_protection` disabled; `vulnerable_postgres_version` on supabase-postgres-17.4.1.075)
- Impact: Platform config, not code. HaveIBeenPwned password checks are off;
  the Postgres minor has outstanding security patches.
- Remediation: Enable leaked-password protection in Auth settings; schedule the
  Postgres upgrade.

### SEC-011 - Core user-table schemas/RLS are not in tracked migrations (config drift)
- Severity: INFO
- Confidence: confirmed
- Location: `supabase/migrations/` (no `CREATE TABLE` / `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` for `profiles`, `saved_locations`, `user_preferences`, `weather_cache`)
- Impact: Not a runtime vulnerability - live RLS is correct (see Verified safe).
  The risk is operational: RLS posture for the core user tables is unversioned,
  so a regression in the dashboard would not show up in review, and a rebuild
  from migrations would not reproduce it. `20260509_user_ai_memory_harden.sql`
  shows this drift has already required out-of-band fixes once.
- Remediation: Capture the live table definitions and policies as baseline
  migration files.

### SEC-012 - npm audit: 4 moderate advisories, all low reachability
- Severity: LOW
- Confidence: confirmed
- Location: `package-lock.json` (transitive/dev)
- Evidence: `npm audit` = critical 0, high 0, moderate 4, low 0.
  1. `postcss <8.5.10` (GHSA-qx2v-qp2m-jg93, CSS-stringify XSS) - transitive under `next`, build-time only, not runtime-reachable.
  2. `uuid <11.1.1` (GHSA-w5hq-g745-h8pq, missing buffer bounds check) - transitive via `@lhci/cli` (dev-only Lighthouse), vulnerable `buf` path not used.
  3. `next` (moderate) - flagged only via its bundled postcss (#1); suggested "fix" downgrade is bogus.
  4. `@lhci/cli` (moderate) - flagged only via uuid (#2); dev dependency.
- Impact: None of the four expose a runtime-reachable path in the deployed app.
- Remediation: Low urgency. Upgrade Next when a release bundles postcss
  >=8.5.10; defer the dev-only `@lhci/cli`/uuid chain.

---

## BUG FINDINGS (non-security)

### BUG-001 - Unguarded `item.weather[0]` access on forecast API response
- Severity: LOW
- Confidence: confirmed (code), needs-verification (trigger likelihood)
- Location: `lib/weather/weather-forecast.ts:100-101, 129, 140`
- Evidence:
  ```js
  condition: item.weather[0].main,            // 100
  description: item.weather[0].description,   // 101
  ... item.weather[0].main.toLowerCase() ...  // 129
  condition: mapWeatherCondition(item.weather[0].main),  // 140
  ```
  while sibling fields in the same loop defensively use optional chaining
  (`item.wind?.speed`, `item.clouds?.all`; line ~369 even guards
  `hours.find(h => h.weather?.[0])?.weather?.[0]`).
- Impact: If any forecast list entry has an empty/missing `weather` array, this
  throws `Cannot read properties of undefined (reading 'main')`, aborting the
  entire forecast transform and breaking forecast rendering. OpenWeatherMap
  reliably returns a non-empty `weather` array per entry, so this is unlikely in
  practice, but it is inconsistent with the defensive style used everywhere else
  in the same function and is a single point of failure if the upstream contract
  varies.
- Remediation: `item.weather?.[0]?.main ?? 'Unknown'` (and same for
  `description`) to match surrounding code.

### BUG-002 - `@ts-expect-error` masking write-payload types in preferences route
- Severity: INFO
- Confidence: confirmed
- Location: `app/api/user/preferences/route.ts:97, 153-154` (on `.update(updates)` and `.insert(initialPreferences)`)
- Evidence: Two `@ts-expect-error` suppress the supabase-js Database generic on
  write calls. Comments document this as a known generic-marker mismatch (not a
  column mismatch), and the payloads are built from Zod-validated input - so not
  a bug today. It does remove compile-time checking of the write payload shape;
  a future column rename would not be caught.
- Remediation: Awareness only; consider regenerating Supabase types so the
  suppressions can be removed.

---

## Verified safe (grounded negatives worth recording)

These are areas explicitly probed and confirmed defended in real code, so they
are not findings:

- Service_role key: confined to two cron routes (`app/api/cron/keep-alive`,
  `app/api/cron/aeroapi-usage`), each gated by a constant-time `timingSafeEqual`
  Bearer compare against `CRON_SECRET` before the key is constructed, plus
  `lib/services/aeroapi-usage.ts` (server-only) and excluded dev scripts. Never
  in a `"use client"` file or unauthenticated route. `PLACEHOLDER_SERVICE_KEY`
  is an obvious non-secret and both routes refuse to run if the resolved key
  equals it.
- Secrets in git: `git log --all -p` on env files shows only placeholders; only
  `.env.example` is tracked; no `sk-`/`AKIA`/real-JWT literals.
- Client-exposed env: only `NEXT_PUBLIC_*` (Supabase URL/anon key, base URL,
  Sentry DSN, Google verification, Vercel URL) - all non-sensitive by design.
- RLS: enabled on all public tables; `profiles`/`saved_locations`/
  `user_preferences` policies are owner-scoped on `auth.uid()`. No `USING(true)`
  on any user-data table.
- IDOR / mass assignment: `app/api/user/preferences` and `app/api/locations`
  derive `user_id` from the verified session, scope every query with
  `.eq('user_id', ...)`, validate with `.strict()` Zod schemas, and write only
  explicit columns (no `...body` spread).
- SSRF: every tile/data proxy (noaa-wms, iowa-nexrad(+tiles), radar, gfs-image,
  sdo-image, coronagraph, stargazer/tle, geocode, geocoding, og/*) uses a
  hardcoded upstream host with allowlisted params or strict per-segment regex;
  none accept a user-supplied URL/host.
- Open redirect: `app/auth/callback/route.ts` runs `next` through
  `validateRedirectPath()` (`lib/utils/redirect-validation.ts`), which rejects
  `//`, any `:`, and backslashes; `next=https://evil.com` falls back to
  `/dashboard`. Middleware sets `next` from server-derived pathname.
- Auth-bypass test mode: `lib/playwright-test-mode.ts` requires
  `NODE_ENV !== 'production'` in both return branches - unconditionally false in
  prod regardless of headers/cookies. The old client-side phantom-session bypass
  was already removed.
- XSS: all 7 `dangerouslySetInnerHTML` sites route escaped JSON-LD into
  `<script type="application/ld+json">`. No other `innerHTML`/`document.write`/
  `eval`/`new Function` anywhere. OpenLayers popups (TurbulenceMap,
  warnings-alert-map, SPCOutlookMap, TravelCorridorMap) render feature
  properties as React JSX children (auto-escaped), not via innerHTML. News feed
  titles/descriptions render as escaped JSX text.
- Auth tokens: Supabase SSR cookie-based; no manual token persistence to
  localStorage (the localStorage loop in `auth-context.tsx` only deletes stale
  keys on signout).
- Resource cleanup: all 5 OpenLayers maps call `setTarget(undefined)` +
  `dispose()` on unmount; all `setInterval`/`addEventListener`/Supabase auth
  subscriptions audited have matching cleanup; data-fetch races use
  AbortController / `Promise.allSettled`.
- SQL injection: only two `.rpc()` calls, both typed-param; no string-built SQL.
- No Supabase Storage or Realtime usage (no bucket/upload/channel attack
  surface).
- CSRF: state-changing routes authenticate via `Authorization: Bearer`
  (locations) or server-side `getUser()` (preferences), not cookie-only, so not
  classically CSRF-exploitable.

---

## Triage table - SECURITY (sorted by severity)

| ID | Severity | Title | Location | Confidence |
|----|----------|-------|----------|------------|
| SEC-001 | MEDIUM | HTTP parameter/path injection in NewsAPI proxy | `app/api/news/route.ts:111-160` | confirmed |
| SEC-002 | MEDIUM | CSP allows `unsafe-inline` in script-src | `middleware.ts:14-38` | confirmed |
| SEC-003 | MEDIUM | Missing/partial rate limiting (auth writes, proxies; in-memory only) | multiple | confirmed |
| SEC-004 | LOW | Raw upstream error message to client | `app/api/news/rss/route.ts:60-68` | confirmed |
| SEC-005 | LOW | Wildcard CORS on news endpoints | `app/api/news/route.ts:282`, `aggregate/route.ts:136` | confirmed |
| SEC-006 | LOW | `weather_cache` anon `USING(true)` SELECT policy | Supabase `public.weather_cache` | confirmed |
| SEC-007 | LOW | `handle_new_user()` EXECUTE-grant to anon/authenticated | Supabase RPC | confirmed |
| SEC-008 | LOW | `safeJsonLd` does not escape U+2028/U+2029 | `lib/utils.ts:22-25` | confirmed |
| SEC-009 | LOW | 7Timer source over HTTP (server-side) | `lib/stargazer/seven-timer.ts:3-15` | confirmed |
| SEC-010 | LOW | Supabase auth/platform hardening off | Supabase config | confirmed |
| SEC-011 | INFO | Core user-table RLS not in tracked migrations | `supabase/migrations/` | confirmed |
| SEC-012 | LOW | 4 moderate npm advisories, low reachability | `package-lock.json` | confirmed |

## Triage table - BUGS (sorted by severity)

| ID | Severity | Title | Location | Confidence |
|----|----------|-------|----------|------------|
| BUG-001 | LOW | Unguarded `item.weather[0]` access in forecast transform | `lib/weather/weather-forecast.ts:100-140` | confirmed (code) |
| BUG-002 | INFO | `@ts-expect-error` masks write-payload types | `app/api/user/preferences/route.ts:97,153-154` | confirmed |

---

## Remediation status (branch `security/sweep-fixes-2026-05`)

Code fixes applied in this branch (tsc + eslint + affected unit tests pass):

| ID | Status | What changed |
|----|--------|--------------|
| SEC-001 | FIXED | `app/api/news/route.ts` - `endpoint`/`category` allowlisted, `country`/`language` ISO-2 validated, `pageSize` clamped 1-100. Injection vectors closed. |
| SEC-003 | PARTIAL | `rateLimitRequest` now applied to preferences GET/PUT/POST and locations GET. The shared-store migration (for correctness across serverless instances) is NOT done - still in-memory. |
| SEC-004 | FIXED | `app/api/news/rss/route.ts` - returns static `Failed to fetch news`; detail stays in `console.error`. |
| SEC-005 | FIXED | News `OPTIONS` handlers now use `tileProxyOriginHeaders` (origin allowlist) instead of `*`. |
| SEC-008 | FIXED | `lib/utils.ts` `safeJsonLd` now also escapes U+2028/U+2029. |
| SEC-009 | FIXED | `lib/stargazer/seven-timer.ts` switched to `https://` (HTTPS support verified). |
| BUG-001 | FIXED | `lib/weather/weather-forecast.ts` - `item.weather[0]` accesses now optional-chained with fallbacks. |

DB migrations: written AND applied to the live project via the Supabase MCP on
2026-05-29 (verified post-apply: `weather_cache` has 0 policies,
`handle_new_user` EXECUTE is false for anon and authenticated, core user tables
retain 8 owner-scoped policies). Files are committed in the branch and the
remote migration history reflects the apply.

| ID | Status | File |
|----|--------|------|
| SEC-006 | APPLIED VIA MCP (verified 2026-05-29) | `supabase/migrations/20260529_security_sweep_hardening.sql` (drops the `USING(true)` weather_cache policy) |
| SEC-007 | APPLIED VIA MCP (verified 2026-05-29) | same file (revokes EXECUTE on `handle_new_user()` from anon/authenticated) |
| SEC-011 | APPLIED VIA MCP (verified 2026-05-29) | `supabase/migrations/20260529_baseline_user_tables_rls.sql` (version-controls current RLS posture; faithful no-op capture) |

Requires action outside this repo (cannot be fixed in code):

| ID | Status | Action needed |
|----|--------|---------------|
| SEC-002 | ACCEPTED RISK | CSP `script-src 'unsafe-inline'` is required for Next.js SSG hydration; left as-is and documented. Revisit with nonce/hash `strict-dynamic` if dynamic-route XSS surface grows. Invariant to hold: no `dangerouslySetInnerHTML` of untrusted input. |
| SEC-010 | TODO (dashboard) | Enable leaked-password protection in Supabase Auth settings; schedule the Postgres minor upgrade. |
| SEC-012 | DEFERRED | 4 moderate npm advisories are all build/dev-only and not runtime-reachable; upgrade Next when it bundles postcss >=8.5.10. |
| BUG-002 | AWARENESS | `@ts-expect-error` in preferences route documents a known supabase-js generic mismatch; regenerate DB types to remove. |

## Fix-first shortlist (exploitability x blast radius)

1. **SEC-001** - HTTP parameter injection in `app/api/news/route.ts`. The only
   confirmed externally-triggerable injection. Bounded to one upstream host, but
   directly exploitable and a quick fix (allowlist + `encodeURIComponent`).
2. **SEC-003** - Rate limiting. Apply the existing `rateLimitRequest` helper to
   preferences writes, locations GET, auth routes, and the expensive proxies;
   plan the move to a shared store so limits actually hold on Vercel. Highest
   cost/abuse blast radius.
3. **SEC-002** - CSP `unsafe-inline`. Document as accepted risk and hold the
   no-untrusted-HTML invariant now; pursue nonce/hash migration for dynamic
   routes when feasible. This is the single biggest defense-in-depth weakness if
   any XSS sink is ever introduced.
4. **SEC-006 / SEC-007** - Two quick Supabase policy/grant tightenings that
   clear advisor lints and remove anon-reachable surface (`USING(true)` policy
   and an anon-executable SECURITY DEFINER function).
5. **BUG-001** - One-line defensive fix that removes a single point of failure
   in forecast rendering.
