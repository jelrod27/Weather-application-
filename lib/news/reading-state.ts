import { NEWS_SECTION_IDS, newsSection } from './sections';
import { projectNewsSnapshot } from './snapshot';
import type { NewsBrowseResult, NewsSectionPage } from './sections';

/** Age the displayed window without refreshing source timestamps or reordering its cards. */
export function projectNewsReading(data: NewsBrowseResult, now: number): NewsBrowseResult {
  const items = data.sections.flatMap(section => section.items);
  const snapshot = projectNewsSnapshot(items, data.sources, now);
  const retained = new Map([...snapshot.items, ...snapshot.delayedItems].map(item => [item.id, item]));
  const countsArePartial = data.countsArePartial || snapshot.sources.some((source, index) => source.state !== data.sources[index]?.state) ||
    data.sections.some(section => section.items.some(item => {
      const current = retained.get(item.id);
      return !current || newsSection(current, now) !== section.id;
    }));
  const sections: NewsSectionPage[] = NEWS_SECTION_IDS.map(id => {
    const previous = data.sections.find(section => section.id === id);
    const visible = items.flatMap(item => {
      const current = retained.get(item.id);
      return current && newsSection(current, now) === id ? [current] : [];
    });
    // After negative evidence, only the loaded records are countable. Do not
    // subtract them from an old total and present the unseen remainder as available.
    let total = countsArePartial ? visible.length : previous?.total ?? visible.length;
    if (id === 'active') {
      total = Math.min(total, data.activeIds.length);
      if (snapshot.sources.find(source => source.id === 'nws-alerts')?.state !== 'fresh') total = 0;
    }
    return { id, items: visible, total, offset: previous?.offset ?? 0, hasMore: previous?.hasMore ?? false };
  }).filter(section => section.items.length > 0 || data.sections.some(prior => prior.id === section.id));
  return { ...data, sources: snapshot.sources, sections, countsArePartial };
}

/** Apply negative evidence immediately, while new/reordered stories wait for the reader. */
export function reconcileNewsEvidence(displayed: NewsBrowseResult, checked: NewsBrowseResult): NewsBrowseResult {
  const active = new Set(checked.activeIds);
  const sources = new Map(checked.sources.map(source => [source.id, source]));
  return {
    ...displayed,
    countsArePartial: displayed.countsArePartial || displayed.activeIds.some(id => !active.has(id)) ||
      displayed.sources.some(source => {
        const latest = sources.get(source.id);
        return latest && latest.state !== 'fresh' && latest.state !== source.state;
      }),
    activeIds: displayed.activeIds.filter(id => active.has(id)),
    sources: displayed.sources.map(source => {
      const latest = sources.get(source.id);
      // A cold server instance can have no retained copy. The reader's last-known
      // copy is still useful until its own retention deadline, but is not current.
      return latest && latest.state !== 'fresh' ? {
        ...source,
        state: latest.state === 'unavailable' ? 'delayed' : latest.state,
        issues: latest.issues,
        lastAttemptAt: latest.lastAttemptAt,
      } : source;
    }),
    sections: displayed.sections.map(section => ({ ...section, items: section.items.map(item =>
      item.lifecycle === 'active' && !active.has(item.id) ? { ...item, lifecycle: 'unverified' } : item) })),
  };
}

export function delayNewsReading(data: NewsBrowseResult): NewsBrowseResult {
  return { ...data, activeIds: [], countsArePartial: true, sources: data.sources.map(source => ({
    ...source, state: source.state === 'unavailable' ? 'unavailable' : 'delayed',
  })) };
}

/** A successful HTTP response may come from a cold instance with no retained reports. */
export function retainNewsContext(checked: NewsBrowseResult, displayed: NewsBrowseResult | null, now: number): NewsBrowseResult {
  if (!displayed) return checked;
  const prior = projectNewsReading(displayed, now);
  const missingSources = new Set(checked.sources.filter(source => source.state === 'unavailable').map(source => source.id));
  const retainedSources = prior.sources.filter(source => missingSources.has(source.id) && source.state !== 'unavailable');
  const retainedIds = new Set(retainedSources.map(source => source.id));
  const checkedIds = new Set(checked.sections.flatMap(section => section.items.map(item => item.id)));
  const retained = prior.sections.flatMap(section => section.items).filter(item => retainedIds.has(item.sourceId) && !checkedIds.has(item.id));
  if (retained.length === 0) return checked;
  const delayed = checked.sections.find(section => section.id === 'delayed');
  return {
    ...checked,
    sources: checked.sources.map(source => {
      const old = retainedSources.find(priorSource => priorSource.id === source.id);
      return old ? { ...old, state: 'delayed', lastAttemptAt: source.lastAttemptAt, issues: source.issues } : source;
    }),
    sections: [
      ...checked.sections.filter(section => section.id !== 'delayed'),
      { id: 'delayed', items: [...(delayed?.items ?? []), ...retained.map(item => ({ ...item, sourceState: 'delayed' as const, lifecycle: 'unverified' as const }))],
        total: (delayed?.total ?? 0) + retained.length, offset: delayed?.offset ?? 0, hasMore: delayed?.hasMore ?? false },
    ],
  };
}
