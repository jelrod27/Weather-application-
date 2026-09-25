# Security delivery fixes: rollout and validation

This PR addresses the September 25 application security review. Gitleaks/history remediation is excluded by the owner's request; existing hooks and configuration remain unchanged.

## Application changes

- Push registration and delivery accept HTTPS endpoints from Firebase, Mozilla, Apple, and Windows browser push services. Old stored destinations are checked again before sending. Actual connections use DNS validation that rejects non-public addresses without a second resolution. One three-second deadline covers all devices belonging to a recipient; response bodies cannot hold up delivery.
- RSS article-image enrichment uses the same connection policy, validates each redirect, and retains one six-second deadline and a 48 KB response limit. HTTP destinations, credentials, unusual ports, and IP literals fail closed; ordinary feed rendering falls back when enrichment fails. The existing in-memory image cache remains.
- Severe-alert recipients come from the confirmed Supabase Auth address. Browser profile updates are restricted to the six fields already allowed by the UI; profile creation and delivery markers remain server-managed.
- Guest verification/management email requests claim an atomic database quota before updating tokens: one per five minutes, at most five per rolling 24-hour window, keyed by a hash of the normalized recipient. Suppressed requests return the same generic response and do not change tokens. A quota/database failure returns 503 without sending. Failed provider sends still consume a slot to avoid retry-driven abuse.
- YAML and query-parser dependencies are patched; Lighthouse is upgraded to 13.5.0 to remove the vulnerable archive extractor from its browser-tooling chain. Local/CI Node must be 22.19 or newer.

## Deploy order

1. Apply `supabase/migrations/20260925182601_security_sweep_delivery_guards.sql` to the intended Supabase project **before** deploying this branch. The old application is compatible with the tightened profile grants; profiles are created by the existing Auth trigger. The guest route fails closed if deployed before the RPC exists.
2. Confirm normal profile edits still work and Auth-created profiles are populated. Confirm `authenticated` cannot write `profiles.email`, `profiles.welcome_email_sent_at`, or insert profiles directly. Confirm the new quota table/RPC are service-only.
3. Deploy the application. Exercise one verified account's email and push enrollment, plus one guest enrollment/resend using mailboxes controlled by the tester. A repeat guest request inside five minutes must neither send nor invalidate the first verification link. Test real Chrome/Firefox/Safari push devices; do not send test alerts to other subscribers.
4. Re-run Supabase's security advisor. An informational “RLS enabled, no policy” notice for `guest_alert_email_limits` is expected: the table intentionally denies client access and is service-only.

No production migration or hosting setting is applied by this PR.

## Supabase settings outside Git

In the target project's **Authentication → Email provider settings**, enable leaked-password protection if the current plan supports it, save, and verify the security-advisor warning clears. Supabase requires Pro or higher for this option; do not change the billing plan implicitly. This is a dashboard setting, not an application environment variable. [Supabase password-security documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The September 25 audit observed PostgreSQL 17.6. Supabase's 17.11 security rollup becomes available for existing projects from September 28. Review compatibility and schedule the database upgrade separately. [Provider rollout notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

Quota rows contain hashed recipient identifiers. When doing scheduled retention maintenance, the service role can remove rows whose `last_claimed_at` is older than 30 days; keep at least the full 24-hour enforcement window. No new production schedule is introduced by this PR.

## Reproducible local checks

```sh
npm run typecheck
npm run typecheck:tests
npm run lint
npm run test:ci
npm run test:security-db
npm run knip
npm audit
npm audit --omit=dev
npm run build
```

The database tests execute the actual migration on an isolated PGlite PostgreSQL instance, including role/column permissions, service-only execution, competing queued quota claims, cooldown, and window boundaries. They do not connect to production. Browser and Lighthouse results are recorded in the PR's validation summary.

## References

- [Apple Web Push endpoint guidance](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Web Push request generation](https://github.com/web-push-libs/web-push#generaterequestdetailspushsubscription-payload-options)
- [YAML denial-of-service advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh)
