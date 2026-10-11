import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW_FILES = [
  '.github/workflows/newsletter-sunday.yml',
  '.github/workflows/newsletter-wednesday.yml',
];
const GITLEAKS_VERSION = '8.30.1';
const GITLEAKS_CHECKSUM =
  '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb';
const SHELL_GITLEAKS_VERSION = ['$', '{GITLEAKS_VERSION}'].join('');
const REQUIRED_INSTALLER_COMMANDS = [
  'curl --fail --location --retry 3 --output "$asset" "$url"',
  'sha256sum --check -',
  'tar -xzf "$asset" gitleaks',
  'sudo install -m 0755 gitleaks /usr/local/bin/gitleaks',
  'gitleaks version',
];

function readWorkflow(workflowPath: string): string {
  return readFileSync(join(process.cwd(), workflowPath), 'utf8');
}

function extractInstallerBlock(workflow: string): string {
  const stepStart = workflow.indexOf('      - name: Install gitleaks');

  expect(stepStart).toBeGreaterThanOrEqual(0);

  const nextStep = workflow.indexOf('\n      - ', stepStart + 1);
  return workflow.slice(stepStart, nextStep === -1 ? undefined : nextStep);
}

function expectRequiredInstallerCommands(installerBlock: string): void {
  for (const command of REQUIRED_INSTALLER_COMMANDS) {
    expect(installerBlock).toContain(command);
  }
}

function normalizeInstallerBlock(installerBlock: string): string {
  return installerBlock
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

describe.each(WORKFLOW_FILES)('%s', (workflowPath) => {
  const workflow = readWorkflow(workflowPath);

  it('installs the pinned gitleaks release before generating content', () => {
    const installerBlock = extractInstallerBlock(workflow);

    expect(installerBlock).toContain(
      `GITLEAKS_VERSION: '${GITLEAKS_VERSION}'`,
    );
    expect(installerBlock).toContain(
      `asset="gitleaks_${SHELL_GITLEAKS_VERSION}_linux_x64.tar.gz"`,
    );
    expect(installerBlock).toContain(GITLEAKS_CHECKSUM);
    expectRequiredInstallerCommands(installerBlock);
    expect(workflow.indexOf('- name: Install gitleaks')).toBeLessThan(
      workflow.indexOf('- name: Generate '),
    );
  });

  it('keeps the Husky secret scan enabled', () => {
    expect(workflow).not.toMatch(/\bHUSKY=0\b/);
    expect(workflow).not.toContain('--no-verify');
  });

  it('preserves failure artifacts and opens partial candidates as draft PRs', () => {
    expect(workflow).toMatch(/name: Preserve candidate and audit artifacts\s+if: always\(\)/);
    expect(workflow).toContain('newsletter-output/');
    expect(workflow).toContain('content/newsletter-drafts/');
    expect(workflow).toContain('if [ "$OUTCOME" = "partial" ]; then DRAFT_ARGS+=(--draft); fi');
    expect(workflow).toContain('--body-file newsletter-output/pr-body.md');
    expect(workflow).toContain('run: npx tsx scripts/newsletter/workflow-result.ts');
    expect(workflow).not.toContain('git add content/blog/');
  });
});

it('runs coverage enforcement in the required Unit Tests job with base history available', () => {
  const workflow = readWorkflow('.github/workflows/ci.yml');
  const job = workflow.split('  unit-tests:')[1].split('  dead-code:')[0];
  expect(job).toContain('fetch-depth: 0');
  expect(job).toContain('npx tsx scripts/newsletter/validate-changes.ts --base "$NEWSLETTER_BASE_SHA"');
  expect(job).not.toContain('continue-on-error: true');
});

it('keeps the newsletter installer blocks identical', () => {
  const installerBlocks = WORKFLOW_FILES.map(readWorkflow)
    .map(extractInstallerBlock)
    .map(normalizeInstallerBlock);

  expect(installerBlocks[1]).toBe(installerBlocks[0]);
});

it('rejects an installer block missing a required command', () => {
  const workflow = readWorkflow(WORKFLOW_FILES[0]).replace(
    'tar -xzf "$asset" gitleaks',
    '',
  );

  expect(() =>
    expectRequiredInstallerCommands(extractInstallerBlock(workflow)),
  ).toThrow(/tar -xzf/);
});
