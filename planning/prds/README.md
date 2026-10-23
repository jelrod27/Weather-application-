# Product requirements (PRDs)

This index separates current proposals from shipped specifications and historical designs. **A PRD is not authorization to implement unless its status says approved.** Shipped specs are retained as decision and acceptance history, with links to the implementation PR and merge commit where verified.

## Active

| Document | Status | Current scope / next step |
|---|---|---|
| Read your sky: scientific cloud types | **Source-feasibility research — [issue #666](https://github.com/jelrod27/Weather-application-/issues/666)** | The cloud-cover experience shipped in #665. Research whether observations can support scientific cloud names; a positive result does not authorize production implementation. The issue defines the evidence, sampling, source-rights and go/no-go deliverables. |
| [PRD-travel-turbulence-forecast.md](./PRD-travel-turbulence-forecast.md) | **Expansion proposal** | The US advisory slice shipped in #658. Broader North America forecasting and optional trip comparison remain proposals with source feasibility gates. |

## Shipped

| Document | Implementation | Notes |
|---|---|---|
| [PRD-read-your-sky.md](./PRD-read-your-sky.md) | [PR #665](https://github.com/jelrod27/Weather-application-/pull/665) · merge `ba08c59` · October 10, 2026 | Selected-place cloud-cover estimate, matching illustration and two-hour outlook. See [verification](../read-your-sky-verification.md). Scientific cloud-type research is tracked separately in #666. |
| [PRD-forecast-temperature-quality.md](./PRD-forecast-temperature-quality.md) | [PR #658](https://github.com/jelrod27/Weather-application-/pull/658) · merge `95f8c12` · October 5, 2026 | Scoped NBM temperatures for home/city/hourly forecasts, complete-group fallback and preserved ancillary metrics; closes #656. |
| [PRD-travel-turbulence-forecast.md](./PRD-travel-turbulence-forecast.md) — US advisory slice | [PR #658](https://github.com/jelrod27/Weather-application-/pull/658) · merge `95f8c12` · October 5, 2026 | Contiguous-US advisories, source snapshot/altitude controls and accessible details; closes #657. Broader scope remains a proposal. |
| [PRD-clear-sky.md](./PRD-clear-sky.md) | [PR #638](https://github.com/jelrod27/Weather-application-/pull/638) · merge `7834d12` | Clear Sky default and forecast experience. See [verification](../clear-sky-verification.md). |
| [PRD-first-visit-weather.md](./PRD-first-visit-weather.md) | [PR #637](https://github.com/jelrod27/Weather-application-/pull/637) · merge `53bd65b` | First-visit location and search flow. |
| [PRD-weather-data-reliability.md](./PRD-weather-data-reliability.md) | [PR #634](https://github.com/jelrod27/Weather-application-/pull/634) · merge `9916b0f` | Saved-weather reliability, radar age, Moon context, and travel summaries. See the linked plan and verification record. |
| [PRD-beginner-stargazing.md](./PRD-beginner-stargazing.md) | [PR #632](https://github.com/jelrod27/Weather-application-/pull/632) · merge `402f69f` | Beginner observing path. Follow-up stabilization is tracked in [the weather UX scope](../weather-ux-remediation-scope.md). |
| [PRD-radar-v2.md](./PRD-radar-v2.md) | [PR #449](https://github.com/jelrod27/Weather-application-/pull/449) · merge `b82404f` | RainViewer-native radar v2. Later radar accuracy and navigation work includes [PR #618](https://github.com/jelrod27/Weather-application-/pull/618) and [PR #633](https://github.com/jelrod27/Weather-application-/pull/633). |
| [PRD-bitwatch.md](./PRD-bitwatch.md) | [PR #537](https://github.com/jelrod27/Weather-application-/pull/537) · merge `94e34f3` | Warning Events, guest alerts, warning desk, and Scout shipped; later hardening is recorded in PRs #540, #542, #544, #545, and #601. Current domain terms: [`CONTEXT.md`](../../CONTEXT.md). The original baseline in this PRD is historical. |
| [PRD-news-overhaul.md](./PRD-news-overhaul.md) | [PR #420](https://github.com/jelrod27/Weather-application-/pull/420) · merge `8b1224d`; [#455](https://github.com/jelrod27/Weather-application-/pull/455) · merge `98ad9e5`; [#507](https://github.com/jelrod27/Weather-application-/pull/507) · merge `b8cf55f`; [#508](https://github.com/jelrod27/Weather-application-/pull/508) · merge `e17f144`; [#676](https://github.com/jelrod27/Weather-application-/pull/676) · merge `b76159e`; [#680](https://github.com/jelrod27/Weather-application-/pull/680) · merge `b9970e1` | Core overhaul, image honesty, visible image credits, weekly feed-health check and section browsing shipped. Older implementation sections are historical. |

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
