import fs from 'node:fs';
import path from 'node:path';

import { coverageDisclosure, coverageOutcome } from '@/lib/newsletter/coverage';
import { readPublicationBundle } from '@/lib/newsletter/publication';
import { validateGeneratedPost } from './validate-post';

function main(): void {
  const report = JSON.parse(fs.readFileSync('newsletter-output/run.json', 'utf8'));
  if (report.stage !== 'ready' || report.dryRun || !['complete', 'partial'].includes(report.outcome)) throw new Error('No validated candidate ready for a PR');
  const postFile = path.relative(process.cwd(), report.filePath).replaceAll('\\', '/');
  if (!postFile.startsWith('content/blog/') || postFile.includes('..')) throw new Error('Ready newsletter must include a publishable post in content/blog');
  const validation = validateGeneratedPost(report.filePath, { publication: true });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  const bundle = readPublicationBundle(fs.readFileSync(report.filePath, 'utf8'));
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
  const national = bundle.audit.sources.filter(source => source.id.startsWith('wpc-'));
  const gaps = bundle.audit.sources.filter(source => source.status !== 'complete');
  const sundayChecklist = [
    `- Candidate: \`${postFile}\``,
    `- Source audit: \`${values.audit_file}\``,
    `- Coverage: **${report.outcome}**`,
    ...national.map(source => `- ${source.label}: **${source.status}** (checked ${source.retrievedAt})`),
    ...gaps.map(source => `- Disclosed limitation: ${source.label} — ${source.reasons.join('; ')}`),
  ].join('\n');
  const body = bundle.audit.cadence === 'sunday_rearview' ? [
    '## Sunday outlook review',
    sundayChecklist,
    '## Next step',
    'Merging this PR publishes the blog post when the site deploys from `main`. The post, source audit and publication receipt are included. Review the Lower 48 outlook against the dated NOAA/WPC discussions, city forecasts and source links. Any source gaps remain disclosed in the published article; no separate promotion is required.',
    validation.auditMarkdown,
  ].join('\n\n') : [
    `Generated newsletter candidate: \`${postFile}\`. Coverage: **${report.outcome}**.`,
    'Merging this PR publishes the blog post when the site deploys from `main`. The post, source audit and publication receipt are included. Review the prose and citations; any source gaps remain disclosed in the published article. No separate promotion is required.',
    coverageDisclosure(bundle.audit), validation.auditMarkdown,
  ].join('\n\n');
  fs.writeFileSync('newsletter-output/pr-body.md', body + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body + '\n');
}

if (process.argv[1]?.endsWith('workflow-result.ts')) {
  try { main(); } catch (error) { console.error('[newsletter]', error); process.exitCode = 1; }
}
