# Product requirements (PRDs)

This index separates current proposals from shipped specifications and historical designs. **A PRD is not authorization to implement unless its status says approved.** Shipped specs are retained as decision and acceptance history, with links to the implementation PR and merge commit where verified.

## Active

| Document | Status | Current scope / next step |
|---|---|---|
| [PRD-forecast-temperature-quality.md](./PRD-forecast-temperature-quality.md) | **Approved — PR review** | [Issue #656](https://github.com/jelrod27/Weather-application-/issues/656): scoped NBM temperature selection for home/city/hourly forecasts, complete-group fallback and preserved ancillary metrics; implemented and validated, not yet shipped. |
| [PRD-travel-turbulence-forecast.md](./PRD-travel-turbulence-forecast.md) | **Approved US advisory slice — PR review** | [Issue #657](https://github.com/jelrod27/Weather-application-/issues/657): map-first contiguous-US advisories, source snapshot/altitude controls and accessible details. Broader North America forecast and optional approximate trip comparison remain proposals with source feasibility gates. |

## Shipped

| Document | Implementation | Notes |
|---|---|---|
| [PRD-clear-sky.md](./PRD-clear-sky.md) | [PR #638](https://github.com/jelrod27/Weather-application-/pull/638) · merge `7834d12` | Clear Sky default and forecast experience. See [verification](../clear-sky-verification.md). |
| [PRD-first-visit-weather.md](./PRD-first-visit-weather.md) | [PR #637](https://github.com/jelrod27/Weather-application-/pull/637) · merge `53bd65b` | First-visit location and search flow. |
| [PRD-weather-data-reliability.md](./PRD-weather-data-reliability.md) | [PR #634](https://github.com/jelrod27/Weather-application-/pull/634) · merge `9916b0f` | Saved-weather reliability, radar age, Moon context, and travel summaries. See the linked plan and verification record. |
| [PRD-beginner-stargazing.md](./PRD-beginner-stargazing.md) | [PR #632](https://github.com/jelrod27/Weather-application-/pull/632) · merge `402f69f` | Beginner observing path. Follow-up stabilization is tracked in [the weather UX scope](../weather-ux-remediation-scope.md). |
| [PRD-radar-v2.md](./PRD-radar-v2.md) | [PR #449](https://github.com/jelrod27/Weather-application-/pull/449) · merge `b82404f` | RainViewer-native radar v2. Later radar accuracy and navigation work includes [PR #618](https://github.com/jelrod27/Weather-application-/pull/618) and [PR #633](https://github.com/jelrod27/Weather-application-/pull/633). |
| [PRD-bitwatch.md](./PRD-bitwatch.md) | [PR #537](https://github.com/jelrod27/Weather-application-/pull/537) · merge `94e34f3` | Warning Events, guest alerts, warning desk, and Scout shipped; later hardening is recorded in PRs #540, #542, #544, #545, and #601. Current domain terms: [`CONTEXT.md`](../../CONTEXT.md). The original baseline in this PRD is historical. |
| [PRD-news-overhaul.md](./PRD-news-overhaul.md) | [PR #420](https://github.com/jelrod27/Weather-application-/pull/420) · merge [8b1224d](https://github.com/jelrod27/Weather-application-/commit/8b1224d3f8d7b765dae78df0c55f385c32e60010), [PR #455](https://github.com/jelrod27/Weather-application-/pull/455) · merge [98ad9e5](https://github.com/jelrod27/Weather-application-/commit/98ad9e5dce85c45f49ec17bf4173471ad0b4b3fd); follow-ups [#507](https://github.com/jelrod27/Weather-application-/pull/507) · merge [b8cf55f](https://github.com/jelrod27/Weather-application-/commit/b8cf55fb6f67260b7a63b5e06d272f23947d2742), [#508](https://github.com/jelrod27/Weather-application-/pull/508) · merge [e17f144](https://github.com/jelrod27/Weather-application-/commit/e17f144c7f9674726b05f39cd09b6bae72029ab3) | Core overhaul, hazard-image honesty, and weekly feed-health check shipped. **Open follow-up:** display image credits on editorial news cards. The older implementation sections are historical. |

## Stale / archived

These documents remain in place for historical context. They are not current implementation instructions.

| Document | Why archived |
|---|---|
| [PRD-condition-alerts.md](./PRD-condition-alerts.md) | Unimplemented proposal based on a June 2026 baseline. Its assumption that alert tables do not exist is no longer true: the tables now support severe alerts. Stargazing-window alerts are not evidenced as implemented. Re-scope the data model and product need before reconsidering. |

## Status and traceability rules

- **Active proposal:** idea is retained for consideration; it is not implementation approval.
- **Active — approved:** scope has explicit approval and implementation is not complete. Record the approval and originating issue/PR when available.
- **Shipped:** link the implementation PR and its merge commit. Link follow-up work separately rather than leaving the original implementation status open.
- **Stale / archived:** record why the design is no longer current and link to its replacement or current source of truth when one exists.
- Keep each PRD in this directory for now. If a document is later moved, update inbound relative links and this index in the same change.
