import matter from 'gray-matter';

import { isAllowedSourceUrl } from '@/lib/education/content';
import { isKnownDiagramId } from '@/lib/education/diagrams';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildGuideMarkdown,
  publishGuide,
  UnknownSourceError,
  UnpublishableGuideError,
} from '../../scripts/education/publish';
import type { EligibleEntry } from '../../scripts/education/queue';

const entry: EligibleEntry = {
  kind: 'cloud',
  slug: 'cirrus',
  entryName: 'CIRRUS',
  title: 'Cirrus',
  href: '/education/cloud-types/cirrus',
  hasGuide: false,
  renders: true,
};

const base = {
  entry,
  summary: 'Ice crystals eight kilometres up, and the reason a halo around the sun is a forecast rather than a curiosity.',
  body: '## How it forms\n\nProse.',
  sourceIds: ['jetstream-clouds', 'glossary-cirrus', 'spc-faq'],
  diagrams: [{ id: 'cloud-altitude-plot', insertAfter: 'Prose.' }],
  modelUsed: 'claude-sonnet-4-6',
  retries: 1,
  wordCount: 903,
  now: new Date('2026-08-29T00:00:00Z'),
};

describe('buildGuideMarkdown', () => {
  const markdown = buildGuideMarkdown(base);
  const parsed = matter(markdown);

  it('writes frontmatter the Guide loader can read back', () => {
    expect(parsed.data.entryKind).toBe('cloud');
    expect(parsed.data.entrySlug).toBe('cirrus');
    expect(parsed.data.title).toBe('Cirrus');
    expect(parsed.data.summary).toBe(base.summary);
    expect(parsed.content.trim()).toBe(base.body);
  });

  it('resolves catalog ids into citations on allowed hosts', () => {
    const sources = parsed.data.sources as { label: string; url: string }[];
    expect(sources).toHaveLength(3);
    for (const source of sources) {
      expect(source.label).toBeTruthy();
      expect(isAllowedSourceUrl(source.url)).toBe(true);
    }
  });

  it('keeps diagram references to ids the registry knows', () => {
    const diagrams = parsed.data.diagrams as { id: string; insertAfter: string }[];
    expect(diagrams).toHaveLength(1);
    expect(isKnownDiagramId(diagrams[0].id)).toBe(true);
    expect(diagrams[0].insertAfter).toBe('Prose.');
  });

  it('records the run rather than claiming a human review', () => {
    // `reviewed` prints as "Checked against sources <date>" and feeds
    // dateModified in the JSON-LD; the generator has not checked anything.
    expect(parsed.data.reviewed).toBeUndefined();
    // Quoted on the way out: a bare YAML date comes back as a Date object.
    expect(parsed.data.generated).toBe('2026-08-29');
    expect(parsed.data.model_used).toBe('claude-sonnet-4-6');
    expect(parsed.data.generation_retries).toBe(1);
    expect(parsed.data.word_count).toBe(903);
  });

  it('drops a repeated citation instead of listing it twice', () => {
    const parsedTwice = matter(
      buildGuideMarkdown({ ...base, sourceIds: [...base.sourceIds, 'spc-faq'] }),
    );
    expect((parsedTwice.data.sources as unknown[]).length).toBe(3);
  });

  it('omits the diagrams key entirely when there are none', () => {
    expect(matter(buildGuideMarkdown({ ...base, diagrams: [] })).data.diagrams).toBeUndefined();
  });

  // A value ending in a colon is a YAML parse error, not a string. The finalize
  // prompt asks for a phrase from the end of a paragraph, which is exactly
  // where one sits, and getGuideContent would then throw inside
  // generateStaticParams and fail the production build for the whole route.
  it.each([
    ['an anchor ending in a colon', 'the question is this:'],
    ['an anchor with a tab before a hash', 'ranked by size\t#1 first'],
    ['an anchor containing a colon and space', 'the rule: never cite twice'],
  ])('keeps %s intact through YAML', (_label, insertAfter) => {
    const reparsed = matter(
      buildGuideMarkdown({ ...base, diagrams: [{ id: 'cloud-altitude-plot', insertAfter }] }),
    );
    expect((reparsed.data.diagrams as { insertAfter: string }[])[0].insertAfter).toBe(insertAfter);
  });

  it('keeps a summary ending in a colon intact through YAML', () => {
    const summary = 'What a cirrus deck is telling you about the next eight hours, in one word:';
    expect(matter(buildGuideMarkdown({ ...base, summary })).data.summary).toBe(summary);
  });

  it('refuses a source id that is not in the catalog', () => {
    expect(() => buildGuideMarkdown({ ...base, sourceIds: ['made-up'] })).toThrow(UnknownSourceError);
  });

  it('quotes a summary that would otherwise break the YAML', () => {
    const tricky = 'Cirrus: the cloud that forecasts, and why a halo means the ice is hexagonal rather than round.';
    const reparsed = matter(buildGuideMarkdown({ ...base, summary: tricky }));
    expect(reparsed.data.summary).toBe(tricky);
  });
});

describe('publishGuide', () => {
  // The write is the sink for model output. generate.ts gates the body before
  // it gets here, but the guard belongs at the filesystem too — a caller that
  // does not know the convention should not be able to write past it.
  it('refuses to write a body that fails the prose gate', () => {
    expect(() => publishGuide({ ...base, body: '## Thin\n\nToo short to publish.' })).toThrow(
      UnpublishableGuideError,
    );
  });

  it('writes nothing to disk when the gate rejects the body, even on a dry run', () => {
    const before = fs.existsSync(path.join(os.tmpdir(), 'never-written.md'));
    expect(() =>
      publishGuide({ ...base, body: 'no headings, far too short' }, { dryRun: true }),
    ).toThrow(UnpublishableGuideError);
    expect(fs.existsSync(path.join(os.tmpdir(), 'never-written.md'))).toBe(before);
  });
});
