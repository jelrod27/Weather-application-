# Dependency and generated-content security follow-ups — November 8, 2026

## Dependency evidence

Before this change, a fresh npm audit reported four distinct advisories across 32 affected package entries: one high (`body-parser`), two moderate (`glob`, `minimatch`), and one low (`deepmerge`). Ancestor packages in npm's result are not additional independent vulnerabilities. GitHub's earlier three-alert view had not included the development-only `body-parser` advisory.

Targeted overrides select `body-parser` 1.20.9, `glob` 14.0.2 for affected modern consumers, and `minimatch` 11.0.1 for affected versions. Scoped Jest overrides also replace its pinned modern glob dependency. Legacy glob 7/minimatch 3 consumers retain their existing API. The patched packages support the repository's Node floor; no direct application or test framework was downgraded. `npm ci` verifies the committed lockfile rather than relying on an existing installation.

Primary advisory and package references:

- [body-parser compressed-request denial of service](https://github.com/advisories/GHSA-27r3-jxmh-p828), patched in 1.20.9; used here by Express through the Lighthouse development CLI.
- [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), patched in 14.0.2; used by Sentry bundler tooling and Jest.
- [minimatch globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), patched in 11.0.1; affected consumers include lint, test and bundler tooling.
- [deepmerge returned-object prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): npm still lists 4.3.1 as the latest release and provides no patched release. It is a Jest configuration dependency, not an application data-merging API. It remains visible in the audit; no advisory suppression, unverified old-version downgrade or framework downgrade is used. Keep test configuration and test execution restricted to trusted repository code.
- Exact versions, engine declarations and dependency graphs were retrieved from the [npm registry](https://registry.npmjs.org/).

After the locked reinstall, npm audit reports **zero high, moderate or critical findings**. The one unpatched low advisory appears across five affected Jest/deepmerge package entries. That limitation is not a claim of zero vulnerabilities.

## CodeQL #332 disposition

[CodeQL #332](https://github.com/jelrod27/Weather-application-/security/code-scanning/332) follows remote generated prose from the Anthropic response into `publishPost`'s Markdown write. This is the newsletter's intended content-generation operation, not a public arbitrary-upload endpoint.

The reviewed boundaries are:

- The CLI controls the repository root. Sunday filenames use a fixed prefix plus an internally generated date. Wednesday filenames use `slugify`, which restricts the topic/date to ASCII letters, digits and hyphens and bounds its length. Audit filenames use an internal date/cadence/UUID.
- Generated prose is written as a Markdown body, and frontmatter strings are serialized as quoted data. No model-controlled path, dynamic code import, shell evaluation or executable file extension is used.
- Public rendering uses `ReactMarkdown` with `rehype-sanitize`; external image/link handling also passes through the existing blog URL policy. Writing a local file does not certify model prose as trustworthy.
- Publication still requires the bound audit/receipt, structural/image gates, normal PR protections and secret scanning. The workflows do not persist checkout credentials into dependency install steps.

The finding is classified as an expected remote-content-to-Markdown flow after this review; the GitHub alert is left open for its explicit repository review/disposition. No blanket CodeQL exclusion or local suppression was added. This conclusion does not certify generated factual claims or every other writer in the repository.

Four filesystem-level regression cases pin confinement for relative traversal, absolute paths, backslashes and newline/YAML-like topic text. They exercise the real writer and verify both output directories and parsed frontmatter. Existing safe behavior is pinned rather than introducing an unnecessary writer rewrite.

## Validation record

- Clean baseline: 315 suites / 2,666 tests passed before implementation.
- Registry versions/engines and fresh before/after npm audit captured locally under `/private/tmp/weather-followups/`.
- Locked reinstall completed with normal Husky setup.
- Area tests, integrated build/type/lint/browser checks and independent review are recorded in the final PR evidence; an audit response alone is not compatibility validation.
