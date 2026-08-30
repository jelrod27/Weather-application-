/**
 * Education Guide generator entrypoint.
 *
 * Usage:
 *   tsx scripts/education/index.ts --list
 *   tsx scripts/education/index.ts --next [--dry-run]
 *   tsx scripts/education/index.ts --slug cirrus [--kind cloud] [--dry-run]
 *
 * Env:
 *   ANTHROPIC_API_KEY  required (except for --list)
 *   NEWSLETTER_MODEL   optional, defaults to claude-sonnet-4-6
 */

import type { EducationEntryKind } from '@/lib/education/entries';

import { DEFAULT_MODEL } from '../newsletter/repetition';
import { generateGuide } from './generate';
import { publishGuide } from './publish';
import {
  getEligibleEntries,
  getGuideQueue,
  resolveTarget,
  KIND_ROUTE_SEGMENT,
  KINDS_WITH_GUIDE_RENDERING,
  type EligibleEntry,
} from './queue';

const KINDS: EducationEntryKind[] = ['cloud', 'weather-system', 'phenomenon'];

interface Args {
  list: boolean;
  next: boolean;
  slug: string | null;
  kind: EducationEntryKind | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { list: false, next: false, slug: null, kind: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') args.list = true;
    else if (arg === '--next') args.next = true;
    else if (arg === '--dry-run' || arg === '--dry') args.dryRun = true;
    else if (arg === '--slug') args.slug = argv[++i] ?? null;
    else if (arg === '--kind') {
      const value = argv[++i];
      if (!KINDS.includes(value as EducationEntryKind)) {
        throw new Error(`--kind must be one of ${KINDS.join(', ')}, got "${value}"`);
      }
      args.kind = value as EducationEntryKind;
    } else throw new Error(`Unknown argument "${arg}"`);
  }
  if (!args.list && !args.next && !args.slug) {
    throw new Error('Pass --list, --next, or --slug <entry-slug>');
  }
  return args;
}

function printList(): void {
  const entries = getEligibleEntries();
  const done = entries.filter((entry) => entry.hasGuide).length;
  console.log(`${done}/${entries.length} published Guides have long-form prose.\n`);
  for (const entry of entries) {
    const status = entry.hasGuide ? 'guide  ' : 'queued ';
    const wiring = entry.renders ? '' : '  (kind not wired to render Guides yet)';
    console.log(`${status} ${entry.kind.padEnd(15)} ${entry.slug.padEnd(34)} ${entry.title}${wiring}`);
  }
  const unwired = entries.filter((entry) => !entry.renders && !entry.hasGuide);
  if (unwired.length > 0) {
    console.log(
      `\n${unwired.length} queued Entries belong to kinds whose detail route does not render Guides ` +
        `(rendering kinds: ${KINDS_WITH_GUIDE_RENDERING.join(', ')}). Wire the route first.`,
    );
  }
}

function pickTarget(args: Args): EligibleEntry {
  if (args.slug) return resolveTarget(args.slug, args.kind ?? undefined);
  const queue = getGuideQueue().filter((entry) => !args.kind || entry.kind === args.kind);
  const target = queue.find((entry) => entry.renders);
  if (!target) {
    throw new Error(
      queue.length === 0
        ? 'Every eligible Entry already has a Guide. The queue is finished; see planning/adr/0001 before adding more.'
        : 'Nothing left in the queue for a kind that renders Guides. Wire the remaining routes first.',
    );
  }
  return target;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    printList();
    return;
  }

  const target = pickTarget(args);

  if (target.hasGuide) {
    throw new Error(
      `${target.kind}:${target.slug} already has a Guide. Edit the markdown directly rather than regenerating over a reviewed page.`,
    );
  }
  if (!target.renders) {
    throw new Error(
      `${target.kind} Entries do not render long-form Guides yet — only these kinds do: ${KINDS_WITH_GUIDE_RENDERING.join(', ')}. ` +
        `A Guide written now would sit in content/education/ unread. Wire app/education/${KIND_ROUTE_SEGMENT[target.kind]}/[slug] ` +
        `to getGuideContent and add the kind to KINDS_WITH_GUIDE_RENDERING first.`,
    );
  }

  console.log(`[education] generating ${target.kind}:${target.slug} with ${DEFAULT_MODEL}`);
  const startedAt = Date.now();
  const result = await generateGuide(target);

  console.log('[education] generation complete', {
    words: result.wordCount,
    retries: result.retries,
    sources: result.sourceIds.length,
    diagrams: result.diagrams.map((d) => d.id),
  });

  publishGuide(
    {
      entry: result.entry,
      summary: result.summary,
      body: result.body,
      sourceIds: result.sourceIds,
      diagrams: result.diagrams,
      modelUsed: result.modelUsed,
      retries: result.retries,
      wordCount: result.wordCount,
    },
    { dryRun: args.dryRun },
  );

  console.log(`[education] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error('[education] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
