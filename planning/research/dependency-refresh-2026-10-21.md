# Dependency refresh — October 21, 2026

Reviewed against production/main commit `4be809629f24cd5e9b722045615bd4ac89f88e33`. Registry queries and validation continued into October 22 UTC.

## Scope

- Refresh all direct npm dependencies to the current stable release where compatible, and refresh transitive dependencies within their parents' supported ranges.
- Update 39 direct dependency declarations, including Next.js/tooling 16.4.2, React/React DOM 19.3.1, Sentry 11.8.0, Supabase JS 2.118.0, OpenLayers 10.11.0, MapLibre 6.15.0, Playwright 1.64.1, and Tailwind 4.3.3.
- Remove unused, deprecated `critters` (CSS optimization is disabled).
- Update security overrides for PostCSS, tmp, qs and nanoid. Preserve major-scoped compatibility overrides rather than force every transitive dependency to its newest major.
- Update artifact-upload actions to 7.0.2 and CodeQL actions to 4.39.1, with verified commit-SHA pins. These include/supersede the changes proposed in Dependabot PR #686; that PR is not closed automatically.
- Check npm version updates weekly instead of monthly.

## Compatibility decisions

| Dependency | Decision | Reason |
| --- | --- | --- |
| TypeScript | Retain 6.0.3 | Latest TypeScript ESLint parser 8.72.0 requires TypeScript `<6.1.0`; ts-jest also excludes 7. Do not force TypeScript 7.0.2. |
| `@types/node` | Use latest Node 22 types, 22.20.5 | Match `.nvmrc` rather than advertise Node 26 APIs. |
| `@opentelemetry/api` | Override to 1.9.1 | OpenTelemetry core/resources/trace SDKs used by Lighthouse's Sentry dependency require `<1.10.0`. Sentry 11 also accepts 1.9.1. |
| `basic-ftp` | Override to 6.2.3 | Fix GHSA-c475-qrg2-pj4r; parent get-uri still requests the vulnerable 5.x line. Version 6 retains the used Client methods but disallows separate transfer hosts by default, a security hardening. FTP proxy behavior with separate transfer hosts is not tested. |

`npm outdated` reports only the intentional TypeScript and Node-type exceptions; no remaining direct dependency has a newer version within its declared range.

Sentry 11's `withSentryConfig` now comes from `@sentry/nextjs/config`, and `enableLogs` was removed upstream. Browser, server and edge initializers explicitly preserve the v10 restrictive data-collection defaults instead of adopting v11's broader collection. Initialization tests cover all three environments.

OpenLayers now types the map target as nullable; pointer handlers guard detached targets. Stargazer controlled equipment inputs now refresh immediately after updating browser history instead of depending on the timing of Next.js's history transition. Five previously failing browser tests pass without weakening their assertions.

## Security results and residual risk

The npm outage initially prevented auditing. After the endpoint recovered, a fresh audit returned:

| Lockfile | Critical | High | Moderate | Total affected package entries |
| --- | ---: | ---: | ---: | ---: |
| Original production lockfile | 0 | 14 | 21 | 35 |
| Updated lockfile, including dev tooling | 0 | 5 | 22 | 27 |
| Updated lockfile, `--omit=dev` | 0 | 0 | 4 | 4 |

Counts include inherited vulnerable parent packages, not distinct advisories. **This is not a zero-vulnerability upgrade.** The remaining entries originate from two advisories with no published fixed version:

- **braces — high:** [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), affects `<=3.0.3`. Development path through micromatch/fast-glob/Next's ESLint plugin. Deeply nested attacker-controlled patterns can exhaust the stack. No production entry is flagged by the production-only audit.
- **sprintf-js — moderate:** [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), affects `<=1.1.3`. Production path is gray-matter → js-yaml 3 → argparse 1 → sprintf-js; development tooling also includes it. Untrusted precision format strings can throw uncaught exceptions. Application exploitability has not been established.

Do not use `npm audit fix --force`: npm proposes incompatible downgrades to Jest 25, gray-matter 2 and older Next lint tooling. Removing these dependency paths or waiting for upstream fixes requires a separately reviewed change; this refresh does not silently dismiss the advisories.

`npm ls --all` is also not clean: upstream ESLint plugin peer ranges still exclude ESLint 10, and Lighthouse CLI's proxy-agent 6 does not meet Puppeteer's optional proxy-agent >=8 peer range. The repository's existing `legacy-peer-deps=true` remains unchanged. Lint and desktop Lighthouse pass, but proxy-specific configurations are not certified. npm also reports optional WASM package entries as extraneous.

## Validation

- Reproducible clean `npm ci --no-audit --no-fund` succeeds with lifecycle scripts enabled.
- App and test TypeScript checks pass.
- Jest: 296 suites, 2,475 tests pass, including three new Sentry initialization/privacy tests.
- Database security: nine tests pass.
- Chromium E2E: 173 pass, two skipped. Existing equipment-selection tests went red before the compatibility fix and green afterward.
- Production build passes with placeholder Supabase configuration, not production credentials.
- ESLint: zero errors, 89 warnings. Knip passes with configuration hints.
- Desktop Lighthouse: five-run assertions passed during validation.
- Mobile Lighthouse: incomplete locally; the final attempt reached the ninth collection run before the 240-second command timeout. No full mobile pass is claimed; run the CI performance workflow before merging.
- Firefox and live authenticated Supabase/provider integration checks were not run.

After merging, verify the Vercel deployment and production smoke workflow; a successful local build does not prove all live upstream services are healthy. Do not merge on the assumption that package updates repair npm/GitHub service outages.
