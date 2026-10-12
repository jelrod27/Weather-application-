'use client';

import React from 'react';
import Link from 'next/link';
import { NEWS_PAGE_SIZE, NEWS_SECTIONS } from '@/lib/news/sections';
import NewsGrid from './NewsGrid';
import type { NewsSectionId, NewsSectionPage } from '@/lib/news/sections';

interface NewsCategorySectionsProps {
  sections: NewsSectionPage[];
  selectedSection?: NewsSectionId;
  onViewAll: (section: NewsSectionId) => void;
  onPageChange: (offset: number) => void;
  busy: boolean;
}

export default function NewsCategorySections({ sections, selectedSection, onViewAll, onPageChange, busy }: NewsCategorySectionsProps): React.JSX.Element {
  return <div className="space-y-10">
    {sections.filter(section => section.items.length > 0 || section.id === selectedSection || section.total > 0).map(section => {
      const config = NEWS_SECTIONS[section.id];
      return <section key={section.id} aria-labelledby={`news-${section.id}-title`} data-news-section={section.id}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b-2 border-primary/25 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={`news-${section.id}-title`} className="font-mono text-xl font-bold text-primary">{config.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{config.description}</p>
            <p className="mt-2 text-xs font-mono text-muted-foreground">
              {section.total} available at the displayed check · {section.items.length} displayed
            </p>
          </div>
          {!selectedSection && section.total > section.items.length && <button type="button"
            className="shrink-0 border-2 border-primary px-3 py-2 text-sm font-mono font-bold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => onViewAll(section.id)} disabled={busy} aria-label={`View all ${config.title.toLowerCase()}`}>
            View all ({section.total})
          </button>}
        </div>
        {section.id === 'active' && <Link href="/warnings" className="mb-4 inline-block text-sm text-primary underline">Open the local Warning Center</Link>}
        {section.items.length === 0 && <p className="text-sm">No matching reports are currently displayed in this section. Check source coverage or refresh for the latest available reports.</p>}
        <NewsGrid items={section.items} compact={section.id === 'active'} leadWithHero={section.id === 'reading' && !selectedSection} />
        {selectedSection === section.id && <nav aria-label={`${config.title.toLowerCase()} pages`} className="mt-5 flex flex-wrap items-center gap-3 font-mono text-sm">
          <button type="button" className="border-2 px-3 py-2 disabled:opacity-40" disabled={busy || section.offset === 0}
            onClick={() => onPageChange(Math.max(0, section.offset - NEWS_PAGE_SIZE))}>Previous page</button>
          <span>Page {Math.floor(section.offset / NEWS_PAGE_SIZE) + 1} of {Math.max(1, Math.ceil(section.total / NEWS_PAGE_SIZE))}</span>
          <button type="button" className="border-2 px-3 py-2 disabled:opacity-40" disabled={busy || !section.hasMore}
            onClick={() => onPageChange(section.offset + NEWS_PAGE_SIZE)}>Next page</button>
        </nav>}
      </section>;
    })}
  </div>;
}
