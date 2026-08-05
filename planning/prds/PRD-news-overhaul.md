# PRD: News Section Overhaul — Earth & Space Hazard Feed

**Version:** 1.1 (amendment)
**Date:** 2026-05-29 (v1.0); amended 2026-08-04
**Author:** Justin Elrod / Claude Analysis
**Project:** 16-Bit Weather (16bitweather.co)
**Priority:** High (v1.0); follow-through after Phases 1–3 shipped
**Lighthouse Gate:** Performance score must remain >= 85 on mobile and desktop after all changes (per `lighthouserc.js`, enforced by the Lighthouse CI workflow).

---

## Amendment (2026-08-04) — product identity + image honesty

### Status of v1.0 phases

Phases **1–3 are shipped** in production code. Do **not** re-implement them from the body below without verifying against `main`:

| Phase | Intent | Status |
|---|---|---|
| 1 | Feed remediation + Sentry feed health + `scripts/check-news-feeds.ts` | Done |
| 2 | Delete orphaned NewsAPI / NewsTicker / `NEWS_API_KEY` | Done in app (docs/fixtures may still mention orphans) |
| 3 | `fast-xml-parser`, fuzzy dedup, tiered cache, Happening Now, freshness | Done |

Treat §§7–13 of this document as **historical implementation notes**, not an open backlog.

### Product decision (Hard C)

`/news` is a **hybrid**:

1. **Hazard console as the spine** — USGS / NWS / NHC / SPC primary-source hazards, optimized for “is this real and current.”
2. **Earth & Space magazine as the reading layer** — NASA, Carbon Brief, Yale, ScienceDaily, etc., so quiet days still have a reason to visit.

Nobody needs another generic science-magazine aggregator. The differentiator is fast primary-source hazards with honest presentation.

### Image honesty (governs the whole page)

| Item type | Imagery rule |
|---|---|
| Earthquakes | ShakeMap / event product, or **imageless data-forward card** (magnitude, location, depth). Never place-specific historical stock (e.g. 1906 San Francisco). |
| Volcanoes | Photo only when it is **of that named peak**. No hash pool of unrelated eruptions. |
| Severe / tropical | Live GOES / SPC / NHC products (provenance-bound). |
| Science / climate / space (editorial) | Illustrative stock / OG allowed; **must show visible credit** when stock is used. |

**Never** an unlabeled historical catastrophe photo on a live hazard card.

Implementation track: PR `fix/news-hazard-image-honesty` (quake/volcano honesty + data cards). Editorial credit UI ships after that lands.

### Feed-health detection (closes G3 for real)

v1.0 left `scripts/check-news-feeds.ts` as a **manual** gate (§14). That repeated the original failure mode: NWS can go dark and nobody notices until a human runs the script.

**Required follow-through:** a scheduled GitHub Actions workflow runs `npx tsx scripts/check-news-feeds.ts` weekly (and on `workflow_dispatch`). Failure is allowed to fail the job so maintainers get notified; flaky upstream should be investigated, not silenced forever.

### Open follow-ups (post-amendment)

1. Ship hazard image honesty (no SF-1906 / wrong-peak stand-ins).
2. Weekly feed-health workflow (this amendment).
3. Visible stock image credits on editorial cards.
4. Soften `stats.errors` / `NewsFeedBanner` so swallowed per-feed `[]` failures still surface.
5. Archive or trim stale body sections of this PRD once honesty + credits land; keep this amendment as the living north star.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Motivation and Rationale](#2-motivation-and-rationale)
3. [Current State Assessment](#3-current-state-assessment)
4. [Competitive Benchmark](#4-competitive-benchmark)
5. [Goals and Non-Goals](#5-goals-and-non-goals)
6. [Data Source Architecture](#6-data-source-architecture)
7. [Feed Source Remediation Table](#7-feed-source-remediation-table)
8. [Parsing and Aggregation Changes](#8-parsing-and-aggregation-changes)
9. [Caching Strategy](#9-caching-strategy)
10. [Dead Code Removal](#10-dead-code-removal)
11. [Page Structure and Organization](#11-page-structure-and-organization)
12. [Observability and Feed-Health Monitoring](#12-observability-and-feed-health-monitoring)
13. [Implementation Plan (Phased)](#13-implementation-plan-phased)
14. [Testing Strategy](#14-testing-strategy)
15. [Quality Gates](#15-quality-gates)
16. [Risks and Mitigations](#16-risks-and-mitigations)
17. [Claude CLI Execution Prompt](#17-claude-cli-execution-prompt)

---

## 1. Executive Summary

The `/news` page is a multi-source Earth & Space hazard aggregator. It pulls RSS/Atom feeds from USGS (earthquakes, volcanoes), NASA, NOAA (climate, severe, hurricanes), and science publishers, then renders them as a filterable, searchable grid with a featured "Top Story."

A full review found three classes of problems:

1. **Broken data sources.** 3 of 17 feeds return 404/connection-failure in production, including the **NWS National Alerts** feed (the entire high-priority `severe` category), which silently went dark when NWS decommissioned `alerts.weather.gov/cap/us.php`. Failures are swallowed, so nobody noticed.
2. **A large orphaned subsystem.** A second, parallel news pipeline (NewsAPI proxy + `newsAggregator` + `NewsTicker` + 4 unused API routes + 4 unused services) is wired to nothing in the UI — roughly 1,500 lines of dead code that `knip` cannot detect because the dead modules are reachable from Next.js route entry points. It also forces a `NEWS_API_KEY` env var that does nothing.
3. **Below-benchmark aggregation quality.** Hand-rolled regex XML parsing, exact-title-only dedup, a single flat 6-hour cache applied uniformly to both 5-minute-critical severe alerts and slow-moving science articles, and no feed-health observability.

This PRD scopes the work to fix all three, in three phases that ship independently:

- **Phase 1 (P0):** Repair/replace dead feeds, add feed-health logging to Sentry. *Restores the `severe` category in production.*
- **Phase 2 (P1):** Delete the orphaned NewsAPI/aggregator subsystem; drop the `NEWS_API_KEY` requirement.
- **Phase 3 (P2):** Replace regex parsing with `fast-xml-parser`, tier the cache by category, group the feed by recency/category, and add cross-source dedup.

All data sources remain free and keyless.

---

## 2. Motivation and Rationale

### Why now

- **Production is degraded silently.** The most important category (`severe` weather alerts) has been empty since the NWS endpoint was decommissioned. Users on a weather platform expect severe-weather coverage.
- **Dead code is a maintenance and security tax.** The orphaned subsystem keeps `NEWS_API_KEY` in the required-env surface, duplicates types (`NewsItem` vs `RSSItem`) and logic (`getFeaturedStory` exists twice), and misleads future contributors into editing code that never runs.
- **The page has a genuine differentiator worth investing in.** Unlike generic weather-news widgets, this is an *Earth & Space hazard* feed (USGS/NASA/NOAA/NHC/SPC). That niche framing is the interesting angle; the implementation just needs to be reliable and well-organized.

### Why this is low-risk

The live path is small and self-contained (`app/news/page.tsx` → `/api/news/rss` → `rssAggregator` → `feedSources`). Each phase is independently shippable and reversible. No database schema changes. No auth changes.

---

## 3. Current State Assessment

### Live data flow (the only path users hit)

```
app/news/page.tsx
  → GET /api/news/rss              app/api/news/rss/route.ts
    → aggregateFeeds()             lib/services/rss/rssAggregator.ts  (fetch + regex parse, 6h cache)
      → FEED_SOURCES               lib/services/rss/feedSources.ts    (17 feeds, 7 categories)
      → decodeHtmlEntities()       lib/services/rss/html-utils.ts
      → safeExternalUrl()          lib/safe-url.ts
  → components/news/{NewsHero, NewsFilter, NewsGrid, NewsCard, CategoryBadge,
                     PriorityIndicator, NewsSkeleton, NewsEmpty}
```

**Categories:** `earthquakes`, `volcanoes`, `space`, `climate`, `severe`, `science`, `hurricanes` (defined in `feedSources.ts` `FeedCategory` + `CATEGORY_CONFIG`).

**Strengths to preserve:**
- Security: `safeExternalUrl` scheme-guards every link/image (blocks `javascript:` etc.); `/api/news/rss` leaks no upstream internals on error; CORS on the legacy proxy routes is locked to the app origin.
- UX scaffolding: hero + 8-tab filter + debounced search + skeleton loaders + typed empty states.
- Earthquake enrichment: magnitude/depth/location parsed from USGS Atom titles; priority escalates with magnitude.

### Orphaned subsystem (no UI caller — verified)

```
components/NewsTicker/NewsTicker.tsx        ← never rendered (no JSX usage anywhere)
  → hooks/useNewsFeed.ts
    → lib/services/newsService.ts            → GET /api/news        (NewsAPI proxy)
app/api/news/aggregate/route.ts              ← no client fetch
  → lib/services/newsAggregator.ts
      → newsService, nasaService, redditService, gfsModelService
app/api/news/fox/route.ts                    ← no client fetch
app/api/news/nasa/route.ts                   ← no client fetch
app/api/news/reddit/route.ts                 ← no client fetch
```

`knip` does not flag these because Next.js route handlers are entry points; the dead services are transitively "reachable" from the unused routes.

---

## 4. Competitive Benchmark

| Capability | Industry standard (Google/Apple News, Techmeme, Feedly) | `/news` today | Target after this PRD |
|---|---|---|---|
| XML parsing | Hardened parser | Hand-rolled regex, 20-item cap/feed | `fast-xml-parser`, no arbitrary cap |
| Dedup | Semantic cross-source clustering | Exact 50-char title prefix | Token-overlap fuzzy dedup across sources |
| Ranking | Engagement + recency + source weight | Static priority → timestamp | Same, plus magnitude/severity escalation (kept) |
| Freshness | Near-real-time | Uniform 6h cache | Tiered: ~5 min severe/hurricanes, 6h science/climate |
| Organization | Topic clusters + Top Stories | Flat grid + 1 featured | "Happening Now" rail + category-grouped grid |
| Resilience | Per-source SLAs | Silent empty on failure | Errors surfaced to Sentry + UI freshness indicator |
| Security | Standard | **Strong** (scheme guard, CORS lock) | Preserve |

**Verdict:** the product framing is differentiated; the engineering is behind on reliability, freshness tiering, and observability. This PRD closes those gaps without chasing personalization/ML (explicit non-goal).

---

## 5. Goals and Non-Goals

### Goals

- G1. Every feed in `FEED_SOURCES` returns a 2xx (after following redirects) and parses to >= 1 item when the source has recent content.
- G2. The `severe` category is populated in production again.
- G3. A dead feed is **visible** (Sentry breadcrumb/message) within one refresh cycle, not silent.
- G4. The orphaned NewsAPI/aggregator subsystem is removed; `NEWS_API_KEY` is no longer a required env var.
- G5. Severe/hurricane content is no more than ~5 minutes stale via CDN; science/climate stays at 6h.
- G6. The grid is organized so the user can distinguish "happening now" hazards from background reading.
- G7. No Lighthouse performance regression below 85; existing E2E smoke test for `/news` keeps passing.

### Non-Goals

- Personalization, ML ranking, or user-specific feeds.
- Read state / save-for-later (noted as future P3; not in this PRD).
- Reintroducing NewsAPI or any keyed/paid news source.
- Full-text article extraction or hosting article content (we link out only).

---

## 6. Data Source Architecture

All sources are free, keyless RSS/Atom feeds fetched **server-side** in `rssAggregator.ts`. No source requires an API key. The aggregator:

1. Filters `FEED_SOURCES` by `enabled` (and optional category).
2. Fetches all in parallel via `Promise.allSettled` with a 10s per-feed timeout.
3. Parses by `format` (`rss` | `atom`).
4. Filters by `maxAge`, deduplicates, sorts by priority then recency, slices to `maxItems`.
5. Caches the result (see [§9](#9-caching-strategy)).

This architecture is sound and is **retained**. Changes are to (a) the feed URLs, (b) the parser implementation, (c) the cache TTL strategy, and (d) error observability.

---

## 7. Feed Source Remediation Table

Health-checked 2026-05-29. Replacements verified to return HTTP 200.

| id | Current URL | Status | Action | New URL |
|---|---|---|---|---|
| `nws-alerts` | `https://alerts.weather.gov/cap/us.php?x=0` | 🔴 000 (decommissioned) | **Replace** | `https://api.weather.gov/alerts/active.atom` |
| `spaceweather` | `https://spaceweather.com/rss/news.xml` | 🔴 404 | **Replace** | `https://spaceweatherarchive.com/feed/` |
| `noaa-climate` | `https://www.climate.gov/feeds/all/feed.xml` | 🔴 404 | **Replace** | `https://www.climate.gov/rss.xml` |
| `usgs-volcanoes` | `https://volcanoes.usgs.gov/vhp/updates.xml` | 🟡 302 | **Update to final URL** | resolve 302 target; if unstable, keep (fetch follows redirects) |
| `nasa-earth` | `https://earthobservatory.nasa.gov/feeds/earth-observatory.rss` | 🟡 301 | **Update to final URL** | resolve 301 target |
| `carbonbrief` | `https://www.carbonbrief.org/feed` | 🟡 301 | **Update to final URL** | resolve 301 target |
| all 11 others | — | ✅ 200 | none | — |

**Implementation notes:**
- `api.weather.gov/alerts/active.atom` is Atom (`format: 'atom'`) and is high-volume. Constrain it: prefer `?severity=Severe,Extreme&urgency=Immediate,Expected` to keep the `severe` category meaningful and avoid flooding the grid with minor advisories. Verify the query params return 200 before committing.
- For the 301/302 feeds, fetch already follows redirects, so they are not *broken* — but update the URL to the final destination to save a round trip and guard against the redirect later breaking. During implementation, resolve each with `curl -Ls -o /dev/null -w '%{url_effective}'` and paste the final URL into `feedSources.ts`.
- After editing, re-run the health-check script ([§14](#14-testing-strategy)) and confirm all enabled feeds are 2xx.

---

## 8. Parsing and Aggregation Changes

### 8.1 Replace regex parsing with `fast-xml-parser` (Phase 3)

`parseRSSFeed` / `parseAtomFeed` in `rssAggregator.ts` currently regex-scrape XML and cap at 20 items/feed. Replace with `fast-xml-parser` (small, dependency-free, server-only):

- Parse once into an object tree; map RSS `<item>` and Atom `<entry>` to `RSSItem`.
- Preserve all existing field extraction: title, link/guid, description/`content:encoded`, pubDate/`dc:date`/`updated`/`published`, author/`dc:creator`, image from `enclosure`/`media:content`/inline `<img>`.
- Preserve earthquake enrichment (magnitude/depth/location from USGS titles) and `determinePriority`.
- Preserve `safeExternalUrl` guard on link and image, and `decodeHtmlEntities` on text.
- Keep a sane per-feed item cap (e.g. 30) to bound memory.

Acceptance: parser unit tests (see [§14](#14-testing-strategy)) pass on captured fixtures for each `format` and for USGS earthquake enrichment.

### 8.2 Cross-source dedup (Phase 3)

Current dedup keys on a 50-char normalized title prefix (exact match). Upgrade to token-overlap fuzzy matching (the orphaned `newsAggregator.ts` `isSimilarTitle` at 0.7 overlap is a working reference — port it before deleting that file). Keep the existing "prefer higher priority, then newer" tiebreak.

---

## 9. Caching Strategy

Replace the single `CACHE_TTL = 6h` in `rssAggregator.ts` and the uniform `s-maxage=21600` in the route with a **per-category tier**:

| Tier | Categories | In-memory TTL | CDN `s-maxage` | `stale-while-revalidate` |
|---|---|---|---|---|
| Fast | `severe`, `hurricanes` | 5 min | 300 | 900 |
| Medium | `earthquakes`, `volcanoes`, `space` | 30 min | 1800 | 3600 |
| Slow | `climate`, `science` | 6 h | 21600 | 43200 |

Implementation: the aggregator already fetches per-feed with `next: { revalidate: source.refreshInterval * 60 }`. The simplest correct approach:
- Drive the route `Cache-Control` from the **minimum** tier present in the requested categories (so the default "all" request uses the Fast 300s `s-maxage`, ensuring severe alerts stay fresh; slower feeds still get their own per-feed `revalidate`).
- Tighten the in-memory `CACHE_TTL` to 5 min (matching Fast) since the in-memory map does not reliably persist across serverless invocations anyway; the per-feed `next.revalidate` is the real cache.

Note in code why: the in-memory cache is a best-effort warm-instance optimization, not the source of truth.

---

## 10. Dead Code Removal

Phase 2 deletes the orphaned subsystem. **Before deleting, verify each file has no live importer outside the dead graph** (grep + knip after each removal). Port `isSimilarTitle` to the RSS aggregator first if Phase 3 will use it.

Removal candidates (verify, then delete):

- `components/NewsTicker/NewsTicker.tsx`, `components/NewsTicker/NewsTickerItem.tsx` (and the dir)
- `hooks/useNewsFeed.ts`
- `lib/services/newsService.ts`
- `lib/services/newsAggregator.ts`
- `app/api/news/route.ts` (NewsAPI proxy)
- `app/api/news/aggregate/route.ts`
- `app/api/news/fox/route.ts`, `app/api/news/nasa/route.ts`, `app/api/news/reddit/route.ts`
- `lib/services/foxWeatherService.ts`, `lib/services/redditService.ts`, `lib/services/nasaService.ts` — **only if** no other importer (grep first; these may be referenced elsewhere)
- `lib/types/news.ts` — only if unused after the above
- `gfsModelService.ts` — **likely keep** (the GFS model pages may use it); confirm before touching.

Env cleanup:
- Remove `NEWS_API_KEY` from `lib/env-validation.ts` (if present) and from CLAUDE.md's required-env list.
- Update `app/about/page.tsx` news description if it references removed sources.

Acceptance: `npm run build` + `npm run knip` clean; `/news` still renders; grep for each deleted symbol returns nothing.

---

## 11. Page Structure and Organization

Keep the current page shell (`PageWrapper`, header, `NewsFilter`, stats footer). Improve organization (Phase 3) when viewing **All** with no search/category filter:

1. **"HAPPENING NOW" rail** — items from the last 6h with `priority === 'high'` (severe alerts, M6+ quakes, volcano alerts, NHC active systems), shown above the main grid. If empty, omit the rail entirely (no empty header).
2. **Featured "TOP STORY"** — keep `getFeaturedItem`, but source it from the Happening-Now pool when available so the hero reflects current hazards.
3. **Main grid** — remaining items. Optionally group by category with section headers (`CATEGORY_CONFIG` labels/icons) instead of one flat list. A/B simple: ship the rail first; category grouping is optional within Phase 3.

When a category tab or search is active, behavior is unchanged (flat results grid). Preserve all existing accessibility (role=link cards, keyboard handlers, aria-labels) and theme classes.

Add a **freshness indicator** near the header: "Updated Xm ago" derived from `lastUpdated` in the `/api/news/rss` response (already returned, currently unused by the page).

---

## 12. Observability and Feed-Health Monitoring

The aggregator already collects `stats.errors: string[]`. Today they vanish. Wire them up:

- In `rssAggregator.ts` `aggregateFeeds`, when a feed yields 0 items or rejects, capture a Sentry breadcrumb; if a **high-priority** feed (`nws-alerts`, `nhc-*`, `usgs-significant`, `usgs-volcanoes`) fails, `Sentry.captureMessage('[news] high-priority feed down', { level: 'warning', extra: { source, reason } })`.
- Keep server-side `console.error` with the `[news]` context prefix (per CLAUDE.md logging convention).
- Do **not** leak feed URLs or parser internals to the client response (preserve current behavior).

This directly prevents a repeat of the silent NWS outage (G3).

---

## 13. Implementation Plan (Phased)

Each phase is an independently shippable commit/PR on `feat/news-overhaul`.

### Phase 1 — Feed remediation + observability (P0)
1. Resolve 301/302 final URLs; update `feedSources.ts` for `nws-alerts`, `spaceweather`, `noaa-climate`, and the 3 redirecting feeds.
2. Constrain `api.weather.gov/alerts/active.atom` query (severity/urgency) and verify 200 + parses.
3. Add Sentry feed-health logging in `rssAggregator.ts` ([§12](#12-observability-and-feed-health-monitoring)).
4. Run health-check script; confirm all enabled feeds 2xx and produce items.

### Phase 2 — Dead code removal (P1)
5. Port `isSimilarTitle` reference into `rssAggregator.ts` (commented, unused until Phase 3) or note it for Phase 3.
6. Delete orphaned files per [§10](#10-dead-code-removal), grepping before each deletion.
7. Remove `NEWS_API_KEY` from env validation + docs.
8. `npm run build` + `npm run knip` + `/news` smoke.

### Phase 3 — Quality upgrades (P2)
9. Add `fast-xml-parser`; rewrite `parseRSSFeed`/`parseAtomFeed`; keep all field extraction + enrichment + safety.
10. Implement token-overlap dedup.
11. Implement tiered caching ([§9](#9-caching-strategy)).
12. Add "Happening Now" rail + freshness indicator to `app/news/page.tsx`.
13. Unit tests for parser + dedup; update E2E smoke if needed.

---

## 14. Testing Strategy

### Feed health-check script (manual gate for Phase 1)

```bash
# Run from repo root; expects all enabled feeds to print 2xx after redirects.
node -e "/* iterate FEED_SOURCES urls */" # or a tsx script under scripts/
```
A reusable `scripts/check-news-feeds.ts` (run via `tsx`) that imports `FEED_SOURCES`, fetches each enabled URL with the aggregator's User-Agent, follows redirects, and prints `status  id  url`. Non-2xx → non-zero exit. Add to the PRD acceptance, not to CI (external network).

### Unit tests (Jest, `__tests__/`)
- `rssAggregator` parser: feed captured fixtures (one RSS, one Atom, one USGS earthquake) → assert `RSSItem` fields, magnitude/depth/location enrichment, `safeExternalUrl` drops a `javascript:` link, `decodeHtmlEntities` applied.
- Dedup: two near-identical titles from different sources collapse to the higher-priority/newer one.
- Tiered cache: requesting `severe` yields a Fast `Cache-Control`; requesting `science` yields Slow.

### E2E (Playwright, `tests/e2e/`)
- The existing `/news` smoke (added in commit f46c10d) must keep passing: page loads, filter tabs render, grid or empty state shows. Extend lightly to assert the freshness indicator renders and the severe tab shows >= 0 cards without error.

### Manual verification
- Load `/news`, confirm severe/hurricane content appears, hero reflects a current hazard, "Updated Xm ago" shows, category tabs filter correctly, links open with `noopener,noreferrer`.

---

## 15. Quality Gates

- `npm run build` passes.
- `npm run lint` passes.
- `npm test` passes (new parser/dedup/cache tests green).
- `npm run knip` reports no new unused files/exports; orphaned subsystem gone.
- Playwright `/news` smoke passes (E2E workflow).
- Lighthouse performance >= 85 mobile and desktop (Lighthouse CI workflow).
- All enabled feeds 2xx via `scripts/check-news-feeds.ts`.
- No `NEWS_API_KEY` reference remains in code or required-env docs.

---

## 16. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `api.weather.gov` alerts feed floods the grid | Medium | Constrain by severity/urgency; cap per-feed items; keep `severe` priority high only for Severe/Extreme |
| Deleting a "dead" service that is actually imported elsewhere (e.g. `nasaService`, `gfsModelService`) | Medium | Grep + knip before each deletion; `gfsModelService` likely kept |
| `fast-xml-parser` changes output shape vs regex (missing fields) | Medium | Fixture-based unit tests for every field before/after; ship Phase 3 separately |
| Shorter severe-cache TTL increases upstream fetches | Low | `stale-while-revalidate` + per-feed `next.revalidate`; volumes are low |
| Redirect targets themselves change later | Low | Sentry feed-health logging (G3) surfaces it next cycle |

---

## 17. Claude CLI Execution Prompt

> Implement `planning/prds/PRD-news-overhaul.md` on branch `feat/news-overhaul`, one phase at a time, committing after each phase.
>
> **Phase 1 (P0):** In `lib/services/rss/feedSources.ts`, replace the 3 dead feed URLs with the verified replacements in §7 (`nws-alerts` → `api.weather.gov/alerts/active.atom` with a severity/urgency query, `spaceweather` → `spaceweatherarchive.com/feed/`, `noaa-climate` → `climate.gov/rss.xml`) and resolve the 3 redirecting URLs to their final destinations. Add Sentry feed-health logging to `lib/services/rss/rssAggregator.ts` per §12. Add `scripts/check-news-feeds.ts` and confirm all enabled feeds return 2xx. Commit.
>
> **Phase 2 (P1):** Delete the orphaned NewsAPI/aggregator subsystem per §10 — grep for live importers before each deletion, keep `gfsModelService` unless proven unused, remove `NEWS_API_KEY` from env validation and docs. Run `npm run build` and `npm run knip`. Commit.
>
> **Phase 3 (P2):** Add `fast-xml-parser`, rewrite the RSS/Atom parsers preserving every field + earthquake enrichment + `safeExternalUrl`/`decodeHtmlEntities` (§8.1), port token-overlap dedup (§8.2), implement tiered caching (§9), and add the "Happening Now" rail + freshness indicator to `app/news/page.tsx` (§11). Add unit tests for parser/dedup/cache. Commit.
>
> Preserve all existing security (scheme guards, CORS, no upstream leakage), accessibility, and theme conventions. Match surrounding code style. Do not introduce paid or keyed news sources. Keep Lighthouse >= 85.

---

*End of PRD.*
