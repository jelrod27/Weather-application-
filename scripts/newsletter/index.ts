/**
 * Newsletter generator entrypoint.
 *
 * Usage:
 *   tsx scripts/newsletter/index.ts --cadence wednesday [--dry-run]
 *   tsx scripts/newsletter/index.ts --cadence sunday [--dry-run]
 *
 * Env:
 *   ANTHROPIC_API_KEY  required
 *   NEWSLETTER_MODEL   optional, defaults to claude-sonnet-4-6
 */

import fs from 'node:fs';
import path from 'node:path';
import { coverageOutcome } from '@/lib/newsletter/coverage';
import { validateGeneratedPost } from './validate-post';

import { deriveTheme } from './post-header';
import { publishPost } from './publish';
import { DEFAULT_MODEL } from './repetition';
import { runSunday } from './sunday';
import { runWednesday } from './wednesday';
import type { CoverageAudit } from '@/lib/newsletter/coverage';
import type { PublishResult } from './publish';

interface Args {
  cadence: 'wednesday' | 'sunday';
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  let cadence: Args['cadence'] | null = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cadence') {
      const v = argv[++i];
      if (v !== 'wednesday' && v !== 'sunday') {
        throw new Error(`--cadence must be 'wednesday' or 'sunday', got "${v}"`);
      }
      cadence = v;
    } else if (arg === '--dry-run' || arg === '--dry') {
      dryRun = true;
    }
  }
  if (!cadence) throw new Error('--cadence is required');
  return { cadence, dryRun };
}

async function main() {
  const { cadence, dryRun } = parseArgs(process.argv.slice(2));
  console.log(`[newsletter] cadence=${cadence} dryRun=${dryRun} model=${DEFAULT_MODEL}`);
  const startedAt = Date.now();
  let published: PublishResult;
  const onAudit = (coverage: CoverageAudit): void => {
    writeRunReport({ outcome: coverageOutcome(coverage), stage: 'generation', coverage });
  };

  if (cadence === 'wednesday') {
    const result = await runWednesday(onAudit);
    console.log('[newsletter] generation complete', {
      topic: result.topic.slug,
      retries: result.retries,
      similarityMax: result.similarity.max,
      wordCount: result.wordCount,
    });
    const theme = deriveTheme(result.draft, result.newsAngle?.angle ?? '', result.topic.title);
    published = await publishPost(
      {
        cadence: 'wednesday_topic',
        topicSlug: result.topic.slug,
        topicTitle: result.topic.title,
        theme,
        body: result.draft,
        openerHash: result.openerHash,
        keyPhrases: result.keyPhrases,
        similarityMax: result.similarity.max,
        similarityJudge: DEFAULT_MODEL,
        modelUsed: DEFAULT_MODEL,
        images: result.images,
        imageAudit: result.imageAudit,
        spotlight: result.spotlight,
        retries: result.retries,
        wordCount: result.wordCount,
        closerUsed: result.closer.id,
      },
      { dryRun, coverage: result.coverage },
    );
  } else {
    const result = await runSunday(onAudit);
    console.log('[newsletter] generation complete', {
      retries: result.retries,
      similarityMax: result.similarity.max,
      wordCount: result.wordCount,
    });
    published = await publishPost(
      {
        cadence: 'sunday_rearview',
        body: result.draft,
        openerHash: result.openerHash,
        keyPhrases: result.keyPhrases,
        similarityMax: result.similarity.max,
        similarityJudge: DEFAULT_MODEL,
        modelUsed: DEFAULT_MODEL,
        images: result.images,
        imageAudit: result.imageAudit,
        heroImage: result.heroImage,
        spotlight: result.spotlight,
        retries: result.retries,
        wordCount: result.wordCount,
        closerUsed: result.closer.id,
      },
      { dryRun, coverage: result.coverage },
    );
  }

  if (!dryRun) {
    fs.copyFileSync(published.filePath, path.join(OUTPUT_DIR, 'candidate.md'));
    const validation = validateGeneratedPost(published.filePath, { publication: true, draft: published.outcome === 'partial' });
    if (!validation.ok) {
      writeRunReport({ ...published, outcome: 'fatal', stage: 'validation', errors: validation.errors });
      throw new Error('Generated candidate failed validation; artifacts retained for inspection');
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'image-audit.md'), validation.auditMarkdown);
  }
  writeRunReport({ ...published, stage: 'ready', dryRun });
  console.log(`[newsletter] outcome=${published.outcome} file=${published.filePath}`);
  console.log(`[newsletter] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

const OUTPUT_DIR = path.resolve('newsletter-output');

function writeRunReport(report: Record<string, unknown>): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  // Preserve the collection audit even when later generation or validation fails.
  if (report.coverage) fs.writeFileSync(path.join(OUTPUT_DIR, 'coverage.json'), JSON.stringify(report.coverage, null, 2) + '\n');
  const { coverage: _coverage, ...summary } = report;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'run.json'), JSON.stringify(summary, null, 2) + '\n');
}

main().catch((err) => {
  const reportPath = path.join(OUTPUT_DIR, 'run.json');
  const prior = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {};
  writeRunReport({ ...prior, outcome: 'fatal', failure: 'Collection, generation, or validation failed; inspect the retained audit and workflow log' });
  console.error('[newsletter] fatal:', err);
  process.exitCode = 1;
});
