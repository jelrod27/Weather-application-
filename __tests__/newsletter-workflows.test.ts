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
