import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { getCloudBySlug } from '@/lib/education/entries';
import { checkBody, checkFinalize } from '../../scripts/education/gates';

const exemplar = matter(
  fs.readFileSync(
    path.join(process.cwd(), 'content', 'education', 'clouds', 'cumulonimbus.md'),
    'utf8',
  ),
);

describe('checkBody', () => {
  it('passes the exemplar Guide', () => {
    expect(checkBody(exemplar.content.trim())).toEqual([]);
  });

  // Containment: a drafted body is untrusted text, so nothing in it may reach
  // off the page. See planning/adr/0002.
  it.each([
    ['a markdown link', 'Read [the NWS page](https://www.weather.gov/safety) for more.', /markdown link/],
    ['a bare URL', 'The NWS publishes it at https://www.weather.gov/safety every day.', /URL/],
    ['a www host', 'Details live at www.weather.gov and are updated hourly.', /URL/],
    ['an image', '![A storm](https://example.com/storm.png)', /embeds an image/],
    ['raw HTML', 'The updraft <script>alert(1)</script> feeds the tower.', /raw HTML/],
    ['a code fence', '```\nnot prose\n```', /code fence/],
    ['an H1', '# Cumulonimbus\n\nProse follows.', /H1 heading/],
  ])('rejects %s', (_label, snippet, expected) => {
    const body = `${exemplar.content.trim()}\n\n${snippet}`;
    expect(checkBody(body).join(' ')).toMatch(expected);
  });

  it('rejects a draft that returned its own frontmatter', () => {
    const body = `---\ntitle: Sneaky\n---\n\n${exemplar.content.trim()}`;
    expect(checkBody(body).join(' ')).toMatch(/frontmatter/);
  });

  // Relative destinations survive rehype-sanitize as live anchors, and both
  // READMEs promise a Guide body carries no links at all.
  it.each([
    ['[the glossary](cirrus)'],
    ['[see above](#how-it-forms)'],
    ['[a sibling](../phenomena/haboob)'],
  ])('rejects the relative link %s', (link) => {
    expect(checkBody(`${exemplar.content.trim()}\n\n${link}`).join(' ')).toMatch(/markdown link/);
  });

  it('rejects a draft that is too short to be a Guide', () => {
    expect(checkBody('## A section\n\nToo little to publish.').join(' ')).toMatch(/words/);
  });

  it('reports the voice violations the newsletter sweep already knows about', () => {
    const body = exemplar.content.trim().replace('Cumulonimbus is', 'Well, Mother Nature is');
    expect(checkBody(body).join(' ')).toMatch(/Voice violation/);
  });
});

describe('checkFinalize', () => {
  const cumulonimbus = getCloudBySlug('cumulonimbus')!;
  const body = exemplar.content.trim();
  const base = {
    body,
    summary: 'The only cloud that makes thunder, and how to read the wind that arrives before the rain reaches you.',
    sourceIds: ['spc-faq', 'safety-thunderstorm', 'jetstream-thunderstorms'],
    offeredSourceIds: ['spc-faq', 'safety-thunderstorm', 'jetstream-thunderstorms', 'jetstream-hail'],
    diagrams: [{ id: 'storm-cross-section', insertAfter: 'the storm is serious' }],
    offeredDiagramIds: ['storm-cross-section', 'cloud-altitude-plot'],
    diagramContext: { cloud: cumulonimbus },
  };

  it('accepts a well-formed finalize pass', () => {
    expect(checkFinalize(base)).toEqual([]);
  });

  it('rejects a source id that was never offered', () => {
    const errors = checkFinalize({ ...base, sourceIds: [...base.sourceIds, 'invented-source'] });
    expect(errors.join(' ')).toMatch(/invented-source/);
  });

  it('rejects fewer than three citations', () => {
    expect(checkFinalize({ ...base, sourceIds: ['spc-faq'] }).join(' ')).toMatch(/valid sources/);
  });

  it('rejects an anchor that does not appear in the prose', () => {
    const errors = checkFinalize({
      ...base,
      diagrams: [{ id: 'storm-cross-section', insertAfter: 'a phrase the draft never uses' }],
    });
    // buildGuideSegments drops an unmatched anchor silently, so the Guide would
    // publish claiming a diagram the page never shows.
    expect(errors.join(' ')).toMatch(/does not appear in the draft/);
  });

  it('rejects a diagram that cannot draw anything for this Entry', () => {
    const cirrus = getCloudBySlug('cirrus')!;
    const errors = checkFinalize({ ...base, diagramContext: { cloud: cirrus } });
    expect(errors.join(' ')).toMatch(/cannot draw anything/);
  });

  it('rejects the same diagram placed twice', () => {
    // One good anchor and one broken one: an id-keyed check counts the id as
    // placed and lets the broken placement through into frontmatter.
    const errors = checkFinalize({
      ...base,
      diagrams: [
        { id: 'storm-cross-section', insertAfter: 'the storm is serious' },
        { id: 'storm-cross-section', insertAfter: 'a phrase the draft never uses' },
      ],
    });
    expect(errors.join(' ')).toMatch(/placed more than once/);
  });

  it('rejects a summary outside the search-description band', () => {
    expect(checkFinalize({ ...base, summary: 'Too short.' }).join(' ')).toMatch(/characters/);
  });
});
