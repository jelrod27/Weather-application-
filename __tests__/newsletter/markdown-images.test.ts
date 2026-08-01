import {
  extractMarkdownImages,
  stripImageMarkdown,
} from '../../scripts/newsletter/markdown-images';

/**
 * Regression guard for the truncation bug fixed in fa598e4.
 *
 * `\(([^)]+)\)` stops at the first `)`, so a Wikimedia Special:FilePath title
 * containing literal parentheses left a URL fragment behind in the draft. The
 * fix landed in the validator only; the draft-cleaning path kept the naive
 * pattern. Both now cross the same reader, so these cases are asserted against
 * both directions of the seam.
 */
const PARENTHESISED_URL =
  'https://upload.wikimedia.org/wikipedia/commons/Special:FilePath/Arctic sea ice (MODIS 2019-01-29).jpg';

describe('extractMarkdownImages', () => {
  it('reads a destination containing balanced parentheses', () => {
    const images = extractMarkdownImages(`![Sea ice](${PARENTHESISED_URL})`);
    expect(images).toHaveLength(1);
    expect(images[0].url).toBe(PARENTHESISED_URL);
    expect(images[0].alt).toBe('Sea ice');
  });

  it('reads an angle-bracketed destination', () => {
    const images = extractMarkdownImages('![Alt](<https://example.com/a b.png>)');
    expect(images[0].url).toBe('https://example.com/a b.png');
  });

  it('resumes scanning past an angle-bracketed destination', () => {
    // The returned url excludes `<` and `>`, so deriving the next scan position
    // from its length alone lands two characters short of the closing `)`.
    const images = extractMarkdownImages(
      '![A](<https://e.com/a b.png>) then ![B](https://e.com/b.png)',
    );
    expect(images.map((i) => i.url)).toEqual([
      'https://e.com/a b.png',
      'https://e.com/b.png',
    ]);
  });

  it('reads several images in document order', () => {
    const content = `![One](https://example.com/1.png)\n\ntext\n\n![Two](${PARENTHESISED_URL})`;
    expect(extractMarkdownImages(content).map((i) => i.url)).toEqual([
      'https://example.com/1.png',
      PARENTHESISED_URL,
    ]);
  });

  it('skips an unterminated destination rather than consuming the rest of the document', () => {
    const content = '![Broken](https://example.com/a.png\n\nProse continues.';
    expect(extractMarkdownImages(content)).toEqual([]);
  });
});

describe('stripImageMarkdown', () => {
  it('removes a whole image whose URL contains balanced parentheses', () => {
    const draft = `Intro.\n\n![Sea ice](${PARENTHESISED_URL})\n\nOutro.`;
    const out = stripImageMarkdown(draft);
    expect(out).not.toContain('![');
    // The naive pattern truncated at the first `)`, leaving `.jpg)` behind.
    expect(out).not.toContain('.jpg');
    expect(out).not.toContain('MODIS');
    expect(out).toContain('Intro.');
    expect(out).toContain('Outro.');
  });

  it('removes bare image markdown with no destination', () => {
    const out = stripImageMarkdown('Intro.\n\n![A hallucinated figure.]\n\nOutro.');
    expect(out).not.toContain('hallucinated figure');
    expect(out).not.toMatch(/!\[/);
  });

  it('removes relative and absolute placeholder destinations', () => {
    const draft =
      'Intro.\n\n![Panel.](image2)\n\n![Radar.](https://placehold.co/900x500?text=Radar)\n\nOutro.';
    const out = stripImageMarkdown(draft);
    expect(out).not.toContain('(image2)');
    expect(out).not.toContain('placehold.co');
    expect(out).toContain('Intro.');
    expect(out).toContain('Outro.');
  });

  it('collapses separator pairs left bracketing a removed placeholder', () => {
    const out = stripImageMarkdown('Para one.\n\n---\n\n![Bare placeholder.]\n\n---\n\n## Next');
    expect(out).not.toContain('![');
    expect(out).not.toContain('---');
    expect(out).toContain('Para one.');
    expect(out).toContain('## Next');
  });

  it('leaves a clean draft unchanged', () => {
    const draft = '## Rearview\n\nProse.\n\n## Roadmap\n\nMore.';
    expect(stripImageMarkdown(draft)).toBe(draft);
  });

  it('leaves an unterminated image alone instead of eating the remaining draft', () => {
    const draft = 'Intro.\n\n![Broken](https://example.com/a.png\n\nOutro.';
    const out = stripImageMarkdown(draft);
    expect(out).toContain('Outro.');
  });

  it('leaves non-image links intact', () => {
    const draft = 'See [the outlook](https://example.com/outlook) for details.';
    expect(stripImageMarkdown(draft)).toBe(draft);
  });

  it('strips an angle-bracketed image whole, leaving no `>)` behind', () => {
    const out = stripImageMarkdown(
      'Intro.\n\n![Sea ice](<https://example.com/pic (1).jpg>)\n\nOutro.',
    );
    expect(out).not.toContain('>');
    expect(out).not.toContain(')');
    expect(out).toContain('Intro.');
    expect(out).toContain('Outro.');
  });
});
