import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { z } from 'zod';

import { coverageAuditSchema, coverageDisclosure, coverageOutcome } from './coverage';
import legacyPosts from './legacy-posts.json';
import type { CoverageAudit } from './coverage';

const receiptSchema = z.object({
  version: z.literal(1),
  postSha256: z.string().regex(/^[a-f0-9]{64}$/),
  auditSha256: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(['complete', 'reviewed-partial']),
  reviewer: z.string().trim().min(1),
  acknowledged: z.literal(true),
  reviewedAt: z.string().datetime(),
  gapDispositions: z.record(z.string(), z.string().trim().min(1)),
});
export type ReviewReceipt = z.infer<typeof receiptSchema>;

export interface PublicationBundle {
  id: string;
  audit: CoverageAudit;
  auditRaw: string;
  auditPath: string;
  receiptPath: string;
}

/** Normalize checkout line endings, but bind every byte of content and frontmatter. */
export function contentDigest(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n')).digest('hex');
}

export function requiresCoverage(data: Record<string, unknown>): boolean {
  return data.author === '16bitbot' || Boolean(data.cadence || data.model_used || data.publication_version || data.publication_id);
}

export function readPublicationBundle(raw: string, root = process.cwd()): PublicationBundle {
  const { data } = matter(raw);
  if (data.publication_version !== 1 || typeof data.publication_id !== 'string' || !/^[a-z0-9-]{1,150}$/.test(data.publication_id)) {
    throw new Error('Generated post needs versioned source coverage metadata');
  }
  const id = data.publication_id;
  const auditPath = path.join(root, 'content/newsletter-audits', `${id}.json`);
  const receiptPath = path.join(root, 'content/newsletter-audits', `${id}.review.json`);
  const auditRaw = fs.readFileSync(auditPath, 'utf8');
  const audit = coverageAuditSchema.parse(JSON.parse(auditRaw));
  if (audit.cadence !== data.cadence) throw new Error('Audit cadence does not match the post');
  if (data.coverage_status !== coverageOutcome(audit)) throw new Error('Post coverage status does not match its audit');
  return { id, audit, auditRaw, auditPath, receiptPath };
}

export interface PublicationCheckOptions {
  root?: string;
  requireAudit?: boolean;
  allowDraft?: boolean;
}

/** Shared by all public discovery, generation validation, and the required PR check. Fail closed. */
export function publicationErrors(raw: string, filename: string, opts: PublicationCheckOptions = {}): string[] {
  try {
    const { data, content } = matter(raw);
    if (data.draft === true || data.published === false) return ['Post is explicitly unpublished'];
    if (!opts.requireAudit && !requiresCoverage(data)) return [];
    const legacy = legacyPosts as Record<string, string>;
    if (!opts.requireAudit && !data.publication_version && legacy[path.basename(filename)] === contentDigest(raw)) return [];
    const bundle = readPublicationBundle(raw, opts.root);
    const outcome = coverageOutcome(bundle.audit);
    if (outcome === 'fatal') return ['No usable evidence; failure reports cannot be published'];
    if (!content.includes(coverageDisclosure(bundle.audit))) return ['Required source coverage disclosure is missing or changed'];
    if (opts.allowDraft) return [];
    const receipt = receiptSchema.parse(JSON.parse(fs.readFileSync(bundle.receiptPath, 'utf8')));
    if (receipt.postSha256 !== contentDigest(raw) || receipt.auditSha256 !== contentDigest(bundle.auditRaw)) {
      return ['Post or coverage audit changed after approval; review again'];
    }
    if (outcome === 'partial') {
      if (receipt.decision !== 'reviewed-partial') return ['Partial coverage requires explicit review and promotion'];
      const gaps = bundle.audit.sources.filter(source => source.status !== 'complete');
      if (gaps.some(source => !receipt.gapDispositions[source.id]?.trim())) return ['Every coverage gap needs a recorded reviewer disposition'];
    } else if (receipt.decision !== 'complete') return ['Review decision does not match coverage'];
    return [];
  } catch {
    return ['Missing or invalid publication audit/approval; generated post remains unpublished'];
  }
}

export function buildReceipt(raw: string, auditRaw: string, review: Pick<ReviewReceipt, 'decision' | 'reviewer' | 'gapDispositions'>): ReviewReceipt {
  return receiptSchema.parse({
    version: 1, postSha256: contentDigest(raw), auditSha256: contentDigest(auditRaw),
    ...review, acknowledged: true, reviewedAt: new Date().toISOString(),
  });
}
