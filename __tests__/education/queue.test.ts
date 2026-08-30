import fs from 'node:fs';
import path from 'node:path';

import { getShareableGuideEntries } from '@/lib/education/entries';
import {
  getEligibleEntries,
  getGuideQueue,
  IneligibleEntryError,
  KIND_ROUTE_SEGMENT,
  KINDS_WITH_GUIDE_RENDERING,
  resolveTarget,
  toGuideTitle,
} from '../../scripts/education/queue';

describe('the eligible set', () => {
  it('is exactly the Entries already published as Guide URLs', () => {
    const eligible = getEligibleEntries();
    const published = getShareableGuideEntries();
    expect(eligible).toHaveLength(published.length);
    expect(new Set(eligible.map((e) => `${e.kind}:${e.slug}`))).toEqual(
      new Set(published.map((e) => `${e.kind}:${e.slug}`)),
    );
  });

  it('refuses an Entry that exists but is not a published Guide', () => {
    // Cirrostratus is a real cloud Entry and an Atlas row, not a Guide URL.
    // Generating a page for it is the failure planning/adr/0001 exists to stop.
    expect(() => resolveTarget('cirrostratus')).toThrow(IneligibleEntryError);
    expect(() => resolveTarget('cirrostratus')).toThrow(/adr\/0001/);
  });

  it('refuses a slug that is not an Entry at all', () => {
    expect(() => resolveTarget('not-a-cloud')).toThrow(/does not match any education Entry/);
  });

  it('resolves an eligible Entry and reads its title out of caps', () => {
    const target = resolveTarget('cumulonimbus');
    expect(target.kind).toBe('cloud');
    expect(target.title).toBe('Cumulonimbus');
    expect(target.hasGuide).toBe(true);
  });

  it('leaves the exemplar out of the queue and keeps renderable kinds first', () => {
    const queue = getGuideQueue();
    expect(queue.some((entry) => entry.slug === 'cumulonimbus')).toBe(false);

    const lastRenderable = queue.map((entry) => entry.renders).lastIndexOf(true);
    const firstUnrenderable = queue.map((entry) => entry.renders).indexOf(false);
    if (lastRenderable !== -1 && firstUnrenderable !== -1) {
      expect(lastRenderable).toBeLessThan(firstUnrenderable);
    }
  });
});

describe('toGuideTitle', () => {
  it('title-cases the databases\' all-caps names across spaces and hyphens', () => {
    expect(toGuideTitle('MID-LATITUDE CYCLONES')).toBe('Mid-Latitude Cyclones');
    expect(toGuideTitle('WARM FRONTS')).toBe('Warm Fronts');
  });

  it('leaves a name that is already mixed case alone', () => {
    expect(toGuideTitle('Ball Lightning')).toBe('Ball Lightning');
    expect(toGuideTitle("St. Elmo's Fire")).toBe("St. Elmo's Fire");
  });
});

describe('KINDS_WITH_GUIDE_RENDERING', () => {
  // A Guide written for a kind whose route never calls getGuideContent sits in
  // content/education/ unread. The list is hand-maintained, so the routes are
  // read here to make a stale list fail CI rather than produce dead content.
  const routeSource = (segment: string): string =>
    fs.readFileSync(
      path.join(process.cwd(), 'app', 'education', segment, '[slug]', 'page.tsx'),
      'utf8',
    );

  it.each(Object.entries(KIND_ROUTE_SEGMENT))(
    'matches what the %s route actually loads',
    (kind, segment) => {
      const rendersGuides = routeSource(segment).includes('getGuideContent');
      expect(rendersGuides).toBe(
        KINDS_WITH_GUIDE_RENDERING.includes(kind as (typeof KINDS_WITH_GUIDE_RENDERING)[number]),
      );
    },
  );
});
