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
