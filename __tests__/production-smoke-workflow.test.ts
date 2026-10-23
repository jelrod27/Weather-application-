/** @jest-environment node */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface SmokeWorkflow {
  jobs: { smoke: { steps: Array<{ id?: string; run: string }> } };
}

// js-yaml is already used by the repository's workflow validator.
const load: (source: string) => SmokeWorkflow = require('js-yaml').load;
const workflow = load(readFileSync('.github/workflows/production-smoke.yml', 'utf8'));
const verification = workflow.jobs.smoke.steps.find(step => step.id === 'verify')?.run;
if (!verification) throw new Error('Production deployment verification step is missing');
let directory: string;

beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'weather-smoke-')); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

// Execute the workflow's actual shell. Only the GitHub API lookup is replaced;
// no network, credentials, or deployment is needed to exercise these decisions.
it.each<[string, string, string, string, string, number, string]>([
  ['newsletter environment event', 'github-actions', 'jelrod27', 'main-head', 'success', 0, ''],
  ['current Vercel deployment', '', 'vercel[bot]', 'main-head', 'success', 0, 'current=true\n'],
  ['superseded Vercel deployment', '', 'vercel[bot]', 'older-head', 'success', 0, ''],
  ['failed Vercel deployment', '', 'vercel[bot]', 'main-head', 'failure', 1, 'current=true\n'],
  ['errored Vercel deployment', '', 'vercel[bot]', 'main-head', 'error', 1, 'current=true\n'],
  ['unexpected deployment creator', '', 'someone-else', 'main-head', 'success', 1, ''],
])('%s: preserves the deployment gate outcome', (_label, app, creator, sha, state, code, output) => {
  const outputFile = join(directory, 'output');
  const result = spawnSync('bash', ['-c', `gh() { echo main-head; }\n${verification}`], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GH_TOKEN: '',
      GITHUB_REPOSITORY: 'jelrod27/Weather-application-',
      GITHUB_OUTPUT: outputFile,
      DEPLOY_APP: app,
      DEPLOY_CREATOR: creator,
      DEPLOY_SHA: sha,
      DEPLOY_STATE: state,
    },
  });

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(code);
  expect(existsSync(outputFile) ? readFileSync(outputFile, 'utf8') : '').toBe(output);
});
