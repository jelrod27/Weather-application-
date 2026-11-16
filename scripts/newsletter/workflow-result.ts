import fs from 'node:fs';
import path from 'node:path';

import { coverageDisclosure, coverageOutcome } from '@/lib/newsletter/coverage';
import { readPublicationBundle } from '@/lib/newsletter/publication';
import { validateGeneratedPost } from './validate-post';
import { sundaySourceErrors } from './source-quality';

function main(): void {
  const report = JSON.parse(fs.readFileSync('newsletter-output/run.json', 'utf8'));
  if (report.stage !== 'ready' || report.dryRun || !['complete', 'partial'].includes(report.outcome)) throw new Error('No validated candidate ready for a PR');
  const postFile = path.relative(process.cwd(), report.filePath).replaceAll('\\', '/');
  if (!postFile.startsWith('content/blog/') || postFile.includes('..')) throw new Error('Ready newsletter must include a publishable post in content/blog');
  const validation = validateGeneratedPost(report.filePath, { publication: true });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  const bundle = readPublicationBundle(fs.readFileSync(report.filePath, 'utf8'));
  const sourceErrors = sundaySourceErrors(bundle.audit);
  if (sourceErrors.length) throw new Error(sourceErrors.join('\n'));
  if (report.outcome !== coverageOutcome(bundle.audit)) {
    throw new Error('Run outcome does not match the publication audit');
  }
  const relative = (file: string): string => path.relative(process.cwd(), file).replaceAll('\\', '/');
  const values = {
    outcome: report.outcome, post_file: postFile, audit_file: relative(bundle.auditPath),
    receipt_file: relative(bundle.receiptPath),
    title: String(report.title).replace(/[\r\n]/g, ' '),
  };
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
  const gaps = bundle.audit.sources.filter(source => source.status !== 'complete');
  const citySources = bundle.audit.sources.filter(source => source.id.startsWith('forecast-'));
  const sunday = bundle.audit.cadence === 'sunday_rearview';
  const overview = [
    `- Article: [${String(report.title).replace(/[\r\n]/g, ' ')}](${postFile})`,
    ...(sunday ? [
      '- National outlook: current NOAA/WPC short-range and extended discussions available.',
      `- City forecasts: **${citySources.filter(source => source.status === 'complete').length}/${citySources.length}** complete seven-day forecasts.`,
    ] : []),
    `- Source coverage: **${report.outcome}**.${gaps.length ? ` ${gaps.length} source gaps are documented below and disclosed in the article.` : ''}`,
  ].join('\n');
  const body = [
    sunday ? '## Sunday weather edition' : '## Wednesday weather article',
    overview,
    '**Editorial merge required.** Review the article for useful weather detail, clear prose and supported claims. Merging publishes it when the site deploys from `main`. The workflow opens this PR without enabling auto-merge; CI passing is not an editorial approval.',
    '<details>\n<summary>Source coverage and publication records</summary>\n',
    `Audit: \`${values.audit_file}\`\n\nReceipt: \`${values.receipt_file}\``,
    coverageDisclosure(bundle.audit),
    '</details>',
    '<details>\n<summary>Image selection</summary>\n',
    validation.auditMarkdown,
    '</details>',
  ].join('\n\n');
  fs.writeFileSync('newsletter-output/pr-body.md', body + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body + '\n');
}

if (process.argv[1]?.endsWith('workflow-result.ts')) {
  try { main(); } catch (error) { console.error('[newsletter]', error); process.exitCode = 1; }
}
