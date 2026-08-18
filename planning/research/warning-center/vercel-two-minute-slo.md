# Warning Center Vercel Two-Minute SLO

Research completed for [Validate the two-minute target on Vercel](https://github.com/jelrod27/Weather-application-/issues/513). Facts were verified against official Vercel documentation and pricing on August 6, 2026.

## Decision

Vercel Pro can support a measured two-minute application SLO, but Vercel cannot provide a hard end-to-end latency guarantee.

- Cron is best effort, can miss or duplicate invocations, and does not retry failures.
- Queues provide durability and at-least-once execution, not a latency SLA or exactly-once processing.
- Workflow and provider retries may exceed two minutes.
- NWS publication, email receipt, browser connectivity, and device rendering remain outside Vercel's control.

The product must describe two minutes as a percentile-based SLO and measure discovery, display readiness, and provider acceptance separately.

## Recommended architecture

1. Require Vercel Pro.
2. Use a lightweight scheduled reconciliation trigger with a database lease to prevent overlapping ingestion.
3. Fetch the national NWS collection once per cycle.
4. Persist canonical Source Messages and Warning Events with immutable observation timestamps.
5. Write event changes and outbox records transactionally.
6. Publish outbox work with stable idempotency keys.
7. Use queue consumer groups for spatial matching, display materialization, and channel Delivery.
8. Enforce database uniqueness by Warning Event version, Protected Place, lifecycle phase, and channel.
9. Acknowledge channel work only after provider acceptance.
10. Maintain an application-level failure table because Vercel Queues has no built-in dead-letter queue.
11. Serve active warnings from canonical persisted data with `no-store` or tightly bounded cache behavior.
12. Monitor Cron heartbeats, ingestion gaps, maximum queue age, retries, and latency histograms.

Workflow is appropriate for ingestion orchestration and recovery. Queues are appropriate for recipient fan-out, provided the team explicitly accepts the current beta push-trigger surface.

## Proposed service objectives

- Discovery: at least 99% of eligible NWS Warning Events observed within 120 seconds of authoritative `sent`, measured monthly.
- Display-ready: at least 99.9% of accepted ingestions queryable within 30 seconds of local observation.
- Active client: at least 99% of online Warning Center clients fetch or receive display-ready changes within 60 seconds.
- Delivery: at least 99% of eligible recipient/channel pairs receive provider acceptance within 120 seconds of local observation.
- Eventual Delivery: track a separate longer objective for retry recovery.

Provider acceptance is not inbox receipt, push display, or user awareness.

## Current-system gaps

- Severe-alert processing runs once daily.
- Backfill, point ingestion, subscription processing, persistence, and email run synchronously in one Function.
- Subscriptions are processed sequentially.
- Delivery failures are not naturally recoverable after monitor state advances.
- Duplicate invocations can create duplicate user-alert records.
- Failed NWS point requests can incorrectly drive ended messaging.
- Current API caching and client polling can exceed two minutes.
- No Workflow, Queue, outbox, or SLO timestamp model exists.

## Required telemetry

Persist and correlate:

- `source_sent_at`
- `observed_at`
- `persisted_at`
- `queued_at`
- `consumer_started_at`
- `display_ready_at`
- `provider_accepted_at`

Track queue age, duplicate suppression, retry count, poison work, stale ingestion, provider rejection, and active-client freshness.

## Remaining decisions

- Exact SLO anchor, percentile, window, sample size, and error budget.
- Whether Vercel Queue push-trigger maturity is acceptable.
- Region placement relative to Supabase and providers.
- Active-client update mechanism.
- Need for an independent scheduler watchdog.
- Retry versus permanent quarantine policy.

## Primary sources

- [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Managing Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel Function limits](https://vercel.com/docs/functions/limitations)
- [Vercel Workflows](https://vercel.com/docs/workflows)
- [Vercel Workflow pricing and limits](https://vercel.com/docs/workflows/pricing)
- [Vercel Queue concepts](https://vercel.com/docs/queues/concepts)
- [Vercel Queue pricing and limits](https://vercel.com/docs/queues/pricing)
- [Vercel Queue observability](https://vercel.com/docs/queues/observability)
- [Vercel Observability Plus](https://vercel.com/docs/observability/observability-plus)
