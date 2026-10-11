import fs from 'node:fs';
import path from 'node:path';

import { coverageOutcome } from '@/lib/newsletter/coverage';
import { buildReceipt, publicationErrors, readPublicationBundle } from '@/lib/newsletter/publication';
import { validateGeneratedPost } from './validate-post';
import type { ReviewReceipt } from '@/lib/newsletter/publication';

function readDraft(file: string, root: string): string {
  const resolved = path.resolve(file);
  const draftRoot = path.resolve(root, 'content/newsletter-drafts') + path.sep;
  if (!resolved.startsWith(draftRoot) || !/\.mdx?$/.test(resolved)) throw new Error('Select a candidate inside content/newsletter-drafts');
  return fs.readFileSync(resolved, 'utf8');
}

export interface ReviewOptions {
  reviewer: string;
  acknowledged: boolean;
  gapDispositions: Record<string, string>;
}

/** A human records the disposition of each gap after editing and checking the candidate. */
export function recordReview(file: string, options: ReviewOptions, root = process.cwd()): ReviewReceipt {
  if (options.acknowledged !== true) throw new Error('Explicit acknowledgment of the source limitations is required');
  const raw = readDraft(file, root);
  const validation = validateGeneratedPost(file, { root, publication: true, draft: true });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  const bundle = readPublicationBundle(raw, root);
  const gaps = bundle.audit.sources.filter(source => source.status !== 'complete');
  if (gaps.some(source => typeof options.gapDispositions[source.id] !== 'string' || !options.gapDispositions[source.id].trim())) {
    throw new Error('Provide a nonempty disposition for every incomplete source identifier');
  }
  if (Object.keys(options.gapDispositions).some(id => !gaps.some(source => source.id === id))) throw new Error('Disposition references an unknown or complete source');
  const receipt = buildReceipt(raw, bundle.auditRaw, {
    decision: coverageOutcome(bundle.audit) === 'complete' ? 'complete' : 'reviewed-partial',
    reviewer: options.reviewer, gapDispositions: options.gapDispositions,
  });
  fs.writeFileSync(bundle.receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}

/** Promotion is a separate explicit action, and rechecks the exact reviewed files. */
export function promoteDraft(file: string, root = process.cwd()): string {
  const raw = readDraft(file, root);
  const errors = publicationErrors(raw, file, { root, requireAudit: true });
  const images = validateGeneratedPost(file);
  if (errors.length || !images.ok) throw new Error([...errors, ...images.errors].join('\n'));
  const target = path.join(root, 'content/blog', path.basename(file));
  if (fs.existsSync(target)) throw new Error('A public post already exists at the destination');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, raw, { flag: 'wx' });
  return target;
}

function main(): void {
  const [action, file, ...args] = process.argv.slice(2);
  if (!file || !['record', 'promote'].includes(action)) {
    throw new Error('Usage: review.ts record <draft> --reviewer <name> --acknowledge-limitations --dispositions <json-file>, or review.ts promote <draft>');
  }
  if (action === 'promote') {
    console.log(`[review] promoted ${promoteDraft(path.resolve(file))}`);
    return;
  }
  const value = (flag: string): string => args.includes(flag) ? args[args.indexOf(flag) + 1] ?? '' : '';
  const dispositions = value('--dispositions');
  if (!dispositions) throw new Error('--dispositions JSON file is required (use {} for complete coverage)');
  const receipt = recordReview(path.resolve(file), {
    reviewer: value('--reviewer'), acknowledged: args.includes('--acknowledge-limitations'),
    gapDispositions: JSON.parse(fs.readFileSync(dispositions, 'utf8')),
  });
  console.log(`[review] recorded ${receipt.postSha256}; promote separately when ready`);
}

if (process.argv[1]?.endsWith('review.ts')) {
  try { main(); } catch (error) { console.error('[review]', error); process.exitCode = 1; }
}
