# Weather experience remediation scope

Agreed September 25, 2026. Audience: everyday users first, with depth for enthusiasts.

Reference: [UX audit](ux-audit-2026-09-25.md) and [URL inventory](ux-audit-2026-09-25-routes.csv).

## Delivery principles

Use one PR per outcome, with multiple independently understandable commits. Include focused regression coverage with behavior changes. Preserve the existing visual design during the correctness and repair work. No new providers, paid integrations, or database migrations are planned for PR 1.

## PR 1: Weather data correctness and trust — seven commits

1. **Consistent units.** Carry actual units through current, daily and expanded forecasts. Correct international temperature and pressure labels, and wind units where these views share the same data.
2. **Honest missing data.** Remove placeholder daily humidity/cloud values and current pressure presented as future pressure. Do not fabricate missing daily forecasts. Keep unavailable values distinct from valid zeroes.
3. **Correct local times.** Format hourly dates and astronomy in the viewed location's time zone. Distinguish sunset/sunrise from astronomical darkness and use consistent definitions.
4. **Accurate alert status.** Exclude expired/cancelled/superseded weather products from active experiences; distinguish recent space-weather messages from currently effective alerts without inventing validity periods.
5. **Correct geographic relevance.** Separate local, national and global activity. Explicitly identify unsupported NWS coverage and keep subscribed warning pins distinct from viewed cities.
6. **Credible travel results.** Remove unsupported peak-misery timing and explain the limited corridor overview. Preserve useful scores without claiming departure optimization.
7. **Consistent astronomy calculations.** Share the approximate aurora viewline calculation and correct hemisphere descriptions, with uncertainty explicit.

Done means all seven behaviors have appropriate regression coverage, relevant checks pass, a code review is addressed, and one PR contains the seven commits. The scope and audit references travel with the first commit.

## PR 2: Repair existing journeys

Separate commits for London lookup, Hourly location recovery, tropical feeds, aviation airport resolution, warning-to-radar/source links, and related loading/failure recovery.

## PR 3: Correct educational content

Separate commits for cloud taxonomy, flare classification, unsupported claims/source attribution, and outdated product descriptions.

## PR 4: Improve the UI

Local summaries; forecast → hourly → radar → explanation → return with location preserved; compact mobile radar; simpler travel controls; visual lessons; keyboard accessibility.

## Later, separately scoped

Route- and departure-time-aware travel, new forecasting/provider integrations, ensemble probabilities, and other features requiring new data or meaningful product decisions. Do not imply precise rain arrival from historical radar frames alone.
