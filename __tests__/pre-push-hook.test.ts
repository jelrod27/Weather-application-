import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static regression coverage for .husky/pre-push, in the same style as
 * newsletter-workflows.test.ts.
 *
 * The hook cannot be exercised in-process — it shells out to gitleaks and tsc —
 * so these assertions pin the properties that are easy to break by editing the
 * script and hard to notice afterwards.
 */

const HOOK_PATH = '.husky/pre-push';

function readHook(): string {
  return readFileSync(join(process.cwd(), HOOK_PATH), 'utf8');
}

describe('.husky/pre-push', () => {
  const hook = readHook();

  describe('secret scan', () => {
    it('refuses to push when gitleaks is absent', () => {
      expect(hook).toContain('command -v gitleaks');
      expect(hook).toContain('refusing to push without a secret scan');
    });

    it('propagates a gitleaks failure instead of falling through', () => {
      // gitleaks is no longer the last command in the script, so its exit status
      // is not the script's. Without `|| exit 1` a detected leak would be pushed.
      const gitleaksCalls = hook.match(/^\s*gitleaks git .*$/gm) ?? [];
      expect(gitleaksCalls.length).toBeGreaterThan(0);
      for (const call of gitleaksCalls) {
        expect(call).toContain('|| exit 1');
      }
    });

    it('scans full history when the branch has no upstream', () => {
      expect(hook).toContain('@{u}');
      expect(hook).toMatch(/gitleaks git --redact/);
    });
  });

  describe('type check', () => {
    it('runs the same two projects CI type-checks', () => {
      expect(hook).toContain('node_modules/.bin/tsc --noEmit');
      expect(hook).toContain('tsc --noEmit -p tsconfig.tests.json');
    });

    it('refuses to push when tsc is absent rather than skipping silently', () => {
      expect(hook).toContain('node_modules/.bin/tsc');
      expect(hook).toContain('refusing to push without a type check');
    });

    it('is skipped under CI', () => {
      // The newsletter workflows run `npm ci` (installing husky) and then
      // `git push`, and newsletter-workflows.test.ts forbids them from passing
      // --no-verify or setting HUSKY=0. Without this guard every newsletter run
      // would compile the repo twice, and a type error on main would fail the
      // newsletter instead of the change that introduced it.
      expect(hook).toMatch(/\[ -n "\$\{CI:-\}" \]/);
      expect(hook).toContain('skipping type check');
    });

    it('still runs the secret scan under CI', () => {
      // The CI early-exit must sit AFTER the gitleaks gate: that one is a
      // security control the newsletter design doc requires those runs to keep.
      const gitleaksIdx = hook.indexOf('command -v gitleaks');
      const ciGuardIdx = hook.search(/\[ -n "\$\{CI:-\}" \]/);
      expect(gitleaksIdx).toBeGreaterThan(-1);
      expect(ciGuardIdx).toBeGreaterThan(-1);
      expect(gitleaksIdx).toBeLessThan(ciGuardIdx);
    });
  });

  describe('delete-only pushes', () => {
    it('exits early when every pushed ref has an all-zero local sha', () => {
      expect(hook).toContain('deleting_only');
      // The all-zero test must use POSIX `!` negation, not bash's `^`.
      expect(hook).toContain('*[!0]*');
    });

    it('reads the ref list without a pipeline', () => {
      // A `while read ... | ` pipeline would run the loop in a subshell and
      // discard deleting_only, silently defeating the early exit.
      expect(hook).toContain('<<EOF');
      expect(hook).not.toMatch(/\|\s*while read/);
    });
  });

  describe('portability', () => {
    it('targets POSIX sh, not bash', () => {
      expect(hook.startsWith('#!/usr/bin/env sh')).toBe(true);
    });

    it('avoids bash-only constructs', () => {
      expect(hook).not.toContain('[[');
      expect(hook).not.toContain('<<<');
      expect(hook).not.toMatch(/\bdeclare -/);
    });
  });
});
