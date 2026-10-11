/**
 * Writes a generated post to content/blog/ as a markdown file with the
 * extended newsletter frontmatter. The git/PR step is handled by the
 * GitHub Actions workflow, not this script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { blogHeroImage } from '@/lib/blog/hero';
import { coverageAuditSchema, coverageDisclosure, coverageOutcome } from '@/lib/newsletter/coverage';
import { buildReceipt } from '@/lib/newsletter/publication';
import { buildPostSummary, buildPostTitle } from './post-header';
import type { CoverageAudit, CoverageOutcome } from '@/lib/newsletter/coverage';
import type { ImageAuditEntry, ImageEntry } from './images';
import type { TopicSlug } from './topics';

export interface PublishWednesdayInput {
  cadence: 'wednesday_topic';
  topicSlug: TopicSlug;
  topicTitle: string;
  theme: string;
  body: string;
  openerHash: string;
  keyPhrases: string[];
  similarityMax: number;
  similarityJudge: string;
  modelUsed: string;
  images: ImageEntry[];
  imageAudit?: ImageAuditEntry[];
  heroImage?: string;
  spotlight: string | null;
  retries: number;
  wordCount: number;
  closerUsed: string;
}

export interface PublishSundayInput {
  cadence: 'sunday_rearview';
  body: string;
  openerHash: string;
  keyPhrases: string[];
  similarityMax: number;
  similarityJudge: string;
  modelUsed: string;
  images: ImageEntry[];
  imageAudit?: ImageAuditEntry[];
  heroImage?: string;
  spotlight: string | null;
  retries: number;
  wordCount: number;
  closerUsed: string;
}

export type PublishInput = PublishWednesdayInput | PublishSundayInput;

export interface PublishResult {
  filePath: string;
  auditPath: string;
  outcome: CoverageOutcome;
  slug: string;
  title: string;
}

export async function publishPost(input: PublishInput, opts: { coverage: CoverageAudit; dryRun?: boolean; root?: string }): Promise<PublishResult> {
  const coverage = coverageAuditSchema.parse(opts.coverage);
  const outcome = coverageOutcome(coverage);
  if (outcome === 'fatal') throw new Error('Cannot write a narrative without usable evidence');
  if (coverage.cadence !== input.cadence) throw new Error('Coverage cadence mismatch');
  const root = opts.root ?? process.cwd();
  const date = new Date();
  const isoDate = date.toISOString();
  const datePrefix = isoDate.slice(0, 10);

  const { title, summary, slug } = buildHeader(input, datePrefix);
  const publicationId = `${datePrefix}-${input.cadence.replaceAll('_', '-')}-${randomUUID()}`;
  const auditPath = path.join(root, 'content/newsletter-audits', `${publicationId}.json`);
  const tags = buildTags(input);
  // Hero is the page banner — should never be archival imagery presented
  // without context. Prefer live > reference > archival, then first image.
  // When the catalog produced no images at all (a topic with no entries —
  // the 2026-06-12 biometeorology post shipped with heroImage "" and the
  // blog rendered without any picture), fall back to a generated OG banner
  // so a post never publishes imageless.
  const heroImage = input.heroImage ??
    input.images.find((i) => i.kind === 'live')?.url ??
    input.images.find((i) => (i.kind ?? 'reference') === 'reference')?.url ??
    input.images[0]?.url ??
    blogHeroImage({ title, heroImage: '', tags });

  const frontmatterFields: Record<string, unknown> = {
    publication_version: 1,
    publication_id: publicationId,
    coverage_status: outcome,
    slug,
    title,
    date: isoDate,
    author: '16bitbot',
    summary,
    tags,
    heroImage,
    readTime: Math.max(2, Math.ceil(input.wordCount / 200)),
    cadence: input.cadence,
    opener_hash: input.openerHash,
    key_phrases: input.keyPhrases,
    similarity_max: round(input.similarityMax, 3),
    similarity_judge: input.similarityJudge,
    model_used: input.modelUsed,
    images_used: input.images.map((i) => i.id),
    image_audit: input.imageAudit?.map(formatImageAuditEntry),
    spotlight_active: input.spotlight,
    generation_retries: input.retries,
    word_count: input.wordCount,
    closer_used: input.closerUsed,
  };

  if (input.cadence === 'wednesday_topic') {
    frontmatterFields.topic_slug = input.topicSlug;
    frontmatterFields.topic_title = input.topicTitle;
    frontmatterFields.theme = input.theme;
  }

  const yaml = serializeFrontmatter(frontmatterFields);
  const fileBody = `---\n${yaml}---\n\n${input.body.trim()}\n\n${coverageDisclosure(coverage)}\n`;
  const fileName = `${datePrefix}-${slug}.md`;
  const directory = outcome === 'complete' ? path.join(root, 'content/blog') : path.join(root, 'content/newsletter-drafts', publicationId);
  const filePath = path.join(directory, fileName);
  const result = { filePath, auditPath, outcome, slug, title };

  if (opts.dryRun) {
    console.log(`[publish] DRY-RUN — would write ${filePath} (${fileBody.length} bytes)`);
    return result;
  }

  if (fs.existsSync(filePath)) throw new Error('Post already exists; refusing to overwrite it');
  fs.mkdirSync(directory, { recursive: true });
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  const auditRaw = JSON.stringify(coverage, null, 2) + '\n';
  fs.writeFileSync(auditPath, auditRaw, 'utf8');
  if (outcome === 'complete') {
    const receipt = buildReceipt(fileBody, auditRaw, { decision: 'complete', reviewer: 'coverage-validation', gapDispositions: {} });
    fs.writeFileSync(auditPath.replace(/\.json$/, '.review.json'), JSON.stringify(receipt, null, 2) + '\n');
  }
  fs.writeFileSync(filePath, fileBody, 'utf8');
  console.log(`[publish] wrote ${filePath} (${fileBody.length} bytes)`);
  return result;
}

function formatImageAuditEntry(entry: ImageAuditEntry): string {
  return [
    `id=${entry.id}`,
    `lane=${entry.lane}`,
    `anchor=${entry.anchor}`,
    `tags=${entry.topic_tags.join(',')}`,
    `caption=${entry.caption}`,
  ].join('; ');
}

function buildHeader(input: PublishInput, datePrefix: string): { title: string; summary: string; slug: string } {
  if (input.cadence === 'wednesday_topic') {
    // Keyword-led slug: topic + date (not first-sentence theme prose).
    const slug = slugify(`${input.topicSlug}-${datePrefix}`);
    // Title and summary are cut on word boundaries by ./post-header. Raw
    // .slice() here is what shipped titles like "Two volcanoes on U.S".
    const title = buildPostTitle(input.topicTitle, input.theme);
    const summary = buildPostSummary(input.theme, input.topicTitle);
    return { title, summary, slug };
  }
  const dateLabel = formatDateLabel(datePrefix);
  const slug = `this-week-in-weather-${datePrefix}`;
  const title = `This Week in Weather — ${dateLabel}`;
  const summary = `Severe weather rearview, storm reports, and the forecast pattern for the week of ${dateLabel}.`;
  return { title, summary, slug };
}

/** Exported for unit tests — keep slug generation stable and SEO-safe. */
export function buildPublishHeaderForTest(
  input: PublishInput,
  datePrefix: string,
): { title: string; summary: string; slug: string } {
  return buildHeader(input, datePrefix);
}

function formatDateLabel(datePrefix: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePrefix);
  if (!match) return datePrefix;
  const [, y, m, d] = match;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthName = months[Number(m) - 1] ?? m;
  return `${monthName} ${Number(d)}, ${y}`;
}

function buildTags(input: PublishInput): string[] {
  if (input.cadence === 'wednesday_topic') {
    const tags = new Set<string>([input.topicSlug.replace(/_/g, '-'), 'weather', 'science']);
    for (const img of input.images) {
      for (const t of img.topic_tags) tags.add(t.replace(/_/g, '-'));
    }
    return Array.from(tags).slice(0, 6);
  }
  return ['weekly-recap', 'forecast', 'severe-weather', 'space-weather', 'roadmap'];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function serializeFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === null) {
      lines.push(`${key}: null`);
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${quoteIfNeeded(String(item))}`);
        }
      }
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
      continue;
    }
    lines.push(`${key}: ${quoteIfNeeded(String(value))}`);
  }
  return lines.join('\n') + '\n';
}

function quoteIfNeeded(s: string): string {
  if (/^[a-z0-9_\-./: ]+$/i.test(s) && !/^(true|false|null|yes|no|on|off)$/i.test(s) && !/^-/.test(s) && !/^\d+:\d+/.test(s)) {
    if (!s.includes(': ') && !s.startsWith(' ') && !s.endsWith(' ')) return s;
  }
  return JSON.stringify(s);
}

function round(n: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}
