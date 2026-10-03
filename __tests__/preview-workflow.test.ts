import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const preview = readFileSync(join(process.cwd(), '.github/workflows/e2e-preview.yml'), 'utf8');
const localE2E = readFileSync(join(process.cwd(), '.github/workflows/e2e-pr.yml'), 'utf8');

it('never checks out or installs untrusted PR code in the privileged preview workflow', () => {
  expect(preview).not.toMatch(/uses: actions\/checkout|run: npm ci|playwright test/);
  expect(preview).toContain('github.event.deployment.creator.login');
  expect(preview).toContain('.head.repo.full_name == $repo');
  expect(preview).toContain('.head.sha == $sha');
});

it('validates the Vercel origin and refuses redirects before sending the bypass secret', () => {
  expect(preview).toContain("url.scheme != 'https'");
  expect(preview).toContain("host.endswith('-justin-elrods-projects.vercel.app')");
  expect(preview).not.toMatch(/curl[^\n]*--location|curl[^\n]*\s-L\b/);
  expect(preview).toContain('x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET');
  expect(localE2E).not.toContain('VERCEL_AUTOMATION_BYPASS_SECRET');
});
