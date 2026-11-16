# PostHog setup

## Design

Add PostHog alongside Vercel Analytics and Speed Insights to understand the
increase in traffic and which parts of the weather site people visit. Use the
Vercel Marketplace variables `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and
`NEXT_PUBLIC_POSTHOG_HOST`; neither value belongs in the repository.

Initialize the SDK through the existing lazy analytics wrapper. Capture initial
pageviews and client-side navigation. Use an anonymous browser ID in local
storage for repeat visits, without linking Supabase accounts or creating person
profiles. Disable session replay, autocapture, surveys, and error capture; respect
Do Not Track. Remove URL query strings/fragments before sending events, including
referrers and initial/session URLs. Analytics must not break the app if blocked,
unconfigured, or unavailable. Track Vercel production deployments only.

A synchronous instrumentation import would add work before hydration and change
the existing Sentry bootstrap; the lazy wrapper preserves that performance
boundary. Server-side analytics and custom business events are separate work.

## Implementation plan

- [x] Add focused regression tests for environment gating, sanitized event data,
      initialization, and CSP; run them before implementation.
- [x] Install `posthog-js` with npm and add a small SDK configuration module plus
      a lazy initialization effect in the existing analytics wrapper.
- [x] Allow PostHog ingestion in the middleware CSP. Document the
      variables, privacy choices, and deployment verification in `.env.example`
      and README; add the tests to the configured test TypeScript project.
- [x] Run focused tests, both type checks, lint, the Jest suite, and a production
      build. Exercise the real SDK in a browser with intercepted ingestion so
      synthetic events do not enter production analytics.
- [x] Review the final diff and report checks, limitations, and deployment steps.

## Verification notes

The Marketplace variables were verified on the `weather-application` Vercel
project for production and preview. No Vercel settings or secrets were changed.
Production deployment is outside this setup request.

Review decisions: permit only known navigation/browser/session properties so
SDK-derived search/campaign values cannot bypass URL redaction. Respect Do Not
Track for identifier storage as well as event capture. Keep the SDK's cookie
fallback when local storage is unavailable, and its ordinary IP-based approximate
geography processing; both are documented in README. URL redaction applies to
transmitted events; this integration does not rewrite the SDK's local attribution
cache. No Supabase identity or personal properties are sent.

## Results

- Focused Jest coverage: 23 passed, including the existing guest-link referrer
  policy tests.
- Full Jest suite: 341 suites / 3,014 tests passed. The default macOS temporary
  directory alias caused four pre-existing newsletter path-boundary failures;
  setting `TMPDIR` to `realpathSync(tmpdir())` resolved them without code changes.
- `npm run typecheck` and `npm run typecheck:tests`: passed.
- `npm run lint`: zero errors, 87 existing warnings. Targeted lint on every
  changed code/test file also passed without warnings.
- Production build with fixture PostHog variables: passed.
- Production SDK Playwright tests in Chromium: 3 passed. Confirmed initial and
  SPA pageviews, stable repeat-browser identity, pageleave, redacted transport
  payloads, DNT without persistent identifiers, and navigation under blocked
  analytics requests. Both privacy regressions failed against the prior build
  and passed with the fixes. The test masks automation markers locally; the
  application's SDK bot filtering remains enabled.
- Independent read-only review completed; its two privacy findings were fixed
  and covered by the failing-then-passing transport tests.
- `npm audit --omit=dev`: zero production dependency vulnerabilities.
- Full cross-browser E2E and Lighthouse were not run; verification targeted the
  analytics integration and existing application unit suite.

Changed files: `lib/posthog.ts`, `components/analytics-wrapper.tsx`,
`middleware.ts`, `package.json`, `package-lock.json`, `.env.example`, `README.md`,
`tsconfig.tests.json`, `__tests__/posthog.test.ts`, `__tests__/posthog-csp.test.ts`,
`tests/e2e/posthog.spec.ts`, and this setup record.

Deployment remains pending. After the next authorized production deployment,
confirm events in the real PostHog project's live activity. No production
deployments or account-setting changes were performed.
