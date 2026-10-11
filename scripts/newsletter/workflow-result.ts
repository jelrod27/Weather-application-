import fs from 'node:fs';
import path from 'node:path';

import { coverageDisclosure } from '@/lib/newsletter/coverage';
import { readPublicationBundle } from '@/lib/newsletter/publication';
import { validateGeneratedPost } from './validate-post';

function main(): void {
  const report = JSON.parse(fs.readFileSync('newsletter-output/run.json', 'utf8'));
  if (report.stage !== 'ready' || report.dryRun || !['complete', 'partial'].includes(report.outcome)) throw new Error('No validated candidate ready for a PR');
  const postFile = path.relative(process.cwd(), report.filePath).replaceAll('\\', '/');
  const expected = report.outcome === 'partial' ? 'content/newsletter-drafts/' : 'content/blog/';
  if (!postFile.startsWith(expected) || postFile.includes('..')) throw new Error('Unexpected candidate path');
  const validation = validateGeneratedPost(report.filePath, { publication: true, draft: report.outcome === 'partial' });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  const bundle = readPublicationBundle(fs.readFileSync(report.filePath, 'utf8'));
  const relative = (file: string): string => path.relative(process.cwd(), file).replaceAll('\\', '/');
  const values = {
    outcome: report.outcome, post_file: postFile, audit_file: relative(bundle.auditPath),
    receipt_file: report.outcome === 'complete' ? relative(bundle.receiptPath) : '',
    title: String(report.title).replace(/[\r\n]/g, ' '),
  };
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
  const body = [
    `Generated newsletter candidate: \`${postFile}\`. Coverage: **${report.outcome}**.`,
    report.outcome === 'partial'
      ? 'This draft PR contains no publishable blog post. Review the candidate and source gaps, record a disposition for each incomplete source, then explicitly promote it using scripts/newsletter/review.ts. See scripts/newsletter/README.md. Merging this draft as-is does not publish it.'
      : 'Source coverage passed. Review the prose and citations before merging; merging publishes the blog post.',
    coverageDisclosure(bundle.audit), validation.auditMarkdown,
  ].join('\n\n');
  fs.writeFileSync('newsletter-output/pr-body.md', body + '\n');
}

if (process.argv[1]?.endsWith('workflow-result.ts')) {
  try { main(); } catch (error) { console.error('[newsletter]', error); process.exitCode = 1; }
}
