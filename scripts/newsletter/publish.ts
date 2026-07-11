/**
 * Writes a generated post to content/blog/ as a markdown file with the
 * extended newsletter frontmatter. The git/PR step is handled by the
 * GitHub Actions workflow, not this script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { blogHeroImage } from '@/lib/blog/hero';
import type { ImageAuditEntry, ImageEntry } from './images';
import type { TopicSlug } from './topics';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

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
  slug: string;
  title: string;
}

export async function publishPost(input: PublishInput, opts: { dryRun?: boolean } = {}): Promise<PublishResult> {
  const date = new Date();
  const isoDate = date.toISOString();
  const datePrefix = isoDate.slice(0, 10);

  const { title, summary, slug } = buildHeader(input, datePrefix);
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
  const fileBody = `---\n${yaml}---\n\n${input.body.trim()}\n`;
  const fileName = `${datePrefix}-${slug}.md`;
  const filePath = path.join(BLOG_DIR, fileName);

  if (opts.dryRun) {
    console.log(`[publish] DRY-RUN — would write ${filePath} (${fileBody.length} bytes)`);
    return { filePath, slug, title };
  }

  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.writeFileSync(filePath, fileBody, 'utf8');
  console.log(`[publish] wrote ${filePath} (${fileBody.length} bytes)`);
  return { filePath, slug, title };
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
    const themeSnippet = input.theme.slice(0, 50).replace(/[.!?]+$/, '');
    const title = `${input.topicTitle}: ${themeSnippet}`.slice(0, 70);
    const summary = input.theme.length > 0 ? input.theme.slice(0, 155) : input.topicTitle;
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
