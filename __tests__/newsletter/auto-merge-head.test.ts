/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateNewsletterAutoMergeHead } from '../../scripts/newsletter/check-auto-merge-head';

const GENERATED = 'a'.repeat(40);
const EDITED = 'b'.repeat(40);

function event(cadence = 'sun', head = GENERATED, body: string | null = `Edition\n\n<!-- newsletter-generated-head: ${GENERATED} -->\n`) {
  return { pull_request: { number: 42, head: { ref: `blog/${cadence}-2026-11-01-42`, sha: head }, base: { ref: 'main' }, body } };
}

describe('newsletter auto-merge head guard', () => {
  it.each(['sun', 'wed'])('allows the original generated %s commit', cadence => {
    expect(validateNewsletterAutoMergeHead(event(cadence))).toEqual([]);
  });

  it.each(['sun', 'wed'])('blocks a later %s commit even if an editor refreshed its publication receipt', cadence => {
    expect(validateNewsletterAutoMergeHead(event(cadence, EDITED)).join('\n')).toContain('head changed after generation');
  });

  it.each([
    null,
    'No generated head recorded',
    `<!-- newsletter-generated-head: ${GENERATED} -->\n<!-- newsletter-generated-head: ${GENERATED} -->`,
    `<!-- newsletter-generated-head: ${GENERATED} -->\n<!-- newsletter-generated-head: invalid -->`,
    '<!-- newsletter-generated-head: invalid -->',
  ])('fails closed for a missing, duplicated or malformed generation marker: %s', body => {
    expect(validateNewsletterAutoMergeHead(event('sun', GENERATED, body)).length).toBeGreaterThan(0);
  });

  it('accepts checkout-independent PR metadata and CRLF line endings', () => {
    expect(validateNewsletterAutoMergeHead(event('sun', GENERATED, `Edition\r\n<!-- newsletter-generated-head: ${GENERATED} -->\r\n`))).toEqual([]);
  });

  it('does not impose generated markers on ordinary feature PRs', () => {
    expect(validateNewsletterAutoMergeHead({ pull_request: { head: { ref: 'codex/feature', sha: EDITED }, base: { ref: 'main' }, body: 'Human-authored change' } })).toEqual([]);
  });

  it('rejects invalid event metadata', () => {
    expect(validateNewsletterAutoMergeHead(null).length).toBeGreaterThan(0);
    expect(validateNewsletterAutoMergeHead({ pull_request: {} }).length).toBeGreaterThan(0);
  });

  it('rejects a newsletter redirected away from main', () => {
    const redirected = event();
    redirected.pull_request.base.ref = 'other';
    expect(validateNewsletterAutoMergeHead(redirected).length).toBeGreaterThan(0);
  });

  it('rejects a malformed head SHA', () => {
    expect(validateNewsletterAutoMergeHead(event('sun', 'invalid')).length).toBeGreaterThan(0);
  });

  it('fails the actual CI command after a writer changes the PR head', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-head-'));
    try {
      const file = path.join(root, 'event.json');
      const liveFile = path.join(root, 'live.json');
      const gh = path.join(root, 'gh');
      fs.writeFileSync(gh, `#!${process.execPath}\nprocess.stdout.write(require('node:fs').readFileSync(process.env.LIVE_PR_FILE, 'utf8'));\n`, { mode: 0o755 });
      const command = (eventName = 'pull_request') => spawnSync(path.join(process.cwd(), 'node_modules/.bin/tsx'), [
        path.join(process.cwd(), 'scripts/newsletter/check-auto-merge-head.ts'),
      ], { env: {
        ...process.env, PATH: root + path.delimiter + process.env.PATH,
        GITHUB_EVENT_PATH: file, GITHUB_EVENT_NAME: eventName, GITHUB_REF_NAME: 'blog/sun-2026-11-01-42',
        GITHUB_REPOSITORY: 'jelrod27/Weather-application-', LIVE_PR_FILE: liveFile,
      }, encoding: 'utf8' });
      fs.writeFileSync(file, JSON.stringify(event()));
      fs.writeFileSync(liveFile, JSON.stringify(event().pull_request));
      expect(command().status).toBe(0);
      fs.writeFileSync(liveFile, JSON.stringify(event('sun', EDITED).pull_request));
      expect(String(command().stderr)).toContain('head changed during this CI run');
      fs.writeFileSync(file, JSON.stringify(event('sun', EDITED)));
      const changed = command();
      expect(changed.status).toBe(1);
      expect(String(changed.stderr)).toContain('head changed after generation');
      // An explicit reviewer update is read live even when rerunning the same
      // synchronize event, which still contains the old body marker.
      fs.writeFileSync(liveFile, JSON.stringify(event('sun', EDITED, `<!-- newsletter-generated-head: ${EDITED} -->`).pull_request));
      expect(command().status).toBe(0);
      const dispatched = command('workflow_dispatch');
      expect(dispatched.status).toBe(1);
      expect(String(dispatched.stderr)).toContain('must use pull request CI');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
