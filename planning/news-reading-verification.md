# News reading experience — issue #675, phase 4

Implementation baseline: `079d4aa467e5b4b07e51faa5ef2046a8bc62eb86` (merged PR #679).
This completes the reading experience described in [issue #675](https://github.com/jelrod27/Weather-application-/issues/675).

## Browse contract

`GET /api/news/rss?view=sections` evaluates the entire provider-bounded collection before
search, section selection, or pagination. The legacy response remains available for
the home page and newsletter. Responses containing lifecycle claims use `no-store`;
underlying source snapshots retain their existing provider-specific refresh policies.

The overview displays at most four verified NWS warnings, three outlooks/recent
reports, three weather/science stories, and three delayed reports. Each nonempty
section identifies its purpose, displayed count, and total at that check. View all
returns pages of 24. `section`, `q` (up to 200 characters), and `offset` are validated;
category selection applies before search. Search covers headlines, descriptions,
locations, source names, issuing offices, area codes, and official update titles.
Only the selected window performs image enrichment requests. Unseen records keep
the same honest image fallback policy.

Pagination describes a live collection, not an immutable archive: counts and page
membership can change between requests. An out-of-range offset returns the last
valid page. Source coverage exposes upstream bounds/truncation; “all” means every
available record within those bounds and the selected age window (72 hours on the
page, with existing NWS/volcano inventory exemptions).

NWS warning order shares the Warning Center's tornado, flash flood, severe
thunderstorm, and other event tiers, then severity and urgency. News breaks remaining
ties by newest issue time and stable ID. The Warning Center retains its existing
expiry tie-break. Other sections use recency and stable ID; there is no cross-source
danger score. Forecasts, earthquakes, NHC reports, and volcano reports never inherit
verified active status from publication time or priority.

The first reading card is the hero and appears only once. Existing official Event
Group status, bulletin links, distinct affected areas, image meaning, credits, and
location facts are preserved. Warning Center navigation remains available.

## Refresh and reading state

- Check two minutes after the previous request completes while visible. Hidden tabs
  cancel pending timers and abort in-flight work. Return checks immediately if due;
  brief switches retain the existing cadence. Only one request per view is active.
- A query/category/page change cancels the old request; late responses cannot replace
  the new view. Requests time out after 45 seconds. Failed requests back off to four,
  eight, then fifteen minutes; explicit Refresh can retry sooner.
- Background results wait behind **Apply latest feed**. Filters, displayed order,
  disclosure state, and keyboard focus stay in place. Expiry, cancellation evidence,
  and degraded source health retire active claims immediately. A complete active-ID
  set prevents capped/search pages from being mistaken for cancellations.
- Relative ages tick every 30 seconds while visible. Exact warning expiry/end and
  source freshness/retention deadlines also trigger projection. Returning to a hidden
  page immediately ages existing evidence. Neither projection nor reassembly renews
  a source's successful-check timestamp.
- Expiring/delayed visible cards move to their truthful section without disappearing
  mid-read; this can temporarily exceed that section's overview preview size. Its
  count reflects retained context. Applying a new check restores the normal limits,
  except for client-retained outage context unavailable to a cold server.
- Network failures retain readable delayed content. A successful response from a
  cold server with unavailable sources also preserves the client's own retained
  reports, including on explicit Refresh/Apply. Retention deadlines still apply.
- Stable official event/area or item keys anchor the visible card in the viewport.
  If a card's DOM is replaced, restore the focused source link or card; if the report
  disappears entirely, provide a usable Refresh focus target. Normal browser scroll
  limits still apply at the beginning/end of the document.

## Regression evidence

Provider fixtures from phases 1/3 continue to exercise imagery, source outages,
official lifecycle/identity, and retained data. Explicitly synthetic scale fixtures
exercise 80–90 warnings and 70–75 stories without presenting them as observations.

Added Jest coverage exercises full-collection search/pagination, warning order and
tie breaks, exact expiry, cancellation, cold-instance retention, staged background
updates, hidden-tab pause/resume, stale response rejection, request serialization,
timeouts, and retry backoff. API tests cover validated browse parameters and preserve
legacy consumers. Playwright journeys cover mobile/desktop sections, view all,
search/filter reset, official links, staged updates, focus/scroll anchoring, and
hidden-page/outage behavior. Existing imagery and lifecycle journeys use the new
section response contract.

Final check results, independent review findings, and deployed browser evidence
are recorded in the phase-4 PR before completion.

## Remaining boundaries

Verified-active coverage remains NWS-only. Server snapshots remain a warm-instance
optimization, with no durable shared cache. The browser can retain only the records
it has already received; it cannot recover unseen reports during an outage. No local
personalization, new provider, notifications, inferred storm clustering, or automatic
newsletter publication is introduced. Merge remains an owner action.
