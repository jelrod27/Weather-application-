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
import NewsSkeleton from './NewsSkeleton';
import NewsEmpty from './NewsEmpty';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';

interface NewsGridProps {
  items: RSSItem[];
  isLoading?: boolean;
  error?: string | null;
  emptyType?: 'no-alerts' | 'no-results' | 'error' | 'no-news';
  onRetry?: () => void;
  className?: string;
}

export default function NewsGrid({
  items,
  isLoading = false,
  error = null,
  emptyType = 'no-news',
  onRetry,
  className,
}: NewsGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <NewsSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return <NewsEmpty type="error" message={error} onRetry={onRetry} />;
  }

  // Empty state
  if (items.length === 0) {
    return <NewsEmpty type={emptyType} onRetry={onRetry} />;
  }

  // Render news grid
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
