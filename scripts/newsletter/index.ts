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

import { publishPost } from './publish';
import { DEFAULT_MODEL } from './repetition';
import { runSunday } from './sunday';
import { runWednesday } from './wednesday';

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

  if (cadence === 'wednesday') {
    const result = await runWednesday();
    console.log('[newsletter] generation complete', {
      topic: result.topic.slug,
      retries: result.retries,
      similarityMax: result.similarity.max,
      wordCount: result.wordCount,
    });
    const theme = deriveTheme(result.draft, result.newsAngle?.angle ?? '', result.topic.title);
    await publishPost(
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
      { dryRun },
    );
  } else {
    const result = await runSunday();
    console.log('[newsletter] generation complete', {
      retries: result.retries,
      similarityMax: result.similarity.max,
      wordCount: result.wordCount,
    });
    await publishPost(
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
      { dryRun },
    );
  }

  console.log(`[newsletter] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

/**
 * Pulls a short theme line from the generated draft. Prefers the first
 * sentence of the body that isn't a heading, falls back to the news
 * angle, then to the topic title.
 */
function deriveTheme(markdown: string, newsAngle: string, topicTitle: string): string {
  const lines = markdown
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('!'));
  const firstParagraph = lines[0];
  if (firstParagraph) {
    const firstSentence = firstParagraph.split(/(?<=[.!?])\s/)[0];
    if (firstSentence && firstSentence.length >= 20) return firstSentence.trim().slice(0, 120);
  }
  if (newsAngle) return newsAngle.slice(0, 120);
  return topicTitle;
}

main().catch((err) => {
  console.error('[newsletter] fatal:', err);
  process.exit(1);
});
