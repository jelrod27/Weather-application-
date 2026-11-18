/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

import { validateNewsletterAutoMergeHead } from '../scripts/newsletter/check-auto-merge-head';

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

function extractShellStep(workflow: string, name: string): string {
  const stepStart = workflow.indexOf(`      - name: ${name}`);
  const runStart = workflow.indexOf('        run: |\n', stepStart);
  if (stepStart < 0 || runStart < 0) throw new Error(`Shell step not found: ${name}`);
  const scriptStart = runStart + '        run: |\n'.length;
  const nextStep = workflow.indexOf('\n      - ', scriptStart);
  return workflow.slice(scriptStart, nextStep < 0 ? undefined : nextStep)
    .split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');
}

function runPublicationStep(workflow: string, {
  createStatus = '0',
  mergeStatus = '0',
  publicationDate = '2026-11-18',
  event = 'schedule',
} = {}): {
  status: number | null;
  calls: Array<{ command: string; args: string[] }>;
  body: string;
} {
  const script = extractShellStep(workflow, 'Open PR');
  const root = mkdtempSync(join(tmpdir(), 'newsletter-workflow-'));
  try {
    const bin = join(root, 'bin');
    mkdirSync(bin);
    mkdirSync(join(root, 'newsletter-output'));
    writeFileSync(join(root, 'newsletter-output/pr-body.md'), 'Generated edition\n');
    const log = join(root, 'calls.jsonl');
    writeFileSync(log, '');
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
        GITHUB_RUN_ID: '42', GITHUB_EVENT_NAME: event, EDITION_DATE: '2026-11-18',
        POST_FILE: `content/blog/${publicationDate}-edition.md`, AUDIT_FILE: 'content/newsletter-audits/edition.json',
        RECEIPT_FILE: 'content/newsletter-audits/edition.review.json', TITLE: 'Weekly weather edition',
      },
    });
    if (result.error) throw result.error;
    return {
      status: result.status,
      calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)),
      body: readFileSync(join(root, 'newsletter-output/pr-body.md'), 'utf8'),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

interface PullRequestFixture {
  created_at: string;
  head: { ref: string; repo: { full_name: string } };
}

function runEditionCheck({
  date = '2026-11-18 3',
  cadence = 'wednesday',
  event = 'schedule',
  pages = [[]],
  apiFailure = false,
  runAttempt = '1',
  originalDate = '2026-11-18',
}: {
  date?: string;
  cadence?: string;
  event?: string;
  pages?: PullRequestFixture[][];
  apiFailure?: boolean;
  runAttempt?: string;
  originalDate?: string;
} = {}): { status: number | null; outputs: string } {
  const script = join(process.cwd(), 'scripts/newsletter/check-edition.sh');
  const root = mkdtempSync(join(tmpdir(), 'newsletter-edition-'));
  try {
    const output = join(root, 'output');
    writeFileSync(output, '');
    writeFileSync(join(root, 'date'), '#!/bin/bash\nprintf "%s\\n" "$FIXTURE_DATE"\n', { mode: 0o755 });
    writeFileSync(join(root, 'gh'), `#!${process.execPath}
const args = process.argv.slice(2);
if (process.env.API_FAILURE === 'true') process.exit(1);
if (args[1] === 'repos/owner/weather/actions/runs/42') {
  console.log(process.env.ORIGINAL_DATE);
  process.exit(0);
}
if (!args.includes('state=all') || !args.includes('base=main')) process.exit(1);
const page = Number(args.find(arg => arg.startsWith('page='))?.slice(5));
const fixture = JSON.parse(process.env.FIXTURE_PAGES)[page - 1];
if (!fixture) process.exit(1);
console.log(JSON.stringify(fixture));
`, { mode: 0o755 });
    const result = spawnSync('bash', [script], {
      encoding: 'utf8',
      env: {
        PATH: [root, process.env.PATH].join(delimiter),
        GITHUB_REPOSITORY: 'owner/weather',
        GITHUB_EVENT_NAME: event,
        GITHUB_OUTPUT: output,
        GITHUB_RUN_ID: '42',
        GITHUB_RUN_ATTEMPT: runAttempt,
        CADENCE: cadence,
        FIXTURE_DATE: date,
        FIXTURE_PAGES: JSON.stringify(pages),
        API_FAILURE: String(apiFailure),
        ORIGINAL_DATE: originalDate,
      },
    });
    if (result.error) throw result.error;
    return { status: result.status, outputs: readFileSync(output, 'utf8') };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('scheduled newsletter recovery', () => {
  const earlierWednesdayPR = {
    created_at: '2026-11-18T17:01:00Z',
    head: { ref: 'blog/wed-2026-11-18-42', repo: { full_name: 'owner/weather' } },
  };

  it.each([
    ['wednesday', '2026-11-18 3', '2026-11-18'],
    ['sunday', '2026-11-22 7', '2026-11-22'],
  ])('attempts the %s edition when no PR was opened', (cadence, date, editionDate) => {
    expect(runEditionCheck({ cadence, date })).toEqual({ status: 0, outputs: `date=${editionDate}\n` });
  });

  it('skips generation when a same-edition PR already exists, including older results on another page', () => {
    const unrelated = { ...earlierWednesdayPR, head: { ...earlierWednesdayPR.head, ref: 'other-branch' } };
    expect(runEditionCheck({ pages: [Array(100).fill(unrelated), [earlierWednesdayPR]] }))
      .toEqual({ status: 0, outputs: '' });
  });

  it('ignores a matching branch from a fork', () => {
    const forkPR = { ...earlierWednesdayPR, head: { ...earlierWednesdayPR.head, repo: { full_name: 'fork/weather' } } };
    expect(runEditionCheck({ pages: [[forkPR]] })).toEqual({ status: 0, outputs: 'date=2026-11-18\n' });
  });

  it('skips a scheduled run delayed past the edition day and allows manual dispatch off cadence', () => {
    expect(runEditionCheck({ date: '2026-11-19 4', apiFailure: true })).toEqual({ status: 0, outputs: '' });
    expect(runEditionCheck({ date: '2026-11-19 4', event: 'workflow_dispatch', apiFailure: true }))
      .toEqual({ status: 0, outputs: 'date=2026-11-19\n' });
  });

  it('skips a rerun from an earlier edition and checks current PRs again on a same-day rerun', () => {
    expect(runEditionCheck({ runAttempt: '2', originalDate: '2026-11-11', pages: [] }))
      .toEqual({ status: 0, outputs: '' });
    expect(runEditionCheck({ runAttempt: '2', pages: [[earlierWednesdayPR]] }))
      .toEqual({ status: 0, outputs: '' });
  });

  it('fails closed when GitHub cannot confirm whether a PR exists', () => {
    expect(runEditionCheck({ apiFailure: true })).toEqual({ status: 1, outputs: '' });
  });
});
describe.each(WORKFLOW_FILES)('%s', (workflowPath) => {
  const workflow = readWorkflow(workflowPath);

  it('schedules two off-minute opportunities on its publishing day and runs one edition at a time', () => {
    const day = workflowPath.endsWith('-sunday.yml') ? '0' : '3';
    const slots = [...workflow.matchAll(/cron: '(\d+) (\d+) \* \* (\d)'/g)];
    expect(slots.map(([, minute, hour, weekday]) => [Number(minute) > 0, Number(hour), weekday]))
      .toEqual([[true, 12, day], [true, 16, day]]);
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('run: bash scripts/newsletter/check-edition.sh');
    expect(workflow.indexOf('run: bash scripts/newsletter/check-edition.sh')).toBeLessThan(
      workflow.indexOf('run: npm ci'),
    );
    const prStep = workflow.slice(workflow.indexOf('      - name: Open PR'));
    expect(prStep).toContain("steps.edition.outputs.date != ''");
  });

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

  it('opens a publishing PR for editorial review without requesting auto-merge', () => {
    const { status, calls, body } = runPublicationStep(workflow);
    expect(status).toBe(0);
    const create = calls.findIndex(call => call.command === 'gh' && call.args[0] === 'pr' && call.args[1] === 'create');
    const merge = calls.findIndex(call => call.command === 'gh' && call.args[0] === 'pr' && call.args[1] === 'merge');
    expect(create).toBeGreaterThanOrEqual(0);
    expect(merge).toBe(-1);
    expect(body).toContain('<!-- newsletter-generated-head: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa -->');
    const ref = calls.find(call => call.command === 'git' && call.args[0] === 'checkout')!.args[2];
    expect(ref).toBe(`blog/${workflowPath.endsWith('-sunday.yml') ? 'sun' : 'wed'}-2026-11-18-42`);
    const pr = { body, base: { ref: 'main' }, head: { ref, sha: 'a'.repeat(40) } };
    expect(validateNewsletterAutoMergeHead({ pull_request: pr })).toEqual([]);
    expect(validateNewsletterAutoMergeHead({ pull_request: { ...pr, head: { ...pr.head, sha: 'b'.repeat(40) } } }).length).toBeGreaterThan(0);
    expect(workflow).not.toContain('--admin');
    const step = workflow.slice(workflow.indexOf('      - name: Open PR'));
    expect(step).toContain("if: ${{ steps.edition.outputs.date != '' && inputs.dry_run != true }}");
  });

  it('does not request a merge when PR creation fails', () => {
    const { status, calls } = runPublicationStep(workflow, { createStatus: '1' });
    expect(status).not.toBe(0);
    expect(calls.some(call => call.command === 'gh' && call.args.includes('merge'))).toBe(false);
  });

  it('does not need merge permission to create an editorial PR', () => {
    const { status } = runPublicationStep(workflow, { mergeStatus: '1' });
    expect(status).toBe(0);
  });

  it('leaves a candidate as an artifact if the scheduled edition day ended during generation', () => {
    const { status, calls } = runPublicationStep(workflow, { publicationDate: '2026-11-19' });
    expect(status).toBe(0);
    expect(calls).toEqual([]);
  });

  it('uses the candidate date in the branch for a manual run that crosses midnight', () => {
    const { status, calls } = runPublicationStep(workflow, { event: 'workflow_dispatch', publicationDate: '2026-11-19' });
    expect(status).toBe(0);
    const ref = calls.find(call => call.command === 'git' && call.args[0] === 'checkout')!.args[2];
    expect(ref).toMatch(/^blog\/(sun|wed)-2026-11-19-42$/);
  });

  it('keeps the Husky secret scan enabled', () => {
    expect(workflow).not.toMatch(/\bHUSKY=0\b/);
    expect(workflow).not.toContain('--no-verify');
  });

  it('preserves failure artifacts and opens publishing PRs for both coverage outcomes', () => {
    expect(workflow).toContain("if: ${{ always() && steps.edition.outputs.date != '' }}");
    expect(workflow).toMatch(/name: newsletter-(sunday|wednesday)-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
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
  const approvalCommand = 'node --experimental-strip-types scripts/newsletter/check-auto-merge-head.ts';
  expect(job).toContain(approvalCommand);
  expect(job.indexOf(approvalCommand)).toBeLessThan(job.indexOf('npm ci'));
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
