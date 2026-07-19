# Newsletter Gitleaks Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure both newsletter workflows can commit generated posts while preserving the fail-closed Husky secret scan.

**Architecture:** Each workflow installs the same pinned official `gitleaks` Linux x64 binary before generating content. A Jest regression test reads the workflow definitions and enforces version, asset, checksum, ordering, and no-bypass requirements.

**Tech Stack:** GitHub Actions YAML, Bash, gitleaks 8.30.1, Jest, TypeScript

## Global Constraints

- Pin `gitleaks` to version `8.30.1`.
- Pin the official `gitleaks_8.30.1_linux_x64.tar.gz` SHA-256 digest to `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`.
- Install before newsletter content generation.
- Do not set `HUSKY=0` or use `git commit --no-verify`.
- Keep Sunday and Wednesday setup commands identical.

---

### Task 1: Protect the Newsletter Workflow Security Contract

**Files:**
- Create: `__tests__/newsletter-workflows.test.ts`
- Modify: `.github/workflows/newsletter-sunday.yml`
- Modify: `.github/workflows/newsletter-wednesday.yml`

**Interfaces:**
- Consumes: the two newsletter workflow files as UTF-8 text.
- Produces: CI workflows with `gitleaks` available on `PATH` before the Husky-protected commit.

- [ ] **Step 1: Write the failing regression test**

Create `__tests__/newsletter-workflows.test.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW_FILES = [
  '.github/workflows/newsletter-sunday.yml',
  '.github/workflows/newsletter-wednesday.yml',
];
const GITLEAKS_VERSION = '8.30.1';
const GITLEAKS_CHECKSUM =
  '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb';

describe.each(WORKFLOW_FILES)('%s', (workflowPath) => {
  const workflow = readFileSync(join(process.cwd(), workflowPath), 'utf8');

  it('installs the pinned gitleaks release before generating content', () => {
    expect(workflow).toContain("- name: Install gitleaks");
    expect(workflow).toContain(`GITLEAKS_VERSION: '${GITLEAKS_VERSION}'`);
    expect(workflow).toContain(
      'asset="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"',
    );
    expect(workflow).toContain(GITLEAKS_CHECKSUM);
    expect(workflow).toContain('sha256sum --check -');
    expect(workflow.indexOf('- name: Install gitleaks')).toBeLessThan(
      workflow.indexOf('- name: Generate '),
    );
  });

  it('keeps the Husky secret scan enabled', () => {
    expect(workflow).not.toMatch(/\bHUSKY=0\b/);
    expect(workflow).not.toContain('--no-verify');
  });
});
```

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
npm test -- newsletter-workflows.test.ts --runInBand
```

Expected: both workflow cases fail because `- name: Install gitleaks` is absent.

- [ ] **Step 3: Add the pinned installer to both workflows**

Insert this step after `npm ci` and before each `Generate ... post` step:

```yaml
      - name: Install gitleaks
        env:
          GITLEAKS_VERSION: '8.30.1'
        run: |
          set -euo pipefail
          asset="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
          url="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${asset}"
          curl --fail --location --retry 3 --output "$asset" "$url"
          printf '%s  %s\n' \
            '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' \
            "$asset" | sha256sum --check -
          tar -xzf "$asset" gitleaks
          sudo install -m 0755 gitleaks /usr/local/bin/gitleaks
          gitleaks version
```

- [ ] **Step 4: Run targeted verification and verify GREEN**

Run:

```bash
npm test -- newsletter-workflows.test.ts --runInBand
```

Expected: 1 suite and 4 tests pass.

- [ ] **Step 5: Run repository validation**

Run:

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
npm run knip
npx playwright test --project=chromium
```

Expected: all commands exit 0. If Playwright requires browsers, run `npx playwright install chromium` and retry once.

- [ ] **Step 6: Review and commit**

Review the staged and unstaged diff for correctness, security, type safety, test coverage, and repository conventions. Then commit:

```bash
git add \
  __tests__/newsletter-workflows.test.ts \
  .github/workflows/newsletter-sunday.yml \
  .github/workflows/newsletter-wednesday.yml \
  planning/newsletter-gitleaks-implementation-plan.md
git commit -m "fix(ci): install gitleaks for newsletter commits"
```

- [ ] **Step 7: Push and open the PR**

Push `fix/newsletter-gitleaks` and create a PR to `main` summarizing the root cause, both corrected workflows, regression coverage, and local checks. After merge, start a fresh Sunday workflow dispatch from `main` rather than rerunning run `29688586702`.
