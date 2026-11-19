import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const NEWSLETTER_BRANCH = /^blog\/(?:sun|wed)-\d{4}-\d{2}-\d{2}-\d+$/;
const COMMIT_SHA = /^[a-f0-9]{40}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function isUnchangedMainUpdate(root: string, main: string, reviewed: string, head: string): boolean {
  const git = (...args: string[]): Buffer => execFileSync('git', ['--no-replace-objects', ...args], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000,
  });
  // Compare full paths, blob IDs and modes across the entire PR.
  const delta = (base: string, commit: string): Buffer => git(
    'diff-tree', '-r', '--raw', '-z', '--no-commit-id', '--no-abbrev', '--no-renames',
    '--no-ext-diff', '--no-textconv', '--ignore-submodules=none', base, commit,
  );

  try {
    let previousBase = git('merge-base', '--all', reviewed, main).toString().trim();
    if (!COMMIT_SHA.test(previousBase)) return false;
    const approved = delta(previousBase, reviewed);
    const history = git('rev-list', '--reverse', '--first-parent', '--parents', `${reviewed}..${head}`)
      .toString().trim();

    let previous = reviewed;
    for (const line of history.split('\n')) {
      const [commit, firstParent, base, ...otherParents] = line.split(' ');
      if (firstParent !== previous || !base || base === previousBase || otherParents.length) return false;
      git('merge-base', '--is-ancestor', previousBase, base);
      git('merge-base', '--is-ancestor', base, main);
      if (!delta(base, commit).equals(approved)) return false;
      previous = commit;
      previousBase = base;
    }
    return previous === head;
  } catch {
    return false;
  }
}

/** Keep editorial approval only for the recorded commit or a verified merge from main. */
export function validateNewsletterAutoMergeHead(event: unknown, root = process.cwd()): string[] {
  const pr = record(record(event)?.pull_request);
  const head = record(pr?.head);
  if (!pr || !head || typeof head.ref !== 'string') return ['Invalid pull request metadata'];
  if (!NEWSLETTER_BRANCH.test(head.ref)) return [];
  const base = record(pr.base);
  if (base?.ref !== 'main') return ['Newsletter auto-merge must target main'];
  if (typeof head.sha !== 'string' || !COMMIT_SHA.test(head.sha)) return ['Invalid newsletter head SHA'];
  const body = typeof pr.body === 'string' ? pr.body.replace(/\r\n/g, '\n') : '';
  const markers = [...body.matchAll(/^<!-- newsletter-generated-head: ([a-f0-9]{40}) -->$/gm)];
  if (markers.length !== 1 || body.split('<!-- newsletter-generated-head:').length !== 2) {
    return ['Newsletter auto-merge needs exactly one generated-head marker'];
  }
  const reviewed = markers[0][1];
  const main = base.sha;
  if (reviewed !== head.sha &&
      (typeof main !== 'string' || !COMMIT_SHA.test(main) || !isUnchangedMainUpdate(root, main, reviewed, head.sha))) {
    return ['Newsletter head changed after generation; review the changes and explicitly update the generated-head marker before retrying CI'];
  }
  return [];
}

function main(): void {
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') {
    if (NEWSLETTER_BRANCH.test(process.env.GITHUB_REF_NAME ?? '')) {
      throw new Error('Generated newsletter branches must use pull request CI for head authorization');
    }
    console.log('[newsletter] no newsletter pull request head to authorize');
    return;
  }
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required');
  const event: unknown = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const pr = record(record(event)?.pull_request);
  const head = record(pr?.head);
  let current: unknown = event;
  if (typeof head?.ref === 'string' && NEWSLETTER_BRANCH.test(head.ref)) {
    const repository = process.env.GITHUB_REPOSITORY ?? '';
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || typeof pr?.number !== 'number' || !Number.isSafeInteger(pr.number) || pr.number < 1) {
      throw new Error('Repository and pull request number are required');
    }
    // Reruns retain the original event body. Read the current authorization
    // record so a deliberate editor update can unblock a reviewed revision.
    const live = record(JSON.parse(execFileSync('gh', ['api', `repos/${repository}/pulls/${pr.number}`], {
      encoding: 'utf8', timeout: 30_000,
    })));
    const liveHead = record(live?.head);
    if (!liveHead || liveHead.sha !== head.sha || liveHead.ref !== head.ref) throw new Error('Pull request head changed during this CI run');
    if (record(live?.base)?.ref !== record(pr.base)?.ref) throw new Error('Pull request target changed during this CI run');
    // Use the base SHA captured by GitHub for this run. Only the editor's
    // approval record needs its latest value.
    current = { pull_request: { ...pr, body: live?.body } };
  }
  const errors = validateNewsletterAutoMergeHead(current);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('[newsletter] automatic merge head authorization passed');
}

if (process.argv[1]?.endsWith('check-auto-merge-head.ts')) {
  try { main(); } catch (error) { console.error('[newsletter]', error); process.exitCode = 1; }
}
