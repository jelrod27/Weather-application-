/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import matter from 'gray-matter';
import { publishPost } from '../../scripts/newsletter/publish';
import type { PublishWednesdayInput } from '../../scripts/newsletter/publish';
import type { CoverageAudit } from '@/lib/newsletter/coverage';

it.each(['../../outside', '/tmp/outside', '..\\..\\outside', 'unsafe\nslug: ../outside'])('confines generated prose and metadata to content files for topic %j', async topicSlug => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-path-boundary-'));
  const window = { start: '2026-11-01T12:00:00.000Z', end: '2026-11-08T12:00:00.000Z' };
  const coverage: CoverageAudit = { version: 1, cadence: 'wednesday_topic', generatedAt: window.end, window, sources: [{
    id: 'test-headlines', label: 'Headline sample', url: 'https://www.noaa.gov/', retrievedAt: window.end,
    requested: window, covered: [window], usable: true, status: 'complete', records: 1,
    observationStart: window.start, observationEnd: window.start, unit: 'sample', reasons: [],
  }] };
  try {
    const result = await publishPost({
      // Deliberately cross the compile-time topic union to exercise the writer's
      // runtime filename boundary with hostile metadata.
      cadence: 'wednesday_topic', topicSlug: topicSlug as PublishWednesdayInput['topicSlug'], topicTitle: 'Weather science', theme: 'A quoted "title" with a newline\nand YAML: value',
      body: 'External narrative remains Markdown data.', openerHash: 'test', keyPhrases: [], similarityMax: 0,
      similarityJudge: 'test', modelUsed: 'test', images: [], spotlight: null, retries: 0, wordCount: 8, closerUsed: 'test',
    }, { coverage, root });
    expect(path.dirname(result.filePath)).toBe(path.join(root, 'content/blog'));
    expect(path.basename(result.filePath)).toMatch(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/);
    expect(path.dirname(result.auditPath)).toBe(path.join(root, 'content/newsletter-audits'));
    const parsed = matter(fs.readFileSync(result.filePath, 'utf8'));
    expect(parsed.data.topic_slug).toBe(topicSlug);
    expect(parsed.content).toContain('External narrative remains Markdown data.');
    expect(fs.readdirSync(root)).toEqual(['content']);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
