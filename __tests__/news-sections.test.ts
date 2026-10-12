import { selectNewsSections } from '@/lib/news/sections';
import { projectNewsReading, reconcileNewsEvidence, delayNewsReading } from '@/lib/news/reading-state';
import { NEWS_EPOCH, newsTime, newsItem, newsWarning, newsBrowse } from '../tests/fixtures/news-reading';

describe('news sections', () => {
  const warnings = Array.from({ length: 90 }, (_, index) => newsWarning({ id: `warning-${String(index).padStart(3, '0')}` }));
  const stories = Array.from({ length: 70 }, (_, index) => newsItem({ id: `story-${String(index).padStart(3, '0')}`, title: `Cloud lesson ${index}` }));
  const items = [...warnings, ...stories, newsItem({ id: 'outlook', kind: 'outlook', category: 'severe' })];

  it('bounds independent sections so a busy warning day cannot bury reading', () => {
    const sections = selectNewsSections(items, {}, NEWS_EPOCH);
    expect(sections.map(section => [section.id, section.total, section.items.length])).toEqual([
      ['active', 90, 4], ['reports', 1, 1], ['reading', 70, 3], ['delayed', 0, 0],
    ]);
    expect(new Set(sections.flatMap(section => section.items.map(item => item.id))).size).toBe(8);
  });

  it('searches every available item, including location, office, and official update titles', () => {
    expect(selectNewsSections(items, { query: 'Cloud lesson 69' }, NEWS_EPOCH)[2].items[0].id).toBe('story-069');
    expect(selectNewsSections(items, { query: 'Example County' }, NEWS_EPOCH)[0].total).toBe(90);
    expect(selectNewsSections(items, { query: 'KFWD' }, NEWS_EPOCH)[0].total).toBe(90);
    const grouped = newsItem({ updates: [{ id: 'u1', title: 'Distinct bulletin', url: 'https://www.noaa.gov/', issuedAt: newsTime(0) }] });
    expect(selectNewsSections([grouped], { query: 'distinct bulletin' }, NEWS_EPOCH)[2].total).toBe(1);
  });

  it('paginates the whole collection with stable ties and clamps a shrinking final page', () => {
    const paged = [0, 24, 48].flatMap(offset => selectNewsSections(items, { section: 'reading', offset }, NEWS_EPOCH)[0].items);
    expect(paged.map(item => item.id)).toEqual(stories.map(item => item.id));
    expect(selectNewsSections(items, { section: 'reading', offset: 10000 }, NEWS_EPOCH)[0]).toMatchObject({ offset: 48, hasMore: false, total: 70 });
    expect(selectNewsSections(items, { section: 'reading', offset: NaN }, NEWS_EPOCH)[0].offset).toBe(0);
  });

  it('ranks warning event tiers, severity, urgency, then recency with a stable ID tie break', () => {
    const base = newsWarning();
    const warning = (id: string, event: string, severity: string, urgency: string, age = 0) => newsWarning({
      id, hazard: { event }, warning: { ...base.warning!, severity, urgency }, timestamp: new Date(NEWS_EPOCH - age),
    });
    const ranked = selectNewsSections([
      warning('flood', 'Flood Warning', 'Extreme', 'Immediate'),
      warning('tornado-expected', 'Tornado Warning', 'Extreme', 'Expected'),
      warning('tornado-severe', 'Tornado Warning', 'Severe', 'Immediate'),
      warning('tornado-b', 'Tornado Warning', 'Extreme', 'Immediate', 1000),
      warning('tornado-a', 'Tornado Warning', 'Extreme', 'Immediate', 1000),
      warning('tornado-new', 'Tornado Warning', 'Extreme', 'Immediate'),
      warning('flash', 'Flash Flood Warning', 'Severe', 'Immediate'),
    ], { section: 'active' }, NEWS_EPOCH)[0].items;
    expect(ranked.map(item => item.id)).toEqual(['tornado-new', 'tornado-a', 'tornado-b', 'tornado-expected', 'tornado-severe', 'flash', 'flood']);
  });
});

describe('displayed news evidence', () => {
  it('retires an expiring warning exactly at its deadline, then retains it as delayed when its source ages', () => {
    const data = newsBrowse();
    const expired = projectNewsReading(data, NEWS_EPOCH + 180_000);
    expect(expired.sections.find(section => section.id === 'active')?.items).toEqual([]);
    expect(expired.sections.find(section => section.id === 'reports')?.items[0].lifecycle).toBe('unverified');
    const stale = projectNewsReading(data, NEWS_EPOCH + 300_000);
    expect(stale.sections.find(section => section.id === 'delayed')?.items[0].id).toBe('nws:synthetic');
    expect(stale.sources[0].lastSuccessAt).toBe(newsTime(0));
    expect(projectNewsReading(data, NEWS_EPOCH + 3600_000).sections.flatMap(section => section.items).map(item => item.id)).not.toContain('nws:synthetic');
  });

  it('applies cancellation evidence immediately without replacing or reordering reading', () => {
    const displayed = newsBrowse();
    const checked = newsBrowse([newsItem({ id: 'new-story' })]);
    const result = projectNewsReading(reconcileNewsEvidence(displayed, checked), NEWS_EPOCH);
    expect(result.sections.find(section => section.id === 'active')?.total).toBe(0);
    expect(result.sections.find(section => section.id === 'reading')?.items.map(item => item.id)).toEqual(['reading-1']);
    expect(result.sections.find(section => section.id === 'reports')?.items[0].lifecycle).toBe('unverified');
  });

  it('keeps a client-retained report when a cold server has no copy, without renewing its source clock', () => {
    const displayed = newsBrowse();
    const checked = newsBrowse([]);
    checked.sources[0] = { ...checked.sources[0], state: 'unavailable', lastSuccessAt: null, freshUntil: null, retainedUntil: null };
    const result = projectNewsReading(reconcileNewsEvidence(displayed, checked), NEWS_EPOCH + 1000);
    expect(result.sections.find(section => section.id === 'delayed')?.items[0].id).toBe('nws:synthetic');
    expect(result.sources[0]).toMatchObject({ state: 'delayed', lastSuccessAt: newsTime(0) });
  });

  it('clears unloaded active counts when a complete later check confirms no active warnings', () => {
    const displayed = newsBrowse(Array.from({ length: 90 }, (_, index) => newsWarning({ id: `warning-${index}` })));
    const checked = newsBrowse([]);
    const result = projectNewsReading(reconcileNewsEvidence(displayed, checked), NEWS_EPOCH);
    expect(result.sections.find(section => section.id === 'active')?.total).toBe(0);
  });

  it('retains readable delayed content after network failure without active claims', () => {
    const result = projectNewsReading(delayNewsReading(newsBrowse()), NEWS_EPOCH);
    expect(result.sections.find(section => section.id === 'active')?.total).toBe(0);
    expect(result.sections.find(section => section.id === 'delayed')?.items).toHaveLength(2);
    expect(result.activeIds).toEqual([]);
  });

  it('does not advertise unseen reading totals after an outage', () => {
    const displayed = newsBrowse(Array.from({ length: 75 }, (_, index) => newsItem({ id: `reading-${index}` })));
    const result = projectNewsReading(delayNewsReading(displayed), NEWS_EPOCH);
    expect(result.countsArePartial).toBe(true);
    expect(result.sections.find(section => section.id === 'reading')?.total).toBe(0);
    expect(result.sections.find(section => section.id === 'delayed')?.total).toBe(3);
  });
});
