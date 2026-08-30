import { htmlToText } from '../../scripts/education/grounding';

describe('htmlToText', () => {
  // Fetched page text is fed to a drafting model, so what survives stripping is
  // the indirect-injection surface planning/adr/0002 is about.
  it('removes a script block whose closing tag carries whitespace', () => {
    // `</script >` is valid HTML; a regex anchored on `</script>` leaves the
    // script body behind as prose and sends it to the model.
    expect(htmlToText('<p>real text</p><script >alert(1)</script >')).toBe('real text');
    expect(htmlToText('<p>real text</p><style >body{}</style >')).toBe('real text');
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

  it('keeps block boundaries as newlines and collapses the rest', () => {
    expect(htmlToText('<h2>Title</h2><p>One</p><p>Two</p>')).toBe('Title\nOne\nTwo');
  });
});
