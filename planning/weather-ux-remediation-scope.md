# Weather experience remediation scope

Agreed September 25, 2026. Audience: everyday users first, with depth for enthusiasts.

Reference: [UX audit](ux-audit-2026-09-25.md) and [URL inventory](ux-audit-2026-09-25-routes.csv).

## Delivery principles

Use one PR per outcome, with multiple independently understandable commits. Include focused regression coverage with behavior changes. Preserve the existing visual design during the correctness and repair work. No new providers, paid integrations, or database migrations are planned for PR 1.

## PR 1: Weather data correctness and trust — seven commits

Merged as PR #627 (`deda7e5`).

1. **Consistent units.** Carry actual units through current, daily and expanded forecasts. Correct international temperature and pressure labels, and wind units where these views share the same data.
2. **Honest missing data.** Remove placeholder daily humidity/cloud values and current pressure presented as future pressure. Do not fabricate missing daily forecasts. Keep unavailable values distinct from valid zeroes.
3. **Correct local times.** Format hourly dates and astronomy in the viewed location's time zone. Distinguish sunset/sunrise from astronomical darkness and use consistent definitions.
4. **Accurate alert status.** Exclude expired/cancelled/superseded weather products from active experiences; distinguish recent space-weather messages from currently effective alerts without inventing validity periods.
5. **Correct geographic relevance.** Separate local, national and global activity. Explicitly identify unsupported NWS coverage and keep subscribed warning pins distinct from viewed cities.
6. **Credible travel results.** Remove unsupported peak-misery timing and explain the limited corridor overview. Preserve useful scores without claiming departure optimization.
7. **Consistent astronomy calculations.** Share the approximate aurora viewline calculation and correct hemisphere descriptions, with uncertainty explicit.

Done means all seven behaviors have appropriate regression coverage, relevant checks pass, a code review is addressed, and one PR contains the seven commits. The scope and audit references travel with the first commit.

## PR 2: Repair existing journeys

Merged as PR #628 (`5e19b27`), including review fixes.

Six commits for London lookup, Hourly location recovery, warning-to-radar/source links, tropical feeds, aviation airport resolution, and related loading/failure recovery. See the [PR 2 acceptance scope](pr2-repair-weather-journeys.md).

## PR 3: Correct educational content

Merged as PR #629 (`aa6b257`), including citation review fixes.

Separate commits for cloud taxonomy, flare classification, unsupported claims/source attribution, and outdated product descriptions.

See the [PR 3 acceptance scope](pr3-correct-weather-education.md).

## PR 4: Improve the UI

Merged as PR #630 (`7ddf03a`), including local review and CodeRabbit corrections.

Local summaries; forecast → hourly → radar → explanation → return with location preserved; compact mobile radar; simpler travel controls; visual lessons; keyboard accessibility.

See the [PR 4 acceptance scope and approved design](pr4-improve-weather-ui.md).

## PR 5: Everyday outdoor planning

Merged as PR #631 (`b6625a4`). Approved September 26, 2026. Extend the existing Hourly view with a **Plan time outdoors** panel and a location-preserving link from the forecast summary. Keep Daybreak styling and the existing detailed forecast available.

- Choose Today/Tomorrow in the viewed city's calendar and a one- or two-hour outing. Compare up to three distinct future windows with local times, current units, temperature ranges, peak hourly wind, and highest hourly precipitation chance. Each opens the matching hourly details with a visible date and keyboard focus.
- Explain tradeoffs rather than invent a combined probability or safety score. Select lower precipitation chance first, then lighter wind, then temperatures closest to 20°C/68°F among remaining non-overlapping periods; break ties by earlier time. The temperature target is an explicit product preference, not a scientific comfort threshold.
- Compare 6 AM–9 PM city-local clock hours, explicitly distinct from daylight. Require contiguous readings covering the entire outing, including both temperature/wind endpoints. Precipitation probabilities describe the preceding hour, so use each interval's ending reading. Preserve unknown condition codes rather than defaulting them to clear in the planner.
- Omit periods with thunderstorm, freezing-condition or heavy-precipitation codes. These comparisons do not assess official warnings, gusts, UV or air quality; keep a plain reminder to check alerts and local conditions. Missing readings, invalid units/time zones, elapsed windows and unavailable forecasts must produce honest recovery states. Do not imply the provider's issuance time is known.
- Use existing data and dependencies. No new provider, route planning, account persistence or database change. Beginner astronomy is scoped separately in PR 6 below.

Deliver in three focused commits: complete-window comparisons and data coverage; accessible comparison panel; forecast/hourly connections and full-journey checks. Validate missing data, true zeroes, chronology/gaps, unit equivalence, local calendars/DST, controls, mobile layout and keyboard navigation. Run the local code-review skill against `7ddf03a`, address findings, then push and open one PR. Do not merge automatically.

## PR 6: Beginner stargazing — six commits

Scope prepared September 26, 2026, on `codex/beginner-stargazing` from merged PR 5 (`b6625a4`). Design approved September 26, 2026; implementation in progress.

Add a beginner entry to Stargazer that answers when to look, what to try with the chosen equipment, which direction to face, and what to expect. Preserve the existing enthusiast tools. Include the location, time, unit and missing-data repairs needed to trust those answers.

Approved commit outcomes: consistent observing location/time; trustworthy forecast inputs; suitable-hour and target calculations; beginner entry view; illustrated finding guides and catalog discovery; complete-journey/accessibility validation. Use existing providers and dependencies, with local code review before one PR and the established CI/CD and bot-review babysit workflow afterward.

See the [full PR 6 scope, data rules and acceptance criteria](prds/PRD-beginner-stargazing.md).

## Later, separately scoped

Route- and departure-time-aware travel, new forecasting/provider integrations, ensemble probabilities, and other features requiring new data or meaningful product decisions. Do not imply precise rain arrival from historical radar frames alone.
