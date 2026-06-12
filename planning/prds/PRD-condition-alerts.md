# PRD: Location-Scoped Condition Alerts (Stargazing Windows, Severe Events)

**Version:** 1.0
**Date:** 2026-06-11
**Author:** Justin Elrod / Claude Analysis
**Project:** 16-Bit Weather (16bitweather.co)
**Priority:** P3
**Effort estimate:** L (build is four separate executor plans, each M)
**Spike commit:** `2243b04`, 2026-06-11

---

## Table of Contents

1. [Problem and Evidence](#1-problem-and-evidence)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [v1 Scope](#3-v1-scope)
4. [Design](#4-design)
5. [Schema](#5-schema)
6. [Open Questions](#6-open-questions)
7. [Effort Estimate](#7-effort-estimate)
8. [Kill Criteria](#8-kill-criteria)
9. [Rollout](#9-rollout)
10. [Maintenance Notes](#10-maintenance-notes)

---

## 1. Problem and Evidence

### The gap

The platform computes high-quality, per-location stargazing conditions on demand but surfaces that computation only to whoever happens to be on the page at the moment. Users with accounts and saved locations receive no proactive signal when a genuinely good window opens or a severe-weather item drops for their region. The result is that the most time-sensitive value the platform can deliver — "Friday night is your best window this week" — is invisible unless the user already opened the app and saw it.

This is the largest grounded product gap identified in the 2026-06-11 codebase audit. The spike's job is to determine whether the infrastructure exists to close it cheaply, and how.

### Evidence (all verified at commit `2243b04`)

**1. Sky scoring is callable server-side and is pure.**
`app/api/stargazer/route.ts` imports `scoreHour` (line 14) and `findBestWindow` (line 15) from `lib/stargazer/score.ts`. The route sets `export const revalidate = 900` (line 45) and fans out five parallel upstream fetches via `Promise.all` (line 129): Open-Meteo, 7Timer, ISS TLE from CelesTrak, upcoming launches, and reverse geocoding. The scoring functions in `lib/stargazer/score.ts` are pure (no side effects) and unit-tested at `__tests__/stargazer/score.test.ts`. This means they can be imported directly into a cron route without re-fetching the HTTP handler.

**2. Saved locations with lat/lon and user IDs exist.**
`lib/supabase/types.ts` lines 50-96 define the `saved_locations` table row shape: `id`, `user_id`, `latitude`, `longitude`, `city`, `country`, `is_favorite`, etc. CRUD is implemented in `lib/supabase/database.ts` starting at line 164 (`getSavedLocations`, `saveLocation`, `updateSavedLocation`, `deleteSavedLocation`). User preferences (including `temperature_unit` and `auto_location`) are keyed to Supabase auth users with RLS at `lib/supabase/types.ts` lines 97-133.

**3. High-urgency news categories are kept fresh.**
`lib/services/rss/feedSources.ts` lines 13 and 15 define `'severe'` and `'hurricanes'` as `FeedCategory` values. `lib/services/rss/rssAggregator.ts` lines 65-67 assign both to the `'fast'` cache tier (5-minute in-memory TTL, 300s CDN `s-maxage`). `app/api/news/rss/route.ts` line 56 sets the `Cache-Control` response header by calling `cacheControlForCategories(categories)`, which resolves to the Fast tier whenever `severe` or `hurricanes` is present.

**4. A Vercel cron mechanism exists and is proven.**
`vercel.json` lines 40-45 define one cron job: `POST /api/cron/keep-alive` on schedule `0 8 */3 * *`. `app/api/cron/keep-alive/route.ts` shows the established pattern: CRON_SECRET bearer-token check with constant-time comparison, service-role Supabase client, and a lightweight DB ping. `app/api/cron/aeroapi-usage/` is a second handler in the same directory, confirming the pattern is in active use.

**5. What does not exist.**
No `alert_subscriptions` or `user_alerts` table exists anywhere in `supabase/migrations/` or `lib/supabase/types.ts`. There is no email-sending library in `package.json` (no `@sendgrid/*`, `resend`, `nodemailer`, `postmark`, or equivalent). There is no WebPush or service-worker code in the codebase. The `user_preferences` table has a `notifications_enabled` boolean (types.ts line 105) but it is not wired to any delivery channel.

**6. Prior art for shipped-PRD workflow.**
PRDs live in `planning/prds/` with a README index (`planning/prds/README.md`). The newsletter pipeline (`scripts/newsletter/`) and GitHub Actions (`newsletter-sunday.yml`, `newsletter-wednesday.yml`) represent the closest existing "scheduled content generation" machinery. That pipeline demonstrates the team's willingness to run scheduled server-side work.

---

## 2. Goals and Non-Goals

### Goals

- G1. A signed-in user with a saved location can opt in to receive an in-app alert when a "Good" or better stargazing window is forecast for that location within the next 24 hours.
- G2. Alerts are evaluated automatically once per day by a Vercel cron job, requiring no user action.
- G3. The in-app alert center shows unread alerts with a badge count; reading an alert marks it read.
- G4. A user can enable or disable alerts per saved location from a settings UI.
- G5. Alert fatigue is bounded by design: at most one "best window" alert per saved location per 7-day rolling window.
- G6. No external services (email providers, push vendors) are introduced in v1.
- G7. The solution is idempotent: running the cron job twice in one day produces the same alerts as running it once.

### Non-Goals (v1)

- Email delivery (no email infrastructure today; add after in-app proves the feature is wanted).
- Web Push / service-worker notifications (higher implementation cost, requires permission UX and a service worker).
- Severe-weather news alerts matched to saved locations (see §6 Open Questions — the feeds carry only free-text location strings, not structured coordinates; geographic matching is out of scope until the news pipeline gains structured geography).
- Travel-route alerts.
- Aurora or other space-weather alert kinds.
- Real-time alerts (WebSocket or SSE push to open browser tabs).
- Alert digests or scheduling preferences (e.g., "only notify at 8am").

---

## 3. v1 Scope

One alert kind, one delivery channel:

- **Kind:** `stargazing_window` — fires when the best-window score for a saved location is >= a user-configurable threshold (default: 70 = "Good") on the upcoming night.
- **Channel:** In-app alert center. A `user_alerts` table stores records; the UI renders a bell/badge in the header; a drawer lists alerts sorted by recency.
- **Evaluation:** Daily Vercel cron job, evaluating all active subscriptions in a single invocation.
- **Auth gate:** Alerts are only computed for authenticated users with saved locations and active subscriptions.

---

## 4. Design

### 4.1 Trigger mechanism

**Feasibility: YES for Pro plan; NO for Hobby on sub-daily schedules.**

Vercel cron jobs allow up to 100 per project on all plans. The critical constraint is scheduling granularity:
- **Hobby plan**: minimum interval is once per day. Schedules more granular than daily fail deployment with an explicit error.
- **Pro plan**: minimum interval is once per minute; scheduling precision is per-minute.

Source: Vercel docs at `/docs/cron-jobs/usage-and-pricing` (verified 2026-06-11).

A daily cron at e.g. `0 14 * * *` (14:00 UTC — morning/midday across the Americas, giving a full day of lead time before that night's window) fits within Hobby limits and aligns with the feature: users want alerts for that night's window, so evaluating by mid-afternoon gives several hours of advance notice.

**Execution time budget:**
- Hobby: maxDuration is 300s (5 minutes) — also the default for Pro.
- Pro: maxDuration can be extended to 800s (13 minutes).

Source: Vercel docs at `/docs/functions/configuring-functions/duration` (verified 2026-06-11).

**Throughput estimate:** The stargazer pipeline makes 5 upstream fetches per location (Open-Meteo, 7Timer, ISS TLE, launches, reverse geocoding — `app/api/stargazer/route.ts` lines 129-134). However:
- ISS TLE (`revalidate: 7200`) and launches are not needed for scoring; they can be omitted from the cron pipeline, reducing to 3 fetches (Open-Meteo, 7Timer, reverse geo — the last at 86400s revalidate, often a cache hit).
- With Next.js `fetch` caching active, the 900s `revalidate` on Open-Meteo means repeated fetches for nearby locations (e.g., two saved locations within the same grid cell) may share cached responses.
- Empirically: 3 fetches at ~500ms each = ~1.5s per location in the worst case (all cold). At 300s budget, the cron can process ~200 locations before hitting the wall, or ~66 locations if averaging 4s each (accounting for serial processing and Supabase writes).

**Recommendation:** Process locations serially with a concurrency of 1 to avoid hammering upstream services. If the user base grows to where 66-location throughput is insufficient, switch to Pro's 800s limit (~200+ locations) or shard the cron into per-user fan-outs.

**Cron entry (vercel.json):**
```json
{
  "path": "/api/cron/condition-alerts",
  "schedule": "0 14 * * *"
}
```

The existing `CRON_SECRET` bearer-token pattern from `app/api/cron/keep-alive/route.ts` should be reused verbatim, including the constant-time comparison.

### 4.2 Delivery channel

**Recommendation: in-app alert center (v1). Defer email and Web Push.**

Comparison:

| Channel | Ops burden | Third-party cost | User reach | v1 fit |
|---|---|---|---|---|
| In-app alert center | Zero new infrastructure — Supabase table + UI component | None | Only open-session users; misses users who don't log in that day | Best for v1: zero risk, zero vendor, validates demand |
| Email (e.g., Resend, SendGrid) | Deliverability/SPF/DKIM setup; unsubscribe compliance (CAN-SPAM/GDPR) | $0-20/mo at low volume | High reach regardless of session | Good v2 once demand is proven |
| Web Push | Service-worker registration; permission UX; VAPID key mgmt | None | Medium — requires prior permission grant | Good v2; more implementation work than email |

The `user_preferences` table already has a `notifications_enabled` boolean (types.ts line 105), though it is currently unwired. That field can serve as the opt-in gate for the in-app channel in v1 and extend to push/email in v2 without a schema change.

**Future note:** The newsletter pipeline (`scripts/newsletter/`) represents the team's existing "email content" machinery. A future email-alert digest could reuse the same `alert_subscriptions` table with a different `channel` enum value — the only migration required is widening the channel CHECK constraint (see §5.1) to allow the new value.

### 4.3 Evaluation logic placement

**Recommendation: import scoring functions directly; do NOT call the HTTP route per location.**

The stargazer HTTP route (`app/api/stargazer/route.ts`) performs significant inline aggregation beyond raw scoring: ISS pass calculation, deep-sky catalog sampling (a nested loop over the catalog per object per 30-minute interval across the dark window, lines 172-206), meteor shower moon-interference calculation, reverse geocoding, and Bortle estimation. This logic is not factored out into reusable server-side modules — it lives in the route handler itself.

Calling `GET /api/stargazer?lat=X&lon=Y` from the cron route for each saved location would:
1. Pull in all that non-scoring computation unnecessarily.
2. Make the cron route dependent on the HTTP layer, adding latency and a potential recursive loop concern.
3. Bypass the opportunity to import the pure scoring functions directly.

The pure functions in `lib/stargazer/score.ts` — `scoreHour`, `findBestWindow` — are exported and unit-tested (`__tests__/stargazer/score.test.ts`). The cron route can:
1. Fetch Open-Meteo hourly data for each saved location (the same URL as in the route, line 125).
2. Optionally fetch 7Timer for seeing/transparency (line 131; can be skipped with mid-range defaults if latency is a concern).
3. Call `scoreHour` and `findBestWindow` directly.
4. Compare the best-window score against the subscription threshold.
5. Write a `user_alerts` row if the threshold is met and the dedup window allows it.

This is a factored, minimal evaluation path. No prototype code is needed to confirm this — the pure functions are already importable.

**Obstacle on the news side:** The `severe` and `hurricanes` RSS items carry `location` as a free-text string only (e.g., `"10 km NE of Palu, Indonesia"`, extracted from USGS Atom titles at `rssAggregator.ts` lines 434-439). `RSSItem.location` (type definition at line 29) is `string | undefined`. There are no lat/lon coordinates, no bounding polygons, and no structured GeoJSON in the item shape. Geographic matching of news items to saved locations (e.g., "is this severe alert within 200km of your saved location?") would require:
- Geocoding the free-text location string (adds latency and a geocoding service), or
- Parsing NWS CAP/Atom FIPS zone codes (available in the raw XML but not currently extracted by the parser).

**Conclusion: news alerts are out of scope for v1.** This is the expected outcome; no STOP condition triggered.

### 4.4 Alert-fatigue control

- **Score threshold:** Default 70 ("Good" label per `getScoreLabel` in `lib/stargazer/score.ts`). User-configurable to 50 ("Fair") or 85 ("Excellent") in subscription settings.
- **Dedup window:** No more than one `stargazing_window` alert per `(user_id, saved_location_id)` pair within a 7-day rolling window. The cron route checks `user_alerts` for a recent alert before writing a new one. A bare pre-insert SELECT is not race-safe against overlapping cron runs; the implementing plan must use an atomic guard — a unique partial index on (user_id, saved_location_id) scoped to the active window, or pg_advisory_xact_lock — not just read-before-write.
- **Evaluation window:** Cron runs once daily at 14:00 UTC. The "upcoming night" is defined as the next dark window calculated from `lib/stargazer/astronomy.ts`'s `calculateDarkWindow`.

---

## 5. Schema

The following schema is the spike's recommended starting point. It is not yet implemented — this is a spike-only design artifact. The build plan should capture full CREATE TABLE baselines, grant statements, and RLS policies in `supabase/migrations/`.

### 5.1 `alert_subscriptions`

```sql
CREATE TABLE public.alert_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_location_id uuid NOT NULL REFERENCES public.saved_locations(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('stargazing_window')),
  threshold       integer NOT NULL DEFAULT 70 CHECK (threshold BETWEEN 0 AND 100),
  channel         text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app')),
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- One subscription per (user, location, kind, channel) — prevents duplicate rows
CREATE UNIQUE INDEX alert_subscriptions_unique
  ON public.alert_subscriptions (user_id, saved_location_id, kind, channel);
```

**RLS** (mirroring `saved_locations` policy pattern from `supabase/migrations/20260529_baseline_user_tables_rls.sql` lines 41-55):

```sql
ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.alert_subscriptions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.alert_subscriptions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.alert_subscriptions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.alert_subscriptions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

The cron route uses a service-role client (bypasses RLS), consistent with the pattern in `app/api/cron/keep-alive/route.ts` lines 34-36.

### 5.2 `user_alerts`

```sql
CREATE TABLE public.user_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id   uuid NOT NULL REFERENCES public.alert_subscriptions(id) ON DELETE CASCADE,
  kind              text NOT NULL,
  payload           jsonb NOT NULL DEFAULT '{}',
  -- For 'stargazing_window': { score, windowStart, windowEnd, locationName, locationId }
  created_at        timestamptz NOT NULL DEFAULT now(),
  read_at           timestamptz
);

CREATE INDEX user_alerts_user_id_created_at
  ON public.user_alerts (user_id, created_at DESC);

CREATE INDEX user_alerts_unread
  ON public.user_alerts (user_id) WHERE read_at IS NULL;
```

**RLS** (owner-scoped, same pattern):

```sql
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.user_alerts
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own alerts" ON public.user_alerts
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);
-- No INSERT policy for users: only the cron service-role client writes alerts.
-- No DELETE policy for users: alerts are soft-deleted via read_at.
```

**Why no user INSERT policy on `user_alerts`:** The cron route writes alerts using the service-role client. Users should not be able to inject alerts for themselves; omitting the INSERT policy enforces this at the database level.

### 5.3 Dedup query (cron route logic)

Before writing a new alert, the cron route queries:

```sql
SELECT id FROM public.user_alerts
WHERE subscription_id = $1
  AND created_at > now() - interval '7 days'
LIMIT 1;
```

If a row is returned, skip the insert. This is the 7-day dedup window.

---

## 6. Open Questions

**OQ-1. Cron plan tier.**
The project is on Hobby or Pro — this was not determinable from the repo alone. If on Hobby, the daily schedule (`0 14 * * *`) is the only legal option (minimum interval is daily). If on Pro, more granular schedules (e.g., `0 6,14,22 * * *` — three times daily) are possible. **Recommended default: assume Hobby; use daily schedule. Upgrade cron frequency after plan is confirmed.**

**OQ-2. Open-Meteo rate limits.**
Open-Meteo's free tier has no documented per-request API key requirement, but does impose unofficial rate limits (approximately 10,000 requests/day per IP). A daily cron evaluating N saved locations makes N Open-Meteo requests. At the current user scale this is not a concern, but the build plan should add a Sentry breadcrumb if Open-Meteo returns a 429. **Recommended default: proceed; add observability.**

**OQ-3. 7Timer availability during cron.**
7Timer is an external service with no SLA. The route already handles its absence gracefully (`sevenTimerData ? getSevenTimerAtTime(...) : null` with mid-range defaults). The cron evaluation should use the same fallback: if 7Timer returns an error, default seeing and transparency to 4 (mid-range) and proceed. **Recommended default: skip 7Timer in the cron path entirely; use defaults for seeing/transparency. This loses ~10-15% scoring accuracy but eliminates a fragile dependency from the critical path.**

**OQ-4. Notification bell placement.**
The navigation component (`components/navigation.tsx`) was substantially refactored in commit `518e24a` (advisor/009). The exact hook point for a bell/badge is not specified. **Recommended default: add to the right side of the nav bar, adjacent to the user avatar/menu, as a small icon with a red numeric badge when unread alerts > 0.**

**OQ-5. Alert drawer vs page.**
No decision was made on whether the alert center should be a slide-in drawer (lower implementation cost, matches the nav pattern) or a dedicated `/alerts` page (better for users with many alerts). **Recommended default: drawer in v1; add a "See all" link to `/alerts` in v2 if usage warrants it.**

---

## 7. Effort Estimate

Coarse estimates by component. Each should be a separate executor plan.

| Component | Description | Coarse estimate |
|---|---|---|
| Schema + RLS | `alert_subscriptions` + `user_alerts` tables, indexes, RLS policies, migration file | S (2-4h) |
| Cron evaluation route | `/api/cron/condition-alerts` — fetches Open-Meteo per location, scores with pure functions, dedup check, writes `user_alerts` | M (4-8h) |
| Alert center UI | Bell/badge in nav, drawer component with alert list, mark-read mutation | M (4-8h) |
| Settings UI | Per-saved-location subscription toggle + threshold picker in user settings | M (4-8h) |

Total coarse range: L (14-28h of implementation). This does not include QA, E2E test authoring, or Lighthouse validation.

Estimates are coarse. The cron route in particular could be S if 7Timer is skipped (3 fetches → 1) and medium-confidence scoring is acceptable, or M if full-fidelity scoring is required.

---

## 8. Kill Criteria

Abandon this feature if any of the following are true:

1. **Cron throughput exceeds Open-Meteo's courtesy rate limit.** If the user base grows to where the daily cron makes >10,000 Open-Meteo requests (i.e., >10,000 active subscriptions), the feature breaks upstream users unless the project moves to a paid Open-Meteo plan or implements request batching. Instrument the cron route with a total-requests counter and add a Sentry warning threshold at 5,000/day.

2. **Hobby plan + maxDuration = 300s limits throughput to <50 locations.** If in-production timing shows the cron takes >6s per location (not expected given pure function scoring), the 300s budget covers fewer than 50 locations. At that point, the feature is not viable without a plan upgrade or architectural change (e.g., queue-based fan-out).

3. **Zero opt-in after 60 days in production.** If fewer than 5% of users with saved locations enable at least one subscription after 60 days, the demand signal is too weak to justify the v2 email/push investment. Remove the feature; keep the schema (cost is negligible) as a marker for a future attempt.

---

## 9. Rollout

1. **Schema + RLS only** — migration, no UI, no cron. Verify with Supabase dashboard; no user impact.
2. **Settings UI** — subscription toggle and threshold, writing to `alert_subscriptions`. No alerts fire yet (cron not added to `vercel.json`).
3. **Cron evaluation route** — write to `user_alerts`, guard with `CRON_SECRET`. Test manually by hitting `/api/cron/condition-alerts` locally with a saved location.
4. **Alert center UI** — bell/badge + drawer. Wire to `user_alerts` SELECT.
5. **Enable cron in `vercel.json`** — add the cron entry. Monitor Sentry and runtime logs for the first 3 runs.

Rollback: disable the cron entry in `vercel.json` and redeploy. Schema and data are preserved.

---

## 10. Maintenance Notes

- If the maintainer green-lights this PRD, implement as 4 separate executor plans matching the components in §7. Do not merge all components into one mega-plan.
- The newsletter pipeline (`scripts/newsletter/`) and this feature will eventually share a "how we talk to users" surface. When email delivery is added to this feature, reuse the same `alert_subscriptions` table with `channel = 'email'` — avoid creating a parallel subscriptions table.
- The `user_preferences.notifications_enabled` column (types.ts line 105) should be the master opt-out switch: if false, the cron should skip that user's subscriptions entirely, regardless of individual subscription `enabled` flags.
- When the news pipeline gains structured geography (FIPS zones or lat/lon bounding boxes on `RSSItem`), `kind = 'severe_alert'` can be added to the `alert_subscriptions.kind` CHECK constraint without a schema redesign.

---

*End of PRD. Spike completed 2026-06-11.*
