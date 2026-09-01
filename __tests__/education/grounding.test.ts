import { htmlToText } from '../../scripts/education/grounding';

describe('htmlToText', () => {
  // Fetched page text is fed to a drafting model, so what survives stripping is
  // the indirect-injection surface planning/adr/0002 is about.
  // The HTML parser accepts whitespace and attributes inside an end tag and
  // discards them, so all of these close the script. A regex anchored on
  // `</script>` — or on `</script\s*>` — leaves the body behind as prose.
  it.each([
    ['plain', '<script>alert(1)</script>'],
    ['space before the bracket', '<script >alert(1)</script >'],
    ['attributes in the end tag', '<script>alert(1)</script foo="bar">'],
    ['tab and newline in the end tag', '<script>alert(1)</script\t\n bar>'],
    ['attributes in the open tag', '<script type="text/javascript">alert(1)</script>'],
    ['style rather than script', '<style media="x">body{}</style x>'],
  ])('removes a script block with %s', (_label, block) => {
    expect(htmlToText(`<p>real text</p>${block}`)).toBe('real text');
  });

  it('does not treat a longer tag name as a script end tag', () => {
    expect(htmlToText('<p>a</p><scriptfoo>b</scriptfoo>')).toBe('a\nb');
  });

  it('decodes each entity once', () => {
    // Chained per-entity replaces re-scan their own output, so `&amp;lt;`
    // became `&lt;` and then `<` — unescaped twice.
    expect(htmlToText('<p>&amp;lt; is written literally</p>')).toBe('&lt; is written literally');
    expect(htmlToText('<p>a &amp; b</p>')).toBe('a & b');
  });

  it('decodes named and numeric entities it knows and leaves the rest alone', () => {
    expect(htmlToText('<p>caf&#233; &quot;quoted&quot;</p>')).toBe('café "quoted"');
    expect(htmlToText('<p>&notanentity; stays</p>')).toBe('&notanentity; stays');
  });

  it('decodes the typographic entities NWS office pages use', () => {
    // `15&ndash;50 cm` left encoded cannot be matched by a judge quoting "15–50 cm".
    expect(htmlToText('<p>a radius of 15&ndash;50 cm &mdash; &ldquo;break&rdquo; at 26&deg;C</p>')).toBe(
      'a radius of 15–50 cm — \u201cbreak\u201d at 26°C',
    );
  });

  // Every noaa.gov article opens with the same government banner and main menu.
  // That chrome is byte-identical across pages, so a fact-check quote drawn from
  // it verifies against any source — an unsupported claim could be "grounded" in
  // a navigation menu.
  it('narrows to <main> when the page marks it', () => {
    const html =
      '<body><nav>Home Weather Climate</nav><main><p>Ice crystals form above 20,000 feet.</p></main><footer>Contact us</footer></body>'
    const text = htmlToText(html)
    expect(text).toBe('Ice crystals form above 20,000 feet.')
    expect(text).not.toMatch(/Climate|Contact/)
  });

  it('strips chrome landmarks on a page with no <main>', () => {
    const html = '<header>Skip to content</header><p>Halo: refraction through ice.</p><aside>Related</aside>'
    expect(htmlToText(html)).toBe('Halo: refraction through ice.')
  });

  it('keeps the whole page when there is no <main> and no landmarks', () => {
    // The NWS Glossary is already just the definition.
    expect(htmlToText('<p>Graupel Same as snow pellets or small hail.</p>')).toBe(
      'Graupel Same as snow pellets or small hail.',
    )
  });

  it('keeps block boundaries as newlines and collapses the rest', () => {
    expect(htmlToText('<h2>Title</h2><p>One</p><p>Two</p>')).toBe('Title\nOne\nTwo');
  });
});
