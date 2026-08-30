import {
  diagramContextFor,
  offeredDiagramsFor,
  unrenderableDiagramIds,
} from '../../scripts/education/entry-diagrams';
import { validateGuideFile } from '../../scripts/education/validate-guide';

describe('diagramContextFor', () => {
  it('gives a cloud Entry its data and everything else an empty context', () => {
    expect(diagramContextFor('cloud', 'cumulonimbus').cloud?.name).toBe('CUMULONIMBUS');
    expect(diagramContextFor('cloud', 'not-a-cloud')).toEqual({});
    expect(diagramContextFor('weather-system', 'cold-fronts')).toEqual({});
  });
});

describe('offeredDiagramsFor', () => {
  it('offers the storm cross-section only to clouds of vertical development', () => {
    const forCumulonimbus = offeredDiagramsFor(diagramContextFor('cloud', 'cumulonimbus'));
    const forCirrus = offeredDiagramsFor(diagramContextFor('cloud', 'cirrus'));

    expect(forCumulonimbus.map((d) => d.id)).toContain('storm-cross-section');
    expect(forCirrus.map((d) => d.id)).not.toContain('storm-cross-section');
    // The altitude plot is parameterised, so it survives for both.
    expect(forCirrus.map((d) => d.id)).toContain('cloud-altitude-plot');
  });

  it('offers nothing that needs cloud data to a kind that has none', () => {
    expect(offeredDiagramsFor(diagramContextFor('phenomenon', 'haboob'))).toEqual([]);
  });
});

describe('unrenderableDiagramIds', () => {
  // Being in the registry is not the same as being able to draw. Without this,
  // a Guide could declare a diagram, pass every other check, and render nothing
  // where the frontmatter promises a figure.
  it('names a registered diagram that would draw nothing for this Entry', () => {
    expect(
      unrenderableDiagramIds(['storm-cross-section'], diagramContextFor('cloud', 'cirrus')),
    ).toEqual(['storm-cross-section']);
  });

  it('accepts a diagram the Entry can actually draw', () => {
    expect(
      unrenderableDiagramIds(
        ['storm-cross-section', 'cloud-altitude-plot'],
        diagramContextFor('cloud', 'cumulonimbus'),
      ),
    ).toEqual([]);
  });
});

describe('validateGuideFile', () => {
  it('passes the exemplar Guide', () => {
    const result = validateGuideFile('content/education/clouds/cumulonimbus.md');
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('refuses a file outside the Guide directories', () => {
    const result = validateGuideFile('content/blog/anything.md');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/not a Guide directory/);
  });

  it('refuses a path that is not the canonical Guide location', () => {
    // The loader addresses a Guide by kind and slug, so a path elsewhere on
    // disk would otherwise be reported on using the canonical Guide's content —
    // a pass for a file that was never opened.
    const result = validateGuideFile('/tmp/clouds/cumulonimbus.md');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/not the canonical Guide path/);
  });
});
