# Warning Center Free-Service Economics

Research completed for [Model free-service cost and abuse controls](https://github.com/jelrod27/Weather-application-/issues/515). Vendor pricing and limits were verified against first-party sources on August 6, 2026. Estimates exclude engineering, support, and on-call costs.

## Decision

A free service is economically plausible when national ingestion runs once per interval, Warning Events are deduplicated before spatial matching, and verification traffic is isolated from urgent Delivery.

Modeled monthly operating ranges:

- 1,000 Subscribers: approximately $65–$80 ordinarily and $65–$90 during a severe month.
- 10,000 Subscribers: approximately $70–$130 ordinarily and $90–$160 during a severe month.
- 100,000 Subscribers: approximately $130–$220 ordinarily and $450–$600 during a widespread outbreak.

These are planning ranges, not forecasts. Email volume and spatial database compute are the largest uncertainties. Correlated outbreaks matter more than monthly averages.

## Workload assumptions

- Five Protected Places maximum; 2.5 average.
- Approximately 43,800 national polls per month at one-minute cadence.
- Ordinary month: 0.5 matched incidents per Subscriber.
- Stress month: three matched incidents per Subscriber.
- Average 1.5 lifecycle Deliveries per matched incident.
- Seventy percent push adoption with 1.3 browser endpoints per enabled Subscriber.
- Twelve months of in-app history.

The final model must be recalculated after the ingestion cadence and lifecycle Delivery policy are decided.

## Cost architecture

- Fixed ingestion should fetch nationally and never issue an NWS request per Protected Place.
- Spatial matching must scale with changed warning geometry and indexed candidate points, not polls multiplied by every place.
- Use PostGIS point-in-polygon matching with a bounding-box prefilter.
- Push has no normal per-message browser-provider charge but remains best effort.
- Resend is the principal variable cost and burst bottleneck. Its free plan is unsuitable because a single outbreak can exceed the daily limit.
- Budget limits must not automatically disable urgent Delivery during an outbreak.

## Required abuse controls

### Verification

- Require Turnstile before verification sends.
- Return generic success responses to prevent email enumeration.
- Permit at most three sends per normalized email per hour.
- Start with ten sends per IP or network prefix per hour and 25 per day.
- Keep one pending verification per email and replace it rather than append.
- Use hashed, single-use, short-lived tokens bound to the intended operation.
- Never activate protection before ownership verification.
- Isolate verification capacity from urgent Warning Event Delivery.

### Protected Places

- Enforce the five-place limit transactionally.
- Canonicalize coordinates and reject near-duplicates.
- Count pending and verified places toward abuse limits.
- Start with two edits per minute and ten per day per Subscriber.
- Validate US bounds and payload sizes server-side.

### Push installations

- Limit a Subscriber to five active endpoints.
- Upsert by hashed endpoint and enforce uniqueness.
- Treat endpoint URLs as secrets.
- Remove endpoints returning 404 or 410 and back off on 429.
- Reconcile active installations periodically and expire long-inactive records after a defined grace period.

## Emergency safeguards

- Use a durable outbox keyed by Warning Event version, Protected Place, channel, and lifecycle phase.
- Persist in-app state before external fan-out.
- Separate urgent Warning Delivery, reconciliation/retry, lifecycle, and verification queues.
- Reserve provider quota for urgent Delivery and shed verification or non-urgent lifecycle work first.
- Use provider idempotency keys and retry only transient failures while the warning remains useful.
- Keep channel-specific circuit breakers rather than one global Delivery switch.
- Monitor ingestion age, match lag, queue age, provider rejection, bounce, and complaint rates.
- Never infer an ended state from an empty or failed NWS response.

## Existing-system implications

The current system is not suitable at this scale:

- Severe-alert monitoring runs daily.
- It performs point-specific NWS requests and processes subscriptions serially.
- Failed NWS requests can become empty results, which risks incorrect ended messaging.
- Email is synchronous and lacks durable outbox semantics.
- Existing persistence assumes authenticated users.
- The in-memory, fail-open rate limiter is not a durable abuse boundary.

## Remaining decisions

- Whether active dated trips count toward the five-place limit.
- Which lifecycle changes send email by default.
- Which outbreak reserve should be prepaid.
- The percentile and measurement boundary for the two-minute target.
- In-app history and audit retention.
- The degraded-mode policy when email or push throttles.

## Primary sources

- [Vercel Cron pricing and limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Cron reliability](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Supabase billing quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)
- [Resend pricing](https://www.resend.com/pricing)
- [Resend quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
- [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [NWS Alerts Web Service](https://www.weather.gov/documentation/services-web-alerts)
