/**
 * 16-Bit Weather Platform - News Grid Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import NewsCard from './NewsCard';
import NewsHero from './NewsHero';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';

interface NewsGridProps {
  items: RSSItem[];
  compact?: boolean;
  leadWithHero?: boolean;
  className?: string;
}

export default function NewsGrid({
  items,
  compact = false,
  leadWithHero = false,
  className,
}: NewsGridProps): React.JSX.Element {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', !compact && 'lg:grid-cols-3', className)}>
      {items.map((item, index) => {
        const hero = leadWithHero && index === 0;
        const key = item.identity ? `${item.identity.authority}:${item.identity.eventId}:${item.identity.areaKey ?? ''}` : item.id;
        return <div key={key} data-news-key={key} className={hero ? 'md:col-span-2 lg:col-span-3' : 'min-w-0'}>
          {hero ? <NewsHero item={item} /> : <NewsCard item={item} variant={compact ? 'compact' : 'default'} />}
        </div>;
      })}
    </div>
  );
}
