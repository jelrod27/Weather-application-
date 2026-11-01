/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

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

function runPublicationStep(workflow: string, createStatus = '0', mergeStatus = '0'): {
  status: number | null;
  calls: Array<{ command: string; args: string[] }>;
} {
  const stepStart = workflow.indexOf('      - name: Open PR');
  const runStart = workflow.indexOf('        run: |\n', stepStart);
  if (stepStart < 0 || runStart < 0) throw new Error('Publishing step not found');
  const scriptStart = runStart + '        run: |\n'.length;
  const nextStep = workflow.indexOf('\n      - ', scriptStart);
  const script = workflow.slice(scriptStart, nextStep < 0 ? undefined : nextStep)
    .split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');
  const root = mkdtempSync(join(tmpdir(), 'newsletter-workflow-'));
  try {
    const bin = join(root, 'bin');
    mkdirSync(bin);
    const log = join(root, 'calls.jsonl');
    const stub = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify({ command, args }) + '\\n');
if (command === 'gh' && args[0] === 'pr' && args[1] === 'create') {
  if (process.env.CREATE_STATUS !== '0') process.exit(Number(process.env.CREATE_STATUS));
  process.stdout.write('https://github.com/jelrod27/Weather-application-/pull/123\\n');
}
if (command === 'gh' && args[0] === 'pr' && args[1] === 'merge') process.exit(Number(process.env.MERGE_STATUS));
if (command === 'git' && args[0] === 'rev-parse' && args[1] === 'HEAD') process.stdout.write('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n');
`;
    for (const command of ['gh', 'git']) writeFileSync(join(bin, command), stub, { mode: 0o755 });
    const result = spawnSync('bash', ['-c', script], {
      cwd: root, encoding: 'utf8', env: {
        PATH: [bin, '/usr/bin', '/bin'].join(delimiter),
        GH_TOKEN: 'fixture', CALL_LOG: log, CREATE_STATUS: createStatus, MERGE_STATUS: mergeStatus,
        GITHUB_RUN_ID: '42', POST_FILE: 'content/blog/edition.md', AUDIT_FILE: 'content/newsletter-audits/edition.json',
        RECEIPT_FILE: 'content/newsletter-audits/edition.review.json', TITLE: 'Weekly weather edition',
      },
    });
    if (result.error) throw result.error;
    return { status: result.status, calls: readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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

  it('queues the exact generated PR for protected squash auto-merge', () => {
    const { status, calls } = runPublicationStep(workflow);
    expect(status).toBe(0);
    const create = calls.findIndex(call => call.command === 'gh' && call.args[0] === 'pr' && call.args[1] === 'create');
    const merge = calls.findIndex(call => call.command === 'gh' && call.args[0] === 'pr' && call.args[1] === 'merge');
    expect(create).toBeGreaterThanOrEqual(0);
    expect(merge).toBeGreaterThan(create);
    expect(calls[merge].args).toEqual([
      'pr', 'merge', 'https://github.com/jelrod27/Weather-application-/pull/123',
      '--auto', '--squash', '--match-head-commit', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ]);
    expect(workflow).not.toContain('--admin');
    const step = workflow.slice(workflow.indexOf('      - name: Open PR'));
    expect(step).toContain('if: ${{ inputs.dry_run != true }}');
  });

  it('does not request a merge when PR creation fails', () => {
    const { status, calls } = runPublicationStep(workflow, '1');
    expect(status).not.toBe(0);
    expect(calls.some(call => call.command === 'gh' && call.args.includes('merge'))).toBe(false);
  });

  it('fails visibly when enabling auto-merge fails', () => {
    const { status } = runPublicationStep(workflow, '0', '1');
    expect(status).not.toBe(0);
  });

  it('keeps the Husky secret scan enabled', () => {
    expect(workflow).not.toMatch(/\bHUSKY=0\b/);
    expect(workflow).not.toContain('--no-verify');
  });

  it('preserves failure artifacts and opens publishing PRs for both coverage outcomes', () => {
    expect(workflow).toMatch(/name: Preserve candidate and audit artifacts\s+if: always\(\)/);
    expect(workflow).toContain('newsletter-output/');
    expect(workflow).toContain('content/blog/');
    expect(workflow).not.toContain('--draft');
    expect(workflow).toContain('git add -- "$POST_FILE" "$AUDIT_FILE" "$RECEIPT_FILE"');
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
