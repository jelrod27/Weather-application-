import { embedImagesInDraft, stripBareImageMarkdown } from '../../scripts/newsletter/content-match';
import type { ImageEntry } from '../../scripts/newsletter/images';

const liveImage: ImageEntry = {
  id: 'goes-conus-geocolor',
  url: 'https://example.com/goes.jpg',
  caption: 'Latest GOES-16 GeoColor view of the contiguous US.',
  credit: 'NOAA NESDIS',
  topic_tags: ['severe_storms'],
  license: 'PD-USGov',
  kind: 'live',
};

const archivalImage: ImageEntry = {
  id: 'binger-tornado',
  url: 'https://example.com/binger.jpg',
  caption: 'Wedge tornado near Binger, Oklahoma (1981).',
  credit: 'NOAA NSSL archive',
  topic_tags: ['severe_storms'],
  license: 'PD-USGov',
  kind: 'archival',
  archival_year: 1981,
};

describe('embedImagesInDraft', () => {
  it('inserts an image after the paragraph containing the anchor snippet', () => {
    const draft = '## Rearview\n\nFirst paragraph mentions a tornado outbreak.\n\nSecond paragraph follows.';
    const out = embedImagesInDraft(draft, [
      { image: liveImage, insertAfter: 'tornado outbreak' },
    ]);
    expect(out).toContain('First paragraph mentions a tornado outbreak.');
    // Image markdown should land between the two paragraphs.
    const imageIdx = out.indexOf('![');
    const secondParaIdx = out.indexOf('Second paragraph');
    expect(imageIdx).toBeGreaterThan(0);
    expect(imageIdx).toBeLessThan(secondParaIdx);
    expect(out).toContain(`![${liveImage.caption}](${liveImage.url})`);
    expect(out).toContain(`*${liveImage.credit}*`);
  });

  it('matches anchors case-insensitively and tolerates whitespace differences', () => {
    const draft = '## Rearview\n\nA paragraph about\n   the\ttornado    outbreak in Mississippi.\n\nNext.';
    const out = embedImagesInDraft(draft, [
      { image: liveImage, insertAfter: 'TORNADO outbreak' },
    ]);
    expect(out).toContain('![');
    expect(out.indexOf('![')).toBeLessThan(out.indexOf('Next.'));
  });

  it('falls back to appending under the nearest section when the anchor is missing', () => {
    const draft = '## Rearview\n\nProse here.\n\n## Roadmap\n\nMore prose.\n\n## Looking Ahead\n\nCloser.';
    const out = embedImagesInDraft(draft, [
      { image: liveImage, insertAfter: 'this snippet does not exist anywhere' },
    ]);
    // Image should land somewhere in the Roadmap section (Roadmap is tried first by the fallback).
    expect(out).toContain('![');
    const roadmapIdx = out.indexOf('## Roadmap');
    const lookingAheadIdx = out.indexOf('## Looking Ahead');
    const imageIdx = out.indexOf('![');
    expect(imageIdx).toBeGreaterThan(roadmapIdx);
    expect(imageIdx).toBeLessThan(lookingAheadIdx);
  });

  it('embeds multiple images at distinct anchors', () => {
    const draft =
      '## Rearview\n\nThe week saw a major tornado outbreak.\n\n## Roadmap\n\nA trough lifts out of the central US.\n\nRegional precip outlook follows.';
    const out = embedImagesInDraft(draft, [
      { image: archivalImage, insertAfter: 'tornado outbreak' },
      { image: liveImage, insertAfter: 'lifts out of the central US' },
    ]);
    expect(out.match(/!\[/g)?.length).toBe(2);
    expect(out).toContain(archivalImage.caption);
    expect(out).toContain(liveImage.caption);
    // Order preserved: archival image appears before the live one.
    expect(out.indexOf(archivalImage.caption)).toBeLessThan(out.indexOf(liveImage.caption));
  });

  it('returns the original draft when no placements are supplied', () => {
    const draft = '## Rearview\n\nProse.\n\n## Roadmap\n\nMore.';
    expect(embedImagesInDraft(draft, [])).toBe(draft);
  });

  it('strips model-emitted bare image markdown before embedding real images', () => {
    // The generator is told not to emit image markdown, but the model
    // sometimes hallucinates ![alt] placeholders with no URL. These must
    // not survive into the published post.
    const draft =
      '## Rearview\n\nA tornado outbreak hit the Midwest.\n\n---\n\n' +
      '![A composite radar mosaic with tornado-warned cells in red polygons.]\n\n' +
      '---\n\n## Roadmap\n\nA ridge builds over the Rockies.';
    const out = embedImagesInDraft(draft, [
      { image: liveImage, insertAfter: 'tornado outbreak' },
    ]);
    // No bare image (![alt] not followed by a URL) remains.
    expect(out).not.toMatch(/!\[[^\]]*\](?!\()/);
    expect(out).not.toContain('composite radar mosaic');
    // The real, URL-backed image was still embedded.
    expect(out).toContain(`![${liveImage.caption}](${liveImage.url})`);
    // Orphaned separators that bracketed the placeholder are gone.
    expect(out).not.toMatch(/\n---\n\s*\n---/);
  });
});

describe('stripBareImageMarkdown', () => {
  it('removes bare image tags but keeps URL-backed images', () => {
    const input =
      'Intro.\n\n![A hallucinated figure description.]\n\n' +
      '![Real caption.](https://example.com/real.png)\n*Credit*';
    const out = stripBareImageMarkdown(input);
    expect(out).not.toContain('hallucinated figure');
    expect(out).toContain('![Real caption.](https://example.com/real.png)');
  });

  it('collapses separator pairs left bracketing a removed placeholder', () => {
    const input = 'Para one.\n\n---\n\n![Bare placeholder.]\n\n---\n\n## Next';
    const out = stripBareImageMarkdown(input);
    expect(out).not.toContain('![');
    expect(out).not.toContain('---');
    expect(out).toContain('Para one.');
    expect(out).toContain('## Next');
  });

  it('leaves clean drafts unchanged', () => {
    const input = '## Rearview\n\nProse.\n\n## Roadmap\n\nMore.';
    expect(stripBareImageMarkdown(input)).toBe(input);
  });
});
