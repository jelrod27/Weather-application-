/** @jest-environment node */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateNewsletterAutoMergeHead } from '../../scripts/newsletter/check-auto-merge-head';

const GENERATED = 'a'.repeat(40);
const EDITED = 'b'.repeat(40);

function event(cadence = 'sun', head = GENERATED, body: string | null = `Edition\n\n<!-- newsletter-generated-head: ${GENERATED} -->\n`, baseSha?: string) {
  return { pull_request: { number: 42, head: { ref: `blog/${cadence}-2026-11-01-42`, sha: head }, base: { ref: 'main', sha: baseSha }, body } };
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
      const command = (eventName = 'pull_request') => spawnSync(process.execPath, [
        '--experimental-strip-types',
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

describe('newsletter approval after a merge from main', () => {
  let root: string;
  let reviewed: string;

  function git(...args: string[]): string {
    return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgSign=false', ...args], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  }

  function commit(file: string, body: string): string {
    fs.writeFileSync(path.join(root, file), body);
    git('add', '--', file);
    git('commit', '-qm', `Edit ${file}`);
    return git('rev-parse', 'HEAD');
  }

  function advanceMain(): void {
    git('switch', '-q', 'main');
    commit('app.ts', `Main update after ${git('rev-parse', 'HEAD')}\n`);
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    git('switch', '-q', 'newsletter');
  }

  function approvalFor(head: string): ReturnType<typeof event> {
    return event('wed', head, `<!-- newsletter-generated-head: ${reviewed} -->`, git('rev-parse', 'main'));
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-base-update-'));
    git('init', '-q', '-b', 'main');
    git('config', 'user.name', 'Newsletter test');
    git('config', 'user.email', 'newsletter@example.test');
    commit('app.ts', 'Original main\n');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    git('switch', '-qc', 'newsletter');
    reviewed = commit('edition.md', 'Reviewed newsletter\n');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('keeps the recorded approval through successive main updates, even when main advances again', () => {
    advanceMain();
    git('merge', '-q', '--no-ff', '--no-edit', 'main');
    expect(validateNewsletterAutoMergeHead(approvalFor(git('rev-parse', 'HEAD')), root)).toEqual([]);
    advanceMain();
    git('merge', '-q', '--no-ff', '--no-edit', 'main');
    const head = git('rev-parse', 'HEAD');
    advanceMain();
    expect(validateNewsletterAutoMergeHead(approvalFor(head), root)).toEqual([]);
  });

  it('uses the verified history in the actual CI command', () => {
    advanceMain();
    git('merge', '-q', '--no-ff', '--no-edit', 'main');
    const metadata = approvalFor(git('rev-parse', 'HEAD'));
    const payload = path.join(root, 'event.json');
    const live = path.join(root, 'live.json');
    fs.writeFileSync(payload, JSON.stringify(metadata));
    fs.writeFileSync(live, JSON.stringify(metadata.pull_request));
    fs.writeFileSync(path.join(root, 'gh'), `#!${process.execPath}\nprocess.stdout.write(require('node:fs').readFileSync(process.env.LIVE_PR_FILE, 'utf8'));\n`, { mode: 0o755 });
    const result = spawnSync(process.execPath, [
      '--experimental-strip-types',
      path.join(process.cwd(), 'scripts/newsletter/check-auto-merge-head.ts'),
    ], { cwd: root, encoding: 'utf8', env: {
      ...process.env, PATH: root + path.delimiter + process.env.PATH,
      GITHUB_EVENT_PATH: payload, GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REPOSITORY: 'jelrod27/Weather-application-', LIVE_PR_FILE: live,
    } });
    expect(result.status).toBe(0);
  });

  it.each([
    ['edition.md', 'Unreviewed text\n'],
    ['extra.txt', 'Unreviewed extra file\n'],
  ])('rejects an update merge that also changes %s', (file, body) => {
    advanceMain();
    git('merge', '--no-ff', '--no-commit', 'main');
    const head = commit(file, body);
    expect(validateNewsletterAutoMergeHead(approvalFor(head), root)).toHaveLength(1);
  });

  it('uses the event base even if the local origin/main ref points to an untrusted branch', () => {
    git('switch', '-qc', 'untrusted', 'main');
    commit('app.ts', 'Untrusted update\n');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    git('switch', '-q', 'newsletter');
    git('merge', '-q', '--no-ff', '--no-edit', 'untrusted');
    expect(validateNewsletterAutoMergeHead(approvalFor(git('rev-parse', 'HEAD')), root)).toHaveLength(1);
  });

  it('requires the event base commit to verify a merge update', () => {
    advanceMain();
    git('merge', '-q', '--no-ff', '--no-edit', 'main');
    const metadata = approvalFor(git('rev-parse', 'HEAD'));
    metadata.pull_request.base.sha = undefined;
    expect(validateNewsletterAutoMergeHead(metadata, root)).toHaveLength(1);
  });

  it('rejects an additional topic commit even when it leaves the reviewed diff intact', () => {
    advanceMain();
    git('merge', '-q', '--no-ff', '--no-edit', 'main');
    git('commit', '-qm', 'Unreviewed topic commit', '--allow-empty');
    expect(validateNewsletterAutoMergeHead(approvalFor(git('rev-parse', 'HEAD')), root)).toHaveLength(1);
  });
});
