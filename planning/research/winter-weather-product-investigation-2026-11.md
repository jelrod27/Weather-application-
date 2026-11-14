# Winter weather: usage and product investigation

Date: November 14, 2026. Status: research and scope recommendation; implementation is not approved by this note.

The user selected contiguous U.S. coverage first, with explicit coverage boundaries. The requested priority is accurate winter maps and useful coverage rather than expanding notifications.

## Usage evidence

Read-only production Web Analytics queries targeted Vercel project `weather-application`, production environment, metric `vercel.analytics_pageview.count`, sum aggregation grouped by `request_path`. Windows below use UTC start-inclusive/end-exclusive boundaries. These are pageviews, not unique users, successful subscriptions, or evidence of engagement. Owner/testing traffic may be included.

| Page | October 1–31 | November 1–13 |
| --- | ---: | ---: |
| `/winter` | 9 | 1 |
| `/warnings` | 18 | 14 |
| `/alerts` | 3 | 3 |

Reproduce with the authenticated Vercel CLI:

```sh
vercel metrics vercel.analytics_pageview.count \
  --scope team_wF5ZjZ2v62knKOXwUJRf6zMN \
  --project prj_YMK4xTSRrnjS1o4LNtPeDJcRh1yL \
  --prod --since 2026-10-01 --until 2026-11-01 \
  --group-by request_path \
  --filter "request_path in ('/winter', '/warnings', '/alerts')" \
  --json --non-interactive
```

Independent Google Search Console data for October showed 1,719 Winter impressions and zero Google Web clicks. Search impressions are not site visits, so this does not contradict Vercel's nine pageviews. Query visibility is a possible opportunity, not demonstrated demand or retention.

Read-only aggregate queries against the connected `16bitweather.co` Supabase production project found:

- 5 account alert subscriptions, all enabled, across 2 distinct accounts.
- 1 guest subscriber, enabled and verified.
- 0 browser push subscriptions.
- 0 retained `user_alerts`, `guest_alert_deliveries`, or `bitwatch_deliveries` records.

No emails, coordinates, identifiers of individual subscribers, push endpoints, tokens, or payloads were retrieved. These counts cannot distinguish owner/test subscriptions from other people, prove lifetime non-use, or diagnose delivery failures. No matching hazard, disabled configuration, retention/deletion, and a broken pipeline are distinct possible explanations for absent retained deliveries; the query does not decide between them.

There are no custom analytics events for subscribing or using winter layers in the inspected app. Page traffic alone cannot establish feature use.

## What exists today

- `app/winter/page.tsx` is a national NWS alert list filtered by event-name keywords. It has no map, place selection, snow accumulation, snow-depth layer, or forecast timeline.
- It fetches the shared `/api/weather/alerts` route every five minutes, but ignores response freshness and coverage metadata.
- A failed initial request leaves the initial empty list and removes the loading state. The UI then says `NO WINTER ALERTS` and claims there are no active winter advisories across the United States.
- A failed refresh retains the old list without an indication that it could be stale.
- The shared alert API has distinct failure status codes and freshness/coverage handling. The demonstrated defect is the Winter consumer's presentation; it does not prove that all alerts are broken.
- Notification delivery deliberately supports Tornado, Severe Thunderstorm, and Flash Flood warnings. `lib/services/severe-alert-filter.ts` and `lib/bitwatch/delivery-policy.ts` do not opt winter events into delivery. The current system is not a winter subscription product.
- Existing radar uses OpenLayers and RainViewer. Its snow color option is not evidence of measured snow depth, snowfall totals, or reliable observed precipitation type.

## Reproduction and checks

A local production server using the existing `.next` build was started on port 3107. A Playwright Chromium browser intercepted `/api/weather/alerts` and returned synthetic HTTP 503 JSON before visiting `/winter`.

Result: `NO WINTER ALERTS` was visible, and no unavailable/retry/error message appeared. This reproduces the misleading empty state without making requests fail in production. The server was stopped afterward.

Relevant existing unit checks: `__tests__/severe-alert-filter.test.ts` and `__tests__/bitwatch-delivery-policy.test.ts` passed (2 suites, 8 tests). No production implementation was changed; a full build, Lighthouse, and full E2E run are not needed to validate these research notes. A future fix needs regression coverage for failure versus a successful empty response, and for stale refresh data.

## Recommended next scope

Preferred approach: a forecast-first Winter map for the contiguous U.S., reusing OpenLayers and the existing site conventions. A small truthful outage/freshness repair belongs alongside the work; notification expansion does not.

1. Official snowfall probability layer with explicit amount threshold and Day 1/2/3 valid window. A probability of at least four inches in a stated period must not be labeled as a predicted four-inch total.
2. Separate official Winter Storm Severity Index layer for expected impacts, with its own categorical legend. An impact category is not snowfall in inches or an observed condition.
3. Place search, mobile and keyboard controls, visible coverage limits, source attribution, issue/valid timestamps, and clear unavailable/stale/no-data states. Transparent map tiles must not silently imply no hazard or no snow.
4. Keep official winter warnings accessible as supporting context. Avoid promising winter subscriptions, road passability, exact snow totals at a pin, or additional geographic coverage.
5. Defer analyzed snow depth until actual rendered data, timestamps, no-data behavior, and coverage have passed source validation. HTTP 200 and valid metadata are insufficient.

Alternative: start with current radar and analyzed snow cover/depth. This answers a different question (what is happening or on the ground), but the snow-analysis rendering issue makes it a weaker first release until resolved. A combined forecast/radar/depth dashboard adds source and interface complexity before adoption has been established.

The source feasibility report is [winter-map-source-feasibility-2026-11.md](./winter-map-source-feasibility-2026-11.md). A scoped design and acceptance criteria should follow selection of the approach. Neither this note nor source research authorizes production changes.
