import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const bridge = readFileSync(join(process.cwd(), '.github/workflows/e2e-preview.yml'), 'utf8');
const gate = readFileSync(join(process.cwd(), '.github/workflows/preview-gate.yml'), 'utf8');
const localE2E = readFileSync(join(process.cwd(), '.github/workflows/e2e-pr.yml'), 'utf8');

it('does not expose secrets or execute PR code in the untrusted deployment-status workflow', () => {
  expect(bridge).toContain('deployment_status:');
  expect(bridge).toContain('permissions: {}');
  expect(bridge).not.toMatch(/secrets\.|uses: actions\/checkout|run: npm ci|playwright test|x-vercel-protection-bypass/);
});

it('keeps the privileged smoke gate on the default branch and checks the deployment and PR', () => {
  expect(gate).toContain('workflow_run:');
  expect(gate).toContain('workflows: ["Vercel Preview Event"]');
  expect(gate).not.toMatch(/uses: actions\/checkout|run: npm ci|playwright test/);
  expect(gate).toContain('.creator.login == "vercel[bot]"');
  expect(gate).toContain('.head.repo.full_name == $repo');
  expect(gate).toContain('.head.sha == $sha');
  expect(gate).toContain("-f context='Preview Smoke'");
});

it('validates the preview origin and refuses redirects before sending the bypass secret', () => {
  expect(gate).toContain("url.scheme != 'https'");
  expect(gate).toContain("host.endswith('-justin-elrods-projects.vercel.app')");
  expect(gate).not.toMatch(/curl[^\n]*--location|curl[^\n]*\s-L\b/);
  expect(gate).toContain('x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET');
  expect(localE2E).not.toContain('VERCEL_AUTOMATION_BYPASS_SECRET');
});
