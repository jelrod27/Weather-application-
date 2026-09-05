# GitHub Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the six open security alerts on `jelrod27/Weather-application-` and close the branch-protection, Actions-policy, secrets-hygiene, and repo-hygiene gaps found in the 2026-09-04 audit.

**Architecture:** Three small PRs, each cut from a worktree off `origin/main` (code fixes, then workflow hardening, then repo hygiene), followed by a scripted set of GitHub settings changes through the REST API. The order is deliberate: pin action SHAs before requiring SHA pinning, and land the new CodeQL `actions` check on `main` before making it a required check. Every settings change is one `gh api` call with a verification read after it.

**Tech Stack:** Next.js 16 / TypeScript, Jest 30, ESLint 10 flat config, GitHub Actions, `gh` CLI 2.x against the GitHub REST API.

**Spec:** The 2026-09-04 audit conversation. The "Findings addressed" table below is the spec-to-task map; executors should treat that table plus the per-task rationale as the spec.

## Global Constraints

- `npm` only. Node 22 (`.nvmrc` is added in Task 15; the Vercel project runs `22.x`). Next.js 16 needs Node 20.9+.
- **Never edit the main checkout at `/Users/justinelrod/Projects/Weather-application`.** It is 34 commits behind `origin/main` and has uncommitted edits to `AGENTS.md`, `CLAUDE.md`, and `next-env.d.ts` that must be preserved. All code work happens in the worktree created in Task 0.
- Use `npm ci` in the worktree (no symlinked `node_modules`; Turbopack needs a real install).
- gitleaks pre-commit and pre-push hooks run on every commit and push. `gitleaks` 8.30.1 is installed at `/opt/homebrew/bin/gitleaks`.
- Gates that must stay green before every PR: `npm run lint`, `npm run typecheck`, `npm run typecheck:tests`, `npm test`, `npm run knip`. Task 20 also runs `npm run build` because `next.config.mjs` changes.
- PR titles are descriptive sentences. PR bodies contain no emojis (CLAUDE.md rule) and follow CODING.md: what changed, why, tests run, known risks or follow-ups. End the body with the plain-text line `Generated with [Claude Code](https://claude.com/claude-code)` (attribution without the emoji, to satisfy both rules).
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Every Phase B step changes a GitHub setting and needs the user's explicit go-ahead before it runs. Credential rotation happens at the provider, by the user, never by the agent.
- Do not touch `_archive/` or `releases/` (historical content).
- Repository constant used throughout: `R=jelrod27/Weather-application-`.

## Findings addressed

| # | Finding (2026-09-04 audit) | Task |
|---|---|---|
| F1 | Dependabot 124: `@humanfs/node` < 0.16.8 via eslint | Task 3 |
| F2 | CodeQL 308, 309: duplicate `.` in regex class, `lib/warnings/nws-parameters.ts:36,43` (and the leaked-dots bug behind it) | Task 1 |
| F3 | CodeQL 310: unused `themeClasses`, `app/blog/[slug]/blog-article.tsx:24` | Task 2 |
| F4 | CodeQL 311: unused `X` import, `components/dashboard/add-location-modal.tsx:4` | Task 2 |
| F5 | CodeQL 314: network data written to file, `scripts/education/publish.ts:181` (false positive) | B1 |
| F6 | ESLint never flags unused symbols, so F3/F4 recur | Task 4 |
| F7 | Security checks (Secret Scanning, CodeQL, Dependency Review) not required to merge; admin enforcement off; conversation resolution off | B4 |
| F8 | Actions: all actions allowed, no SHA pinning, mutable tags everywhere, Actions can approve PRs | Task 7, B3 |
| F9 | Dependabot ignores the github-actions ecosystem | Task 12 |
| F10 | Secret scanning non-provider patterns and validity checks disabled | B2 |
| F11 | Nine repo secrets, one used; Production env duplicates six; two unused Actions variables | B8, Task 18 |
| F12 | Production environment has no deployment-branch policy | B5 |
| F13 | Two ghost workflows (`debug-env.yml`, `playwright-vercel-only.yml`) still registered | B6 |
| F14 | Auto-merge off, "suggest updating PR branches" off | B7 |
| F15 | No PR template, issue templates, or CONTRIBUTING (health 57%) | Task 19 |
| F16 | 39 non-archive files link to the old `deephouse23` owner | Task 16 |
| F17 | Three stale remote branches | B9 |
| F18 | CI on Node 20 while Vercel and local dev run 22; no `engines`, no `.nvmrc` | Task 15 |
| F19 | Four workflows have no explicit `permissions:` block | Task 8 |
| F20 | `e2e-preview.yml` interpolates event fields straight into shell | Task 9 |
| F21 | Newsletter workflows leave `GITHUB_TOKEN` in `.git/config` across `npm ci` (education-guide.yml already avoids this) | Task 10 |
| F22 | CodeQL does not scan workflow files (`actions` language available) | Task 11 |
| F23 | `next.config.mjs` comment claims a nonce CSP that does not exist; deprecated `X-XSS-Protection` header | Task 17 |
| F24 | `.github/GITHUB_SECRETS_REQUIRED.md` and two CLAUDE.md lines describe a setup that no longer exists | Task 18 |
| F25 | Local `eslint .` scans `.worktrees/` (482 phantom findings) | Task 4 |

**Execution order:** Task 0 → Tasks 1–5 (PR 1) → B1, B2 → Tasks 6–13 (PR 2) → B3, B4 → Tasks 14–20 (PR 3) → B5–B9 → Phase C.

---

## Phase A, PR 1: clear the open alerts

### Task 0: Worktree and baseline

**Files:**
- Create: worktree at `.worktrees/github-hardening` (branch `chore/clear-open-security-alerts` from `origin/main`)
- Copy: `planning/github-hardening-plan-2026-09-04.md` into the worktree

- [ ] **Step 1: Create the worktree from origin/main**

```bash
cd /Users/justinelrod/Projects/Weather-application
git fetch origin
git worktree add .worktrees/github-hardening -b chore/clear-open-security-alerts origin/main
cp planning/github-hardening-plan-2026-09-04.md .worktrees/github-hardening/planning/
cd .worktrees/github-hardening
git log --oneline -1
```

Expected: the printed commit is the tip of `origin/main` (not `8b7757c`, which is the stale local main).

- [ ] **Step 2: Install and prove the baseline is green**

```bash
npm ci
npm test -- nws-parameters
```

Expected: `npm ci` completes with no errors; Jest reports 3 passed in `__tests__/nws-parameters.test.ts`.

- [ ] **Step 3: Commit the plan file**

```bash
git add planning/github-hardening-plan-2026-09-04.md
git commit -m "planning: GitHub hardening plan from the 2026-09-04 audit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 1: Fix the hail/wind regexes (CodeQL 308, 309)

**Files:**
- Modify: `lib/warnings/nws-parameters.ts:36` and `:43`
- Test: `__tests__/nws-parameters.test.ts`

**Interfaces:**
- Consumes: `parseNwsHazardParameters(parameters, description)` from `@/lib/warnings/nws-parameters` (existing; returns `{ maxHail, maxWind, source, damageThreat }`).
- Produces: no signature change.

Why this is more than cosmetic: the class `[0-9.]+` also eats the `...` separator NWS uses, so `MAX HAIL SIZE...1.75 IN` currently parses as `...1.75 IN` and renders with the dots. Verified with Node on 2026-09-04.

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('parseNwsHazardParameters', ...)` block in `__tests__/nws-parameters.test.ts`, after the `falls back to HAZARD / SOURCE tags` test:

```ts
  it('reads MAX HAIL SIZE / MAX WIND GUST lines without leaking the leading dots', () => {
    const description = [
      'HAIL THREAT...RADAR INDICATED',
      'MAX HAIL SIZE...1.75 IN',
      'WIND THREAT...RADAR INDICATED',
      'MAX WIND GUST...70 MPH',
    ].join('\n')

    expect(parseNwsHazardParameters(null, description)).toMatchObject({
      maxHail: '1.75 IN',
      maxWind: '70 MPH',
    })
  })
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npm test -- nws-parameters
```

Expected: 1 failed, 3 passed. The failure shows `maxHail` received `"...1.75 IN"` and `maxWind` received `"...70 MPH"`.

- [ ] **Step 3: Fix both regexes**

In `lib/warnings/nws-parameters.ts` replace line 36:

```ts
      /MAX HAIL SIZE[.\s.]*?([0-9.]+\s*(?:IN|INCHES)?)/i,
```

with

```ts
      /MAX HAIL SIZE[.\s]*?(\d+(?:\.\d+)?\s*(?:IN|INCHES)?)/i,
```

and replace line 43:

```ts
      /MAX WIND GUST[.\s.]*?([0-9.]+\s*(?:MPH)?)/i,
```

with

```ts
      /MAX WIND GUST[.\s]*?(\d+(?:\.\d+)?\s*(?:MPH)?)/i,
```

Leave the two `HAZARD\.{3}` patterns on lines 37 and 44 alone; `\.{3}` consumes the separator there, so they are not affected.

> **Amendment, 2026-09-05 (superseded by the fix in PR #595).** The two
> replacements above shipped in PR #594 and are no longer what the file
> contains. CodeRabbit's review of #594 pointed out that they reject the
> sub-severe tag values NWS writes as a "less than" bound with no leading
> zero (`<.75 IN`, `<50 MPH`), leaving `maxHail`/`maxWind` null. The shipped
> patterns are now
> `/MAX HAIL SIZE[.\s]*(<?\s*(?:\d+(?:\.\d+)?|\.\d+)\s*(?:IN|INCHES)?)/i` and
> `/MAX WIND GUST[.\s]*(<?\s*(?:\d+(?:\.\d+)?|\.\d+)\s*(?:MPH)?)/i`. Note the
> greedy `[.\s]*`: with the lazy `*?` above, the leading-decimal alternative
> lets the number claim a separator dot and `...1.75 IN` captures as `.1`.
> Copy the patterns from `lib/warnings/nws-parameters.ts`, not from this task.

- [ ] **Step 4: Run the test and watch it pass**

```bash
npm test -- nws-parameters
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/warnings/nws-parameters.ts __tests__/nws-parameters.test.ts
git commit -m "Stop NWS hail and wind values from carrying the ... separator into the UI

The MAX HAIL SIZE and MAX WIND GUST fallbacks used [0-9.]+ for the number,
which also matches the three-dot separator, so 'MAX HAIL SIZE...1.75 IN'
parsed as '...1.75 IN'. Match a real decimal instead, and drop the duplicate
'.' in the preceding character class that CodeQL flagged (alerts 308, 309).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Remove the two unused symbols (CodeQL 310, 311)

**Files:**
- Modify: `components/dashboard/add-location-modal.tsx:4`
- Modify: `app/blog/[slug]/blog-article.tsx:10`, `:24`, `:70`
- Test: `__tests__/security-audit-fixes.test.ts` (existing; exercises these components)

- [ ] **Step 1: Drop the unused `X` import**

In `components/dashboard/add-location-modal.tsx` change line 4 from

```ts
import { X, MapPin, Search, Plus, Star } from 'lucide-react'
```

to

```ts
import { MapPin, Search, Plus, Star } from 'lucide-react'
```

`X` has no other reference in the file (checked with `grep -n '\bX\b'`).

- [ ] **Step 2: Drop `themeClasses` and its now-unused import**

In `app/blog/[slug]/blog-article.tsx`:

1. Delete line 10: `import { themeTokens } from '@/lib/theme-tokens'` (its only use was line 24).
2. Delete line 24: `  const themeClasses = themeTokens.card` and the blank line that follows it, so `const shareConfig = {` directly follows the function's opening line.
3. The comment near line 70 mentions the deleted variable in prose. Change

```tsx
        {/* Title — text-primary, not themeClasses.accentText: accentText maps
```

to

```tsx
        {/* Title — text-primary, not themeTokens.card.accentText: accentText maps
```

- [ ] **Step 3: Verify with the gates that cover these files**

```bash
npm run lint
npm run typecheck
npm test -- security-audit-fixes
```

Expected: lint exits 0, typecheck exits 0, the test file passes with the same count as before.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/add-location-modal.tsx 'app/blog/[slug]/blog-article.tsx'
git commit -m "Remove an unused icon import and an unused theme token lookup

CodeQL alerts 310 and 311. Neither symbol was referenced; ESLint did not
catch them because no-unused-vars is not enabled (fixed separately).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Bump `@humanfs/node` (Dependabot 124)

**Files:**
- Modify: `package-lock.json` (only)

- [ ] **Step 1: Confirm the current vulnerable version**

```bash
npm ls @humanfs/node
```

Expected: `eslint@10.x` → `@humanfs/node@0.16.7`.

- [ ] **Step 2: Update within eslint's declared range**

```bash
npm update @humanfs/node
npm ls @humanfs/node
git diff --stat
```

Expected: `@humanfs/node@0.16.8`; the diff touches only `package-lock.json`.

- [ ] **Step 3: Confirm the advisory is gone**

```bash
npm audit 2>&1 | grep -c humanfs
```

Expected: `0`. (The remaining audit entries are the Lighthouse CLI chain, already dismissed on GitHub as tolerable risk; they are out of scope.)

- [ ] **Step 4: Commit**

```bash
git add package-lock.json
git commit -m "chore(deps): bump @humanfs/node to 0.16.8 for GHSA-p498-v437-472g

Dev-only transitive dependency of eslint. Closes Dependabot alert 124.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: Make ESLint report unused symbols; stop linting `.worktrees/`

**Files:**
- Modify: `eslint.config.mjs` (the `ignores` array and the `**/*.{ts,tsx}` rules block)

Rationale: F3 and F4 slipped through because the rule is not on. Turning it on at `error` today would fail lint with roughly 90 pre-existing hits across `app/`, `components/`, `lib/`, `hooks/`, and tests (measured 2026-09-04). Land it at `warn` now so new code is flagged in editors and CI logs; a follow-up PR burns the list down and flips it to `error` (see Follow-ups).

- [ ] **Step 1: Add `.worktrees/**` to the ignore list**

In `eslint.config.mjs`, change

```js
        ignores: [
            'node_modules/**',
            '.next/**',
            'playwright-report/**',
            'test-results/**',
            '_archive/**',
            'scripts/**',
        ],
```

to

```js
        ignores: [
            'node_modules/**',
            '.next/**',
            '.worktrees/**',
            'playwright-report/**',
            'test-results/**',
            '_archive/**',
            'scripts/**',
        ],
```

- [ ] **Step 2: Enable the rule at warn**

In the block that starts `files: ['**/*.{ts,tsx}']` (the one that registers `@typescript-eslint` and sets `consistent-type-imports`), add a second rule so the `rules` object reads:

```js
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
            // Warn (not error) until the ~90 pre-existing hits are cleared; then
            // flip to 'error'. Underscore-prefixed names are the documented
            // opt-out for intentionally unused parameters and destructures.
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrors: 'none',
                    ignoreRestSiblings: true,
                },
            ],
        },
```

- [ ] **Step 3: Verify lint still passes and the two Task 2 files are clean**

```bash
npm run lint; echo "exit=$?"
npx eslint components/dashboard/add-location-modal.tsx 'app/blog/[slug]/blog-article.tsx'
```

Expected: `exit=0` with a non-zero warning count in the summary line (record the number in the PR body); the second command prints nothing.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "Warn on unused variables and imports; ignore .worktrees in local lint

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: Open and merge PR 1

- [ ] **Step 1: Run every CI gate locally**

```bash
npm run lint && npm run typecheck && npm run typecheck:tests && npm test && npm run knip
```

Expected: all exit 0.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin chore/clear-open-security-alerts
gh pr create --base main --title "Clear the open CodeQL and Dependabot alerts" --body "$(cat <<'EOF'
## What changed

- `lib/warnings/nws-parameters.ts`: the MAX HAIL SIZE / MAX WIND GUST fallback regexes no longer swallow the `...` separator (CodeQL 308, 309). New test pins `1.75 IN` / `70 MPH`.
- Removed an unused `X` icon import and an unused `themeClasses` lookup (CodeQL 310, 311).
- `package-lock.json`: `@humanfs/node` 0.16.7 -> 0.16.8 (Dependabot 124, GHSA-p498-v437-472g, dev-only via eslint).
- `eslint.config.mjs`: `@typescript-eslint/no-unused-vars` at `warn` with underscore opt-outs; `.worktrees/**` ignored.
- `planning/github-hardening-plan-2026-09-04.md`: the plan this PR is the first step of.

## Why

Six open security alerts from the 2026-09-04 audit. The regex fix is a real user-visible bug, not only a lint nit: hail and wind values in warning cards rendered as `...1.75 IN`.

## Tests run

- `npm run lint`, `npm run typecheck`, `npm run typecheck:tests`, `npm test`, `npm run knip` all green locally.
- `npm test -- nws-parameters`: 4 passed (1 new).
- `npm run lint` now reports N warnings from the new rule (replace N with the count from Task 4).

## Risks / follow-ups

- The unused-vars rule is `warn`, so nothing fails yet. A follow-up PR clears the existing warnings and flips it to `error`.
- CodeQL 314 (`scripts/education/publish.ts`) is a false positive and is dismissed separately via the API, not in this PR.

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for checks, then merge**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
```

Expected: all 11 checks green before merge (CI x6, E2E Chromium, Lighthouse, Secret Scanning, CodeQL Analysis, Dependency Review).

- [ ] **Step 4: Confirm the alerts closed on main**

Wait for the `Security Scanning` push run on `main` to finish, then:

```bash
R=jelrod27/Weather-application-
gh run list -R $R --workflow=security-scanning.yml --branch main --limit 1
gh api "repos/$R/code-scanning/alerts?state=open" --jq '.[] | "\(.number) \(.rule.id)"'
gh api "repos/$R/dependabot/alerts?state=open" --jq length
```

Expected: only alert `314 js/http-to-file-access` remains open; Dependabot open count is `0`. (Dependabot re-evaluates on the push; allow a few minutes.)

---

## Phase A, PR 2: harden the workflows

### Task 6: Start the second branch

- [ ] **Step 1: Branch from the merged main**

```bash
cd /Users/justinelrod/Projects/Weather-application/.worktrees/github-hardening
git fetch origin
git checkout -b chore/harden-workflows origin/main
npm ci
git log --oneline -1
```

Expected: the tip commit is PR 1's squash commit.

### Task 7: Pin every action to a commit SHA

**Files:**
- Modify: all nine files in `.github/workflows/`

**SHA table** (resolved 2026-09-04 from each repository's newest tag on the current major; majors are kept, Dependabot will propose major bumps after Task 12):

| Action | Tag | Commit SHA |
|---|---|---|
| `actions/checkout` | v4.4.0 | `11d5960a326750d5838078e36cf38b85af677262` |
| `actions/setup-node` | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `actions/cache` | v4.3.0 | `0057852bfaa89a56745cba8c7296529d2fc39830` |
| `actions/upload-artifact` | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| `github/codeql-action/init` and `/analyze` | v3.37.9 | `6f5948dfacef28e207b48d0905cf90c03365536d` |
| `actions/dependency-review-action` | v4.9.0 | `2031cfc080254a8a887f58cffee85186f0e49e48` |
| `gitleaks/gitleaks-action` | v2.3.9 | `ff98106e4c7b2bc287b24eaf42907196329070c7` |

- [ ] **Step 1: Re-verify each SHA still resolves to its tag** (tags can move; commits cannot)

```bash
for pair in actions/checkout:v4.4.0 actions/setup-node:v4.4.0 actions/cache:v4.3.0 actions/upload-artifact:v4.6.2 github/codeql-action:v3.37.9 actions/dependency-review-action:v4.9.0 gitleaks/gitleaks-action:v2.3.9; do
  repo=${pair%%:*}; tag=${pair##*:}
  obj=$(gh api "repos/$repo/git/ref/tags/$tag" --jq '.object')
  read -r objsha objtype <<< "$(echo "$obj" | python3 -c 'import json,sys; o=json.load(sys.stdin); print(o["sha"], o["type"])')"
  if [ "$objtype" = tag ]; then sha=$(gh api "repos/$repo/git/tags/$objsha" --jq .object.sha); else sha=$objsha; fi
  echo "$repo $tag $sha"
done
```

Expected: the printed SHA for each line equals the table above. If any differs, use the printed value in Step 2 and update the table.

- [ ] **Step 2: Rewrite the `uses:` lines**

```bash
perl -pi -e '
  s{actions/checkout\@v4\b}{actions/checkout\@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0}g;
  s{actions/setup-node\@v4\b}{actions/setup-node\@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0}g;
  s{actions/cache\@v4\b}{actions/cache\@0057852bfaa89a56745cba8c7296529d2fc39830 # v4.3.0}g;
  s{actions/upload-artifact\@v4\b}{actions/upload-artifact\@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2}g;
  s{github/codeql-action/init\@v3\b}{github/codeql-action/init\@6f5948dfacef28e207b48d0905cf90c03365536d # v3.37.9}g;
  s{github/codeql-action/analyze\@v3\b}{github/codeql-action/analyze\@6f5948dfacef28e207b48d0905cf90c03365536d # v3.37.9}g;
  s{actions/dependency-review-action\@v4\b}{actions/dependency-review-action\@2031cfc080254a8a887f58cffee85186f0e49e48 # v4.9.0}g;
  s{gitleaks/gitleaks-action\@v2\b}{gitleaks/gitleaks-action\@ff98106e4c7b2bc287b24eaf42907196329070c7 # v2.3.9}g;
' .github/workflows/*.yml
```

- [ ] **Step 3: Verify nothing is left on a tag**

```bash
grep -n 'uses:' .github/workflows/*.yml | grep -v -E '@[0-9a-f]{40} # v'
```

Expected: no output. Then `grep -c 'uses:' .github/workflows/*.yml` should show the same per-file counts as before the edit (checkout appears in every file).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows
git commit -m "Pin every GitHub Action to a commit SHA

Mutable tags let a compromised upstream tag run arbitrary code with our
workflow token. Majors are unchanged; Dependabot (github-actions ecosystem,
added in this PR) will propose upgrades and keep the pins fresh.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: Declare read-only permissions in the four unscoped workflows

**Files:**
- Modify: `.github/workflows/ci.yml`, `e2e-pr.yml`, `e2e-preview.yml`, `lighthouse-pr.yml`

These four rely on the repository default (currently `read`). Declaring it in-file keeps them safe if the default is ever widened. The other five workflows already set job-level `permissions:`.

- [ ] **Step 1: Insert the block before `concurrency:` in each file**

```bash
for f in ci.yml e2e-pr.yml e2e-preview.yml lighthouse-pr.yml; do
  perl -0pi -e 's/\nconcurrency:/\npermissions:\n  contents: read\n\nconcurrency:/' ".github/workflows/$f"
done
grep -n -A1 '^permissions:' .github/workflows/{ci,e2e-pr,e2e-preview,lighthouse-pr}.yml
```

Expected: each of the four files shows `permissions:` followed by `  contents: read`, exactly once.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows
git commit -m "Declare contents:read in the workflows that relied on the repo default

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: Stop interpolating event fields into shell in `e2e-preview.yml`

**Files:**
- Modify: `.github/workflows/e2e-preview.yml` (the `Debug deployment info` and `Validate preview URL` steps)

- [ ] **Step 1: Replace the two steps**

Replace

```yaml
      - name: Debug deployment info
        run: |
          echo "🔍 Deployment Status Event:"
          echo "  Environment: ${{ github.event.deployment_status.environment }}"
          echo "  State: ${{ github.event.deployment_status.state }}"
          echo "  Target URL: ${{ github.event.deployment_status.target_url }}"
          echo "  Environment URL: ${{ github.event.deployment_status.environment_url }}"
          echo "  Using: ${{ env.PREVIEW_URL }}"

      - name: Validate preview URL
        run: |
          if [ -z "${{ env.PREVIEW_URL }}" ]; then
            echo "❌ Error: No preview URL found in deployment_status event"
            exit 1
          fi
          echo "✅ Preview URL: ${{ env.PREVIEW_URL }}"
```

with

```yaml
      # Event fields go through env, never straight into the script: a value
      # containing shell metacharacters would otherwise execute. Only Vercel
      # posts these events today, but the pattern should not depend on that.
      - name: Debug deployment info
        env:
          DEPLOY_ENVIRONMENT: ${{ github.event.deployment_status.environment }}
          DEPLOY_STATE: ${{ github.event.deployment_status.state }}
          DEPLOY_TARGET_URL: ${{ github.event.deployment_status.target_url }}
          DEPLOY_ENVIRONMENT_URL: ${{ github.event.deployment_status.environment_url }}
        run: |
          echo "Deployment status event:"
          echo "  Environment: $DEPLOY_ENVIRONMENT"
          echo "  State: $DEPLOY_STATE"
          echo "  Target URL: $DEPLOY_TARGET_URL"
          echo "  Environment URL: $DEPLOY_ENVIRONMENT_URL"
          echo "  Using: $PREVIEW_URL"

      - name: Validate preview URL
        run: |
          if [ -z "$PREVIEW_URL" ]; then
            echo "::error::No preview URL found in deployment_status event"
            exit 1
          fi
          echo "Preview URL: $PREVIEW_URL"
```

`PREVIEW_URL` is already a job-level `env:` entry, so it is available as `$PREVIEW_URL` without re-declaring it.

- [ ] **Step 2: Verify no `${{ github.event` remains inside a `run:` block**

```bash
grep -n 'run:' -A8 .github/workflows/e2e-preview.yml | grep -c 'github.event'
```

Expected: `0`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/e2e-preview.yml
git commit -m "Pass deployment_status fields through env instead of into the shell script

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 10: Keep the token out of `.git/config` in the newsletter workflows

**Files:**
- Modify: `.github/workflows/newsletter-sunday.yml`, `.github/workflows/newsletter-wednesday.yml`

`education-guide.yml` already does this (checkout with `persist-credentials: false`, then `gh auth setup-git` immediately before the push) and its last four runs succeeded. Mirror it exactly.

- [ ] **Step 1: Change the checkout step in both files**

Replace

```yaml
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
```

(the first step under `steps:`) with

```yaml
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          # This job holds contents:write and pull-requests:write and runs
          # npm ci before it pushes. Left at the default, checkout writes
          # GITHUB_TOKEN into .git/config, where a dependency's install script
          # could read it. Git is authenticated explicitly at the push instead.
          persist-credentials: false
```

- [ ] **Step 2: Authenticate right before the push in both files**

In the `Open PR with the new post` step, after the `BRANCH_NAME=...` line and before `git config user.name "16bitbot"`, insert:

```bash
          # checkout ran with persist-credentials: false, so the push needs
          # credentials of its own. Scoped to this step rather than the job.
          gh auth setup-git

```

`GH_TOKEN` is already in that step's `env:`.

- [ ] **Step 3: Verify both files parse and match education-guide's pattern**

```bash
for f in newsletter-sunday newsletter-wednesday education-guide; do
  echo "== $f"; grep -n 'persist-credentials\|gh auth setup-git' ".github/workflows/$f.yml"
done
python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]; print('all workflows parse')"
```

Expected: each of the three files shows one `persist-credentials: false` and one `gh auth setup-git`; the Python line prints `all workflows parse` (if `yaml` is missing, `pip3 install pyyaml` or skip; CI will reject a malformed file before anything runs).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/newsletter-sunday.yml .github/workflows/newsletter-wednesday.yml
git commit -m "Newsletter workflows: do not persist GITHUB_TOKEN across npm ci

Matches education-guide.yml, which already checks out with
persist-credentials: false and authenticates with gh auth setup-git at
the push.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 11: Scan workflow files with CodeQL

**Files:**
- Modify: `.github/workflows/security-scanning.yml` (the `analyze` job's matrix and category)

- [ ] **Step 1: Add the `actions` language and make the category follow the matrix**

Change

```yaml
      matrix:
        language: [ 'javascript-typescript' ]
```

to

```yaml
      matrix:
        language: [ 'javascript-typescript', 'actions' ]
```

and change

```yaml
      with:
        # Keep category stable across branches so code scanning can compare against main
        category: /language:javascript-typescript
```

to

```yaml
      with:
        # Keep category stable across branches so code scanning can compare
        # against main. It must also be unique per matrix leg, so derive it
        # from the language: the javascript-typescript value is unchanged.
        category: /language:${{ matrix.language }}
```

The resulting check names are `CodeQL Analysis (javascript-typescript)` (unchanged) and `CodeQL Analysis (actions)` (new). B4 requires both.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/security-scanning.yml
git commit -m "Run CodeQL's actions queries over the workflow files

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 12: Let Dependabot maintain the action pins

**Files:**
- Modify: `.github/dependabot.yml`

- [ ] **Step 1: Append the github-actions ecosystem**

Make the file read:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 5
    groups:
      # Group non-security updates together
      dependencies:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  # Actions are pinned to commit SHAs (see .github/workflows). Dependabot
  # updates the SHA and the trailing "# vX.Y.Z" comment together.
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      actions:
        patterns:
          - "*"
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "Dependabot: watch GitHub Actions pins weekly

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 13: Open and merge PR 2

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin chore/harden-workflows
gh pr create --base main --title "Pin actions to SHAs, scope workflow tokens, and scan workflows with CodeQL" --body "$(cat <<'EOF'
## What changed

- Every `uses:` in `.github/workflows/` is pinned to a full commit SHA with a `# vX.Y.Z` comment (majors unchanged).
- `ci.yml`, `e2e-pr.yml`, `e2e-preview.yml`, `lighthouse-pr.yml` declare `permissions: contents: read` instead of relying on the repo default.
- `e2e-preview.yml` passes `deployment_status` fields through `env:` rather than interpolating them into shell.
- `newsletter-sunday.yml` / `newsletter-wednesday.yml` check out with `persist-credentials: false` and run `gh auth setup-git` at the push, matching `education-guide.yml`.
- `security-scanning.yml` adds the `actions` CodeQL language; the category is now `/language:${{ matrix.language }}` (unchanged string for JS/TS).
- `dependabot.yml` gains a weekly `github-actions` ecosystem so the pins stay current.

## Why

Findings F8, F9, F19, F20, F21, F22 from the 2026-09-04 audit (see `planning/github-hardening-plan-2026-09-04.md`). After this merges, the repo-level "require SHA pinning" and "selected actions only" policies can be turned on without breaking anything.

## Tests run

- All PR workflows on this branch (CI, E2E Chromium, Lighthouse, Secret Scanning, CodeQL x2, Dependency Review).
- Artifact uploads in E2E and Lighthouse still succeed under `contents: read` (verify in the run logs before merging).

## Risks / follow-ups

- The newsletter push path (`gh auth setup-git`) is exercised only on the next scheduled run that produces a post (Sunday 12:00 UTC / Wednesday 12:00 UTC). If it fails, the run fails visibly; revert Task 10's commit.
- New check name `CodeQL Analysis (actions)` appears; it becomes a required check in a follow-up settings change.

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Confirm the pinned actions and artifact uploads work, then merge**

```bash
gh pr checks --watch
gh run list --workflow=e2e-pr.yml --branch chore/harden-workflows --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run view {} --log | grep -E 'Upload Playwright (report|test results)' | grep -c 'Artifact .* successfully finalized'
gh pr merge --squash --delete-branch
```

Expected: all checks green, including two CodeQL legs; the grep prints `2` (both uploads finalized). If the log wording differs from `successfully finalized`, open the E2E run in the browser and confirm both "Upload Playwright ..." steps are green before merging.

- [ ] **Step 3: Confirm the new CodeQL check ran on main**

```bash
R=jelrod27/Weather-application-
sha=$(gh api repos/$R/commits/main --jq .sha)
gh api "repos/$R/commits/$sha/check-runs" --jq '.check_runs[] | select(.name|startswith("CodeQL Analysis")) | "\(.name) \(.conclusion)"'
```

Expected: both `CodeQL Analysis (javascript-typescript) success` and `CodeQL Analysis (actions) success`. (Wait for the push-triggered run to finish first.)

---

## Phase A, PR 3: repo hygiene

### Task 14: Start the third branch

- [ ] **Step 1: Branch from the merged main**

```bash
cd /Users/justinelrod/Projects/Weather-application/.worktrees/github-hardening
git fetch origin
git checkout -b chore/repo-hygiene origin/main
npm ci
```

### Task 15: Pin Node 22 everywhere

**Files:**
- Create: `.nvmrc`
- Modify: `package.json` (add `engines` after `"private": true,`)
- Modify: all nine `.github/workflows/*.yml` (`node-version: '20'` → `node-version-file: '.nvmrc'`)
- Modify: `CLAUDE.md:51`

The Vercel project (`weather-application`, team `justin-elrods-projects`) runs `nodeVersion: 22.x`; local dev is on 22.22.3; CI was the odd one out on 20.

- [ ] **Step 1: Add `.nvmrc` and `engines`**

```bash
printf '22\n' > .nvmrc
```

In `package.json`, directly after the line `  "private": true,` insert:

```json
  "engines": {
    "node": ">=22"
  },
```

- [ ] **Step 2: Point every workflow at `.nvmrc`**

```bash
perl -pi -e "s/node-version: '20'/node-version-file: '.nvmrc'/g" .github/workflows/*.yml
grep -rn 'node-version' .github/workflows | grep -v "node-version-file: '.nvmrc'"
```

Expected: the grep prints nothing.

- [ ] **Step 3: Update the CLAUDE.md line**

Line 51 of `CLAUDE.md` currently reads:

```
`npm` only — do not switch package managers. Node 20.9+.
```

Change it to:

```
`npm` only — do not switch package managers. Node 22 (`.nvmrc`; matches the Vercel project's 22.x. Next.js 16's floor is 20.9).
```

(The main checkout has uncommitted local edits to `CLAUDE.md`; this one-line change is in a different section and will merge cleanly when the user pulls.)

- [ ] **Step 4: Verify locally**

```bash
node -v
npm ci
npm run typecheck
```

Expected: `v22.x`; `npm ci` prints no `EBADENGINE` warning; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add .nvmrc package.json .github/workflows CLAUDE.md
git commit -m "Pin Node 22 in .nvmrc, package.json engines, and every workflow

Vercel builds on 22.x and local dev is on 22; CI was still on 20.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 16: Point stale owner links at the current account

**Files:**
- Modify: the 37 tracked files outside `_archive/` and `releases/` that contain `github.com/deephouse23` (LICENSE, LICENSE_HEADER.txt, `app/about/page.tsx`, `public/llms.txt`, `scripts/add-license-headers.js`, and 32 source files carrying the license header)

`deephouse23` and `jelrod27` are the same GitHub user id (31932854) after a rename; GitHub redirects, so this is hygiene rather than breakage.

- [ ] **Step 1: Rewrite the URLs**

```bash
git grep -l 'github.com/deephouse23' -- . ':(exclude)_archive' ':(exclude)releases' \
  | xargs perl -pi -e 's{github\.com/deephouse23}{github.com/jelrod27}g'
git grep -n 'deephouse23' -- . ':(exclude)_archive' ':(exclude)releases'
git diff --stat | tail -1
```

Expected: the second grep prints nothing; the stat line reports 37 files changed.

- [ ] **Step 2: Verify the only behavioural change (the About page href)**

```bash
grep -n 'github.com/jelrod27' app/about/page.tsx
npm run lint && npm run typecheck
```

Expected: one href line; both gates exit 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Replace the pre-rename deephouse23 GitHub URLs with jelrod27

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 17: Fix the CSP comment and drop the deprecated XSS header

**Files:**
- Modify: `next.config.mjs:41-44` (comment) and the `X-XSS-Protection` entry inside `headers()`

No test or Lighthouse assertion references `X-XSS-Protection` (checked with `git grep` on 2026-09-04). Browsers ignore the header; OWASP recommends omitting it.

- [ ] **Step 1: Reword the comment**

Replace

```js
  // Add headers for better caching and security.
  // NOTE: Content-Security-Policy is set per-request in middleware.ts so we can
  // use a fresh nonce for script-src in production. Do NOT duplicate CSP
  // here — a static CSP would collide with the nonce CSP.
```

with

```js
  // Add headers for better caching and security.
  // NOTE: Content-Security-Policy is set per-request in middleware.ts
  // (buildCspHeader) so production and development can differ. Do NOT add a
  // CSP here: two CSP headers are enforced as their intersection, so a static
  // one would silently tighten the middleware policy.
```

- [ ] **Step 2: Remove the header entry**

Delete these four lines from the `'/:path*'` headers array:

```js
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
```

- [ ] **Step 3: Verify the config still loads**

```bash
node --input-type=module -e "import('./next.config.mjs').then(async m => { const h = await m.default.headers(); console.log(h[0].headers.map(x => x.key).join(', ')) })"
```

Expected: `X-DNS-Prefetch-Control, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy` (no XSS entry). If the import fails because the config pulls in a bundler-only module, fall back to `npm run build` in Task 20 as the check.

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "next.config: describe the middleware CSP accurately; drop X-XSS-Protection

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 18: Rewrite the stale secrets doc and the CI list in CLAUDE.md

**Files:**
- Modify: `.github/GITHUB_SECRETS_REQUIRED.md` (replace entire contents)
- Modify: `CLAUDE.md` CI section (add `education-guide.yml`)

- [ ] **Step 1: Replace `.github/GITHUB_SECRETS_REQUIRED.md`**

```markdown
# GitHub Actions secrets and variables

This is the complete list of what the workflows in `.github/workflows/` read.
Anything not listed here is unused and should be deleted rather than kept
"just in case". Deployment is handled by Vercel's Git integration, so no
workflow needs a Vercel token, org id, or project id.

## Repository secrets

| Name | Used by | Purpose |
| --- | --- | --- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | `e2e-preview.yml` | Lets Playwright reach a protected Vercel preview deployment. Value comes from Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation. |

## `Production` environment secrets

The newsletter and education workflows bind to `environment: production`
only to read this secret. The environment is restricted to protected
branches, so a `workflow_dispatch` from a feature branch cannot use it.

| Name | Used by | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `newsletter-sunday.yml`, `newsletter-wednesday.yml`, `education-guide.yml` | Model calls for generated posts and guides. |

## Repository variables (optional)

| Name | Default if unset | Used by |
| --- | --- | --- |
| `NEWSLETTER_MODEL` | `claude-sonnet-4-6` | newsletter workflows |
| `EDUCATION_MODEL` | `claude-opus-5` | `education-guide.yml` |
| `EDUCATION_EFFORT` | `medium` | `education-guide.yml` |

## What CI does *not* need

- Supabase keys: `ci.yml`, `e2e-pr.yml`, and `lighthouse-pr.yml` build with
  placeholder `NEXT_PUBLIC_SUPABASE_*` values set in the workflow file.
- Weather API keys: Open-Meteo needs none. Google Pollen and other optional
  keys are Vercel runtime env vars, not CI secrets.
- `KERNEL_API_KEY`: opt-in legacy mode for Playwright (see `playwright.config.ts`);
  no workflow sets it.

## Vercel environment variables that CI depends on

`NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=true` on Preview deployments so
`e2e-preview.yml` can bypass auth via the test header (see
`lib/playwright-test-mode.ts`; the bypass is refused when `NODE_ENV` is
`production`).
```

- [ ] **Step 2: Add the education workflow to CLAUDE.md's CI list**

In the `## CI` section, after the bullet that begins ``- `news-feed-health.yml` (Mondays)``, add:

```
- `education-guide.yml` — `workflow_dispatch` only; drafts one Entry Guide and
  opens a PR (see "Education" above). Reads `ANTHROPIC_API_KEY` from the
  `Production` environment, like the newsletter jobs.
```

- [ ] **Step 3: Commit**

```bash
git add .github/GITHUB_SECRETS_REQUIRED.md CLAUDE.md
git commit -m "Document the secrets the workflows actually use

The old list named Vercel deploy tokens, OpenWeather, and a service-role key
that no workflow reads. This is the end state after the unused secrets are
deleted.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 19: Add the community files

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: PR template**

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## What changed

## Why

## Tests run

- [ ] `npm run lint`
- [ ] `npm run typecheck && npm run typecheck:tests`
- [ ] `npm test`
- [ ] `npm run knip`
- [ ] E2E / Lighthouse locally (only if pages or API routes changed)

## Risks / follow-ups
```

- [ ] **Step 2: Issue templates**

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: true
contact_links:
  - name: Report a security vulnerability
    url: https://github.com/jelrod27/Weather-application-/security/advisories/new
    about: Do not open a public issue for security problems. Open a private advisory or email security@16bitweather.co.
  - name: Ask a question or share an idea
    url: https://github.com/jelrod27/Weather-application-/discussions
    about: Questions and open-ended ideas go in Discussions.
```

`.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug report
description: Something on 16bitweather.co is broken or wrong.
labels: [bug]
body:
  - type: input
    id: url
    attributes:
      label: Page URL
      placeholder: https://www.16bitweather.co/...
    validations:
      required: true
  - type: textarea
    id: what
    attributes:
      label: What happened?
      description: What you saw, and what you expected instead.
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      placeholder: |
        1. Go to ...
        2. Click ...
  - type: input
    id: env
    attributes:
      label: Browser and device
      placeholder: Safari 18 on iPhone 15; Chrome 130 on macOS
```

`.github/ISSUE_TEMPLATE/feature_request.yml`:

```yaml
name: Feature request
description: Suggest a tool, page, or data source.
labels: [enhancement]
body:
  - type: textarea
    id: problem
    attributes:
      label: What would this help you do?
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposed change
  - type: input
    id: source
    attributes:
      label: Data source (if any)
      description: Link to the public API or dataset the feature would use.
```

- [ ] **Step 3: CONTRIBUTING.md** (repository root)

```markdown
# Contributing

16-Bit Weather is a solo-maintained project. Issues and pull requests are
welcome. For anything larger than a small fix, open an issue first so the
direction can be agreed before you spend time on it.

## Setup

- Node 22 (`.nvmrc`), `npm` only.
- `npm ci`, then copy `.env.example` to `.env.local` and fill in the Supabase
  values (see `CLAUDE.md`, "Environment Variables").
- `npm run dev` serves http://localhost:3000.
- Install `gitleaks`: the pre-commit and pre-push hooks scan for secrets and
  hard-fail without it.

## Before opening a pull request

Run the gates CI runs:

    npm run lint
    npm run typecheck && npm run typecheck:tests
    npm test
    npm run knip

Playwright E2E (`npm run test:e2e`) and Lighthouse (`npm run lighthouse`) run
on every PR; run them locally if you touched pages or API routes.

## Conventions

Read `CODING.md` before changing code. In short: strict TypeScript, `import
type` for type-only imports, API routes wrapped with `withApiRoute`, and no
`NEXT_PUBLIC_` prefix on anything secret.

## Security

Do not open public issues for vulnerabilities. See `SECURITY.md`.

## License

Contributions are accepted under the Fair Source License 0.9 in `LICENSE`.
```

- [ ] **Step 4: Verify the YAML parses and knip is unaffected**

```bash
python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/ISSUE_TEMPLATE/*.yml')]; print('templates parse')"
npm run knip
```

Expected: `templates parse`; knip exits 0.

- [ ] **Step 5: Commit**

```bash
git add .github/PULL_REQUEST_TEMPLATE.md .github/ISSUE_TEMPLATE CONTRIBUTING.md
git commit -m "Add PR and issue templates and a short CONTRIBUTING guide

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 20: Open and merge PR 3

- [ ] **Step 1: Run every gate, including build**

```bash
npm run lint && npm run typecheck && npm run typecheck:tests && npm test && npm run knip
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key NEXT_PUBLIC_BASE_URL=http://localhost:3000 npm run build
```

Expected: all exit 0.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin chore/repo-hygiene
gh pr create --base main --title "Pin Node 22, refresh stale owner links and docs, add community templates" --body "$(cat <<'EOF'
## What changed

- `.nvmrc` = 22, `engines.node >= 22`, all workflows use `node-version-file: '.nvmrc'` (Vercel already builds on 22.x).
- 37 files: `github.com/deephouse23` → `github.com/jelrod27` (same account, renamed). `_archive/` and `releases/` untouched.
- `next.config.mjs`: comment now describes the real middleware CSP (no nonce); `X-XSS-Protection` removed (deprecated, ignored by browsers).
- `.github/GITHUB_SECRETS_REQUIRED.md` rewritten to list only what workflows read; CLAUDE.md gains the education workflow in its CI list and the Node line.
- New: PR template, bug/feature issue forms with a security-advisory contact link, `CONTRIBUTING.md`.

## Why

Findings F15, F16, F18, F23, F24 from the 2026-09-04 audit (see `planning/github-hardening-plan-2026-09-04.md`).

## Tests run

- lint, typecheck (both projects), jest, knip, and a full `next build` locally.
- PR workflows on this branch.

## Risks / follow-ups

- CI now runs on Node 22. If any job regresses, the only change is the runtime; revert the `node-version-file` lines.
- The unused GitHub secrets the doc no longer lists are deleted in a separate settings step.

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Merge and clean up the worktree**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
cd /Users/justinelrod/Projects/Weather-application
git worktree remove .worktrees/github-hardening
git worktree prune
```

Expected: all checks green; `git worktree list` no longer shows `github-hardening`. (Do not run `npm test` from the main checkout while other worktrees exist under `.worktrees/`; Jest can pick up their tests.)

---

## Phase B: GitHub settings (one `gh api` call each; ask before each)

Run these from any directory. `R=jelrod27/Weather-application-`. Each step ends with a read-back; do not proceed while a read-back disagrees with "Expected".

### B1: Dismiss CodeQL 314 as a false positive (after PR 1)

- [ ] **Step 1: Dismiss with a written reason**

```bash
gh api -X PATCH "repos/$R/code-scanning/alerts/314" \
  -f state=dismissed \
  -f dismissed_reason='false positive' \
  -f dismissed_comment='Build-time generator, not a request path. The output path comes from the catalog slug via guideFilePath(), never from network input; the body is model output that has already passed checkBody() and the fact-check gate before reaching writeFileSync. Reviewed 2026-09-04.'
```

- [ ] **Step 2: Read back**

```bash
gh api "repos/$R/code-scanning/alerts?state=open" --jq length
```

Expected: `0`.

### B2: Turn on the two free secret-scanning features

- [ ] **Step 1: Enable non-provider patterns and validity checks**

```bash
gh api -X PATCH "repos/$R" --input - <<'JSON'
{"security_and_analysis":{"secret_scanning_non_provider_patterns":{"status":"enabled"},"secret_scanning_validity_checks":{"status":"enabled"}}}
JSON
```

- [ ] **Step 2: Read back**

```bash
gh api "repos/$R" --jq '.security_and_analysis | to_entries[] | "\(.key)=\(.value.status)"'
```

Expected: all five entries `enabled` (`secret_scanning`, `secret_scanning_push_protection`, `dependabot_security_updates`, `secret_scanning_non_provider_patterns`, `secret_scanning_validity_checks`).

### B3: Lock down the Actions policy (after PR 2 is merged)

Order matters inside this step: the workflow-token setting first (harmless), then "selected actions", then the allow-list, then SHA pinning last so nothing is ever blocked while unpinned.

- [ ] **Step 1: Stop Actions from approving pull requests**

```bash
gh api -X PUT "repos/$R/actions/permissions/workflow" --input - <<'JSON'
{"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}
JSON
```

- [ ] **Step 2: Restrict to selected actions and require SHA pinning**

```bash
gh api -X PUT "repos/$R/actions/permissions" --input - <<'JSON'
{"enabled":true,"allowed_actions":"selected","sha_pinning_required":true}
JSON
gh api -X PUT "repos/$R/actions/permissions/selected-actions" --input - <<'JSON'
{"github_owned_allowed":true,"verified_allowed":true,"patterns_allowed":["gitleaks/gitleaks-action@*"]}
JSON
```

If the first call rejects `sha_pinning_required`, send it without that field and flip the toggle in the UI: Settings → Actions → General → "Require actions to be pinned to a full-length commit SHA".

- [ ] **Step 3: Read back and prove the workflows still run**

```bash
gh api "repos/$R/actions/permissions"
gh api "repos/$R/actions/permissions/selected-actions"
gh api "repos/$R/actions/permissions/workflow"
gh workflow run ci.yml -R $R --ref main
gh workflow run security-scanning.yml -R $R --ref main
for w in ci.yml security-scanning.yml; do
  gh run list -R $R --workflow=$w --branch main --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId' | xargs gh run watch -R $R --exit-status
done
```

Expected: `allowed_actions: selected`, `sha_pinning_required: true`, `can_approve_pull_request_reviews: false`, the gitleaks pattern present; both `gh run watch` commands exit 0 (a non-zero exit means a pinned or non-allow-listed action was blocked: read the run log, fix the allow-list or the pin, re-run).

### B4: Require the security checks on `main` (after B3 and after `CodeQL Analysis (actions)` has succeeded on main)

**Decision for the user:** `enforce_admins: true` means you can no longer push straight to `main`; every change goes through a PR. Every commit on `main` in recent history is already a PR merge, so this matches practice. If you want to keep the escape hatch, change it to `false` before running.

- [ ] **Step 1: Write the full protection object**

```bash
gh api -X PUT "repos/$R/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "Build", "app_id": 15368},
      {"context": "E2E Chromium", "app_id": 15368},
      {"context": "Lighthouse Performance Gate", "app_id": 15368},
      {"context": "Secret Scanning", "app_id": 15368},
      {"context": "CodeQL Analysis (javascript-typescript)", "app_id": 15368},
      {"context": "CodeQL Analysis (actions)", "app_id": 15368},
      {"context": "Dependency Review", "app_id": 15368}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
```

`15368` is the GitHub Actions app id (already used by the existing E2E and Lighthouse entries).

- [ ] **Step 2: Read back**

```bash
gh api "repos/$R/branches/main/protection" --jq '{checks: (.required_status_checks.checks|map(.context)), strict: .required_status_checks.strict, admins: .enforce_admins.enabled, conversations: .required_conversation_resolution.enabled, force_push: .allow_force_pushes.enabled}'
```

Expected: seven contexts listed, `strict: true`, `admins: true`, `conversations: true`, `force_push: false`.

### B5: Restrict the Production environment to protected branches

- [ ] **Step 1: Set the deployment-branch policy**

```bash
gh api -X PUT "repos/$R/environments/Production" --input - <<'JSON'
{"deployment_branch_policy":{"protected_branches":true,"custom_branch_policies":false}}
JSON
```

- [ ] **Step 2: Read back and prove a main-branch dispatch still binds the environment**

```bash
gh api "repos/$R/environments/Production" --jq .deployment_branch_policy
gh workflow run education-guide.yml -R $R --ref main -f dry_run=true
gh run list -R $R --workflow=education-guide.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId' | xargs gh run watch -R $R --exit-status
```

Expected: `{"protected_branches":true,"custom_branch_policies":false}`; `gh run watch` exits 0 (the dry run generates but opens no PR). If it fails with "branch not allowed to deploy", the environment name in the workflow and the policy disagree: read the run log.

### B6: Disable the two ghost workflows

- [ ] **Step 1: Disable by id**

```bash
gh api -X PUT "repos/$R/actions/workflows/191013670/disable"   # .github/workflows/debug-env.yml
gh api -X PUT "repos/$R/actions/workflows/191013672/disable"   # .github/workflows/playwright-vercel-only.yml
```

- [ ] **Step 2: Read back**

```bash
gh api "repos/$R/actions/workflows" --jq '.workflows[] | select(.path|test("debug-env|playwright-vercel-only")) | "\(.path) \(.state)"'
```

Expected: both show `disabled_manually`.

### B7: Merge settings

- [ ] **Step 1: Enable auto-merge and branch-update suggestions**

```bash
gh api -X PATCH "repos/$R" -F allow_auto_merge=true -F allow_update_branch=true
```

- [ ] **Step 2 (preference, ask first): squash-only with PR title/body as the commit message**

Recent `main` history is already squash-style (`... (#556)`), so this only removes the two unused buttons.

```bash
gh api -X PATCH "repos/$R" -F allow_merge_commit=false -F allow_rebase_merge=false -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

- [ ] **Step 3: Read back**

```bash
gh api "repos/$R" --jq '{auto_merge: .allow_auto_merge, update_branch: .allow_update_branch, squash: .allow_squash_merge, merge_commit: .allow_merge_commit, rebase: .allow_rebase_merge}'
```

Expected: `auto_merge: true`, `update_branch: true`; if Step 2 ran, `merge_commit: false`, `rebase: false`.

### B8: Delete the unused secrets and variables

Deleting an unused GitHub secret removes clutter; it is not a rotation. Rotation is a separate, user-performed step at the provider (below).

- [ ] **Step 1: Repository secrets (keep only `VERCEL_AUTOMATION_BYPASS_SECRET`)**

```bash
for s in KERNEL_API_KEY NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_SUPABASE_URL OPENWEATHER_API_KEY SUPABASE VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN; do
  gh secret delete "$s" -R $R
done
```

If you want to keep the legacy Kernel browser option available, drop `KERNEL_API_KEY` from the list; no workflow sets it today.

- [ ] **Step 2: Production environment secrets (keep only `ANTHROPIC_API_KEY`)**

```bash
for s in NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_SUPABASE_URL OPENWEATHER_API_KEY VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN; do
  gh secret delete "$s" -R $R --env Production
done
```

- [ ] **Step 3: Repository variables**

```bash
gh variable delete NEXT_PUBLIC_SUPABASE_ANON_KEY -R $R
gh variable delete NEXT_PUBLIC_SUPABASE_URL -R $R
```

- [ ] **Step 4: Read back**

```bash
gh secret list -R $R
gh secret list -R $R --env Production
gh variable list -R $R
```

Expected: one repo secret (`VERCEL_AUTOMATION_BYPASS_SECRET`), one environment secret (`ANTHROPIC_API_KEY`), no variables.

- [ ] **Step 5: User-performed rotation (not automated)**

- Vercel: Account Settings → Tokens. Revoke the token created 2025-09-08 that was stored as `VERCEL_TOKEN`. It was account-scoped and has sat unused for a year.
- OpenWeather: dashboard → API keys. Delete the key that was stored as `OPENWEATHER_API_KEY`; the app no longer calls OpenWeather at all.
- Kernel (only if `KERNEL_API_KEY` was deleted): revoke the key in the Kernel dashboard.
- `SUPABASE`: its contents cannot be read back. If you know it was a service-role key, rotate it in Supabase → Project Settings → API. If you do not remember, leave Supabase alone; an unused GitHub secret is not an exposure.

### B9: Delete the three stale remote branches

- [ ] **Step 1: Delete**

```bash
cd /Users/justinelrod/Projects/Weather-application
git push origin --delete education/guide-blocking-highs-33827961362 education/guide-depressions-33815924884 pr-585
```

Both `education/*` branches were merged as PRs #586 and #585; `pr-585` has no PR. The two local worktrees under `.worktrees/` (`blocking-highs`, `depressions-guide`) are on different local branches and are unaffected; remove them separately with `git worktree remove` when you are done with them.

- [ ] **Step 2: Read back**

```bash
git ls-remote --heads origin
```

Expected: only `refs/heads/main`.

---

## Phase C: Verification (re-run the audit)

- [ ] **Step 1: Alerts**

```bash
R=jelrod27/Weather-application-
gh api "repos/$R/code-scanning/alerts?state=open" --jq length     # 0
gh api "repos/$R/dependabot/alerts?state=open" --jq length        # 0
gh api "repos/$R/secret-scanning/alerts?state=open" --jq length   # 0
```

- [ ] **Step 2: Settings**

```bash
gh api "repos/$R" --jq '{sec: .security_and_analysis, auto_merge: .allow_auto_merge, update_branch: .allow_update_branch}'
gh api "repos/$R/actions/permissions"
gh api "repos/$R/actions/permissions/workflow"
gh api "repos/$R/branches/main/protection" --jq '{checks: (.required_status_checks.checks|map(.context)), admins: .enforce_admins.enabled, conversations: .required_conversation_resolution.enabled}'
gh api "repos/$R/environments/Production" --jq .deployment_branch_policy
gh secret list -R $R; gh secret list -R $R --env Production; gh variable list -R $R
gh api "repos/$R/community/profile" --jq '{health: .health_percentage, missing: [.files | to_entries[] | select(.value == null) | .key]}'
git ls-remote --heads origin
```

Expected: every value matches the read-backs in B2 through B9; community health is above 57 with `code_of_conduct` the only missing file (intentionally not added).

- [ ] **Step 3: Workflows**

```bash
grep -rn 'uses:' .github/workflows | grep -v -E '@[0-9a-f]{40} # v'   # no output
gh run list -R $R --limit 10                                        # recent runs all success/skipped
```

- [ ] **Step 4: Tell the user to pull**

The main checkout is still behind; the user runs `git pull` themselves (their uncommitted `AGENTS.md` / `CLAUDE.md` edits may need a trivial merge on the one CLAUDE.md line changed in Task 15 and the CI bullet added in Task 18).

---

## Follow-ups (out of scope for this plan)

- **Unused-vars burn-down:** clear the roughly 90 warnings `npm run lint` now reports and flip `@typescript-eslint/no-unused-vars` to `error`. Separate PR; the list is the lint output.
- **Rulesets:** migrate branch protection to a repository ruleset, which can require code-scanning results natively and supports bypass lists.
- **Action majors:** let Dependabot's first weekly run propose `checkout@v5`, `setup-node@v5`, `upload-artifact@v5`, `codeql-action@v4`; review release notes (Node runtime changes) before merging.
- **Supabase publishable keys:** move from the legacy JWT anon key to the `sb_publishable_...` key format when convenient.
- **Lighthouse CLI audit chain:** `@lhci/cli` → `lighthouse` → `puppeteer-core` → `extract-zip` (dismissed as tolerable risk); revisit when `@lhci/cli` ships a release on a patched `lighthouse`.
- **`tsconfig.tests.json` coverage:** already tracked in CLAUDE.md.
