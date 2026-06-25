/**
 * Validates a generated newsletter post before the GitHub Action commits and
 * opens a PR. Sunday posts get the strictest narrative-fit checks because
 * their data-driven lead can drift away from the generic image catalog, while
 * Wednesday posts use the same technical gate plus image-audit metadata.
 */

import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { allowedBlogUrl } from '@/lib/blog/allowed-hosts';
import { getNarrativeFitErrors } from './narrative-fit';
import { IMAGES, type ImageEntry } from './images';

interface MarkdownImage {
  alt: string;
  url: string;
}

interface ParsedAuditEntry {
  id: string;
  lane: string;
  anchor: string;
  tags: string;
  caption: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  auditMarkdown: string;
}

export function validateGeneratedPost(filePath: string): ValidationResult {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const errors: string[] = [];
  const imagesById = new Map(IMAGES.map((img) => [img.id, img]));
  const imagesByUrl = new Map(IMAGES.map((img) => [img.url, img]));
  const markdownImages = extractMarkdownImages(content);
  const imagesUsed = Array.isArray(data.images_used)
    ? data.images_used.filter((id): id is string => typeof id === 'string')
    : [];
  const auditEntries = parseAuditEntries(data.image_audit);
  const heroImage = typeof data.heroImage === 'string' ? data.heroImage : '';

  if (/!\[[^\]]*\](?!\()/g.test(content)) {
    errors.push('Found bare image markdown without a URL.');
  }

  for (const image of markdownImages) {
    if (!/^https?:\/\//i.test(image.url)) {
      errors.push(`Found non-absolute image URL "${image.url}" for "${image.alt}".`);
      continue;
    }
    if (!allowedBlogUrl(image.url)) {
      errors.push(`Image URL is not on the blog allow-list: ${image.url}`);
    }
    if (!imagesByUrl.has(image.url)) {
      errors.push(`Image URL is not present in scripts/newsletter/images.ts: ${image.url}`);
    }
  }

  if (heroImage && !heroImage.startsWith('/api/og/')) {
    if (!/^https?:\/\//i.test(heroImage)) {
      errors.push(`Hero image must be a generated OG path or absolute URL: ${heroImage}`);
    } else {
      if (!allowedBlogUrl(heroImage)) {
        errors.push(`Hero image URL is not on the blog allow-list: ${heroImage}`);
      }
      const catalogHero = imagesByUrl.get(heroImage);
      if (!catalogHero) {
        errors.push(`External hero image is not present in scripts/newsletter/images.ts: ${heroImage}`);
      } else {
        errors.push(...getNarrativeFitErrors(content, catalogHero));
      }
    }
  }

  for (const id of imagesUsed) {
    const image = imagesById.get(id);
    if (!image) {
      errors.push(`images_used references unknown catalog id "${id}".`);
      continue;
    }
    if (!markdownImages.some((img) => img.url === image.url)) {
      errors.push(`images_used id "${id}" does not appear as a body image URL.`);
    }
  }

  for (const image of markdownImages) {
    const catalogImage = imagesByUrl.get(image.url);
    if (catalogImage && !imagesUsed.includes(catalogImage.id)) {
      errors.push(`Body image "${catalogImage.id}" is missing from images_used.`);
    }
  }

  if (
    (data.cadence === 'sunday_rearview' || data.cadence === 'wednesday_topic') &&
    imagesUsed.length > 0 &&
    auditEntries.length === 0
  ) {
    errors.push(`${data.cadence} post has images_used but is missing image_audit frontmatter.`);
  }

  if (data.cadence === 'sunday_rearview' || data.cadence === 'wednesday_topic') {
    for (const entry of auditEntries) {
      if (!imagesUsed.includes(entry.id)) {
        errors.push(`image_audit id "${entry.id}" is not listed in images_used.`);
      }
      if (!entry.anchor) {
        errors.push(`image_audit id "${entry.id}" is missing a placement anchor.`);
      }
    }
  }

  for (const image of markdownImages) {
    const catalogImage = imagesByUrl.get(image.url);
    if (catalogImage) {
      errors.push(...getNarrativeFitErrors(content, catalogImage));
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    auditMarkdown: renderAuditMarkdown(auditEntries, imagesUsed, imagesById),
  };
}

function extractMarkdownImages(content: string): MarkdownImage[] {
  const images: MarkdownImage[] = [];
  const rx = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = rx.exec(content)) !== null) {
    images.push({ alt: match[1], url: match[2].trim() });
  }
  return images;
}

function parseAuditEntries(value: unknown): ParsedAuditEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => {
      const fields = new Map<string, string>();
      for (const part of entry.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key && rest.length > 0) fields.set(key, rest.join('=').trim());
      }
      return {
        id: fields.get('id') ?? '',
        lane: fields.get('lane') ?? '',
        anchor: fields.get('anchor') ?? '',
        tags: fields.get('tags') ?? '',
        caption: fields.get('caption') ?? '',
      };
    });
}

function renderAuditMarkdown(
  entries: ParsedAuditEntry[],
  imagesUsed: string[],
  imagesById: Map<string, ImageEntry>,
): string {
  const lines = ['## Image Audit'];
  const ids = entries.length > 0 ? entries.map((entry) => entry.id) : imagesUsed;
  if (ids.length === 0) {
    lines.push('- No catalog images embedded; post relies on the generated OG hero.');
    return lines.join('\n');
  }
  for (const id of ids) {
    const entry = entries.find((item) => item.id === id);
    const image = imagesById.get(id);
    const caption = entry?.caption || image?.caption || 'Unknown image';
    const tags = entry?.tags || image?.topic_tags.join(',') || 'unknown';
    const lane = entry?.lane || 'unknown';
    const anchor = entry?.anchor || 'unknown';
    lines.push(`- \`${id}\` (${lane}; anchor: "${anchor}") — ${caption} Tags: ${tags}`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => !arg.startsWith('-'));
  const auditOnly = args.includes('--audit');
  if (!fileArg) throw new Error('Usage: tsx scripts/newsletter/validate-post.ts <post.md> [--audit]');

  const result = validateGeneratedPost(path.resolve(fileArg));
  if (auditOnly && result.auditMarkdown) {
    console.log(result.auditMarkdown);
  }
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`[validate-post] ${error}`);
    }
    process.exit(1);
  }
  if (!auditOnly) {
    console.log(`[validate-post] ${fileArg} passed`);
  }
}

if (process.argv[1]?.endsWith('validate-post.ts')) {
  main().catch((err) => {
    console.error('[validate-post] fatal:', err);
    process.exit(1);
  });
}
