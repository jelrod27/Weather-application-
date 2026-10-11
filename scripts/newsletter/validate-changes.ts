import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { publicationErrors, requiresCoverage } from '@/lib/newsletter/publication';
import { validateGeneratedPost } from './validate-post';

export function validateNewsletterChanges(base: string, root = process.cwd()): string[] {
  // Resolve a commit, not an arbitrary option or shell fragment.
  const sha = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
  const changed = new Set(execFileSync('git', ['diff', '--name-only', '-z', '--diff-filter=ACMR', `${sha}...HEAD`, '--', 'content/blog', 'content/newsletter-audits'], {
    cwd: root, encoding: 'utf8',
  }).split('\0').filter(Boolean));
  const blogDir = path.join(root, 'content/blog');
  const errors: string[] = [];
  if (!fs.existsSync(blogDir)) return errors;
  for (const filename of fs.readdirSync(blogDir).filter(file => /\.mdx?$/.test(file))) {
    const relative = `content/blog/${filename}`;
    const file = path.join(blogDir, filename);
    const raw = fs.readFileSync(file, 'utf8');
    const { data } = matter(raw);
    let generated = requiresCoverage(data);
    // Removing generation metadata from an edited legacy post cannot bypass the PR gate.
    if (changed.has(relative) && !generated) {
      try {
        generated = requiresCoverage(matter(execFileSync('git', ['show', `${sha}:${relative}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).data);
      } catch { /* A newly authored, non-generated post has no base version. */ }
    }
    if (!generated) continue;
    const checks = publicationErrors(raw, filename, { root, requireAudit: changed.has(relative) });
    if (changed.has(relative) || data.publication_version) checks.push(...validateGeneratedPost(file).errors);
    errors.push(...checks.map(error => `${relative}: ${error}`));
  }
  return errors;
}

if (process.argv[1]?.endsWith('validate-changes.ts')) {
  try {
    const base = process.argv[process.argv.indexOf('--base') + 1];
    if (!process.argv.includes('--base') || !base) throw new Error('--base <commit> is required');
    const errors = validateNewsletterChanges(base);
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('[newsletter] changed public posts and publication approvals passed');
  } catch (error) { console.error('[newsletter]', error); process.exitCode = 1; }
}
