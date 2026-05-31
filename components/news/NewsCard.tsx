/**
 * 16-Bit Weather Platform - News Card Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

'use client';

import React, { useState } from 'react';
import { ExternalLink, Clock, MapPin, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import CategoryBadge, { getCategoryConfig, type CategoryType } from './CategoryBadge';
import PriorityIndicator from './PriorityIndicator';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import { safeExternalUrl } from '@/lib/safe-url';

interface NewsCardProps {
  item: RSSItem;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

export default function NewsCard({ item, variant = 'default', className }: NewsCardProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');
  const [imageError, setImageError] = useState(false);
  const safeUrl = safeExternalUrl(item.url);

  const openSafeUrl = () => {
    if (!safeUrl) {
      console.warn('[NewsCard] dropping unsafe URL', item.url);
      return;
    }
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  // Calculate time ago
  const timeAgo = getTimeAgo(new Date(item.timestamp));

  // Truncate title and description
  const maxTitleLength = variant === 'compact' ? 60 : 80;
  const maxDescriptionLength = variant === 'compact' ? 100 : 150;

  const truncatedTitle =
    item.title.length > maxTitleLength
      ? item.title.substring(0, maxTitleLength).trim() + '...'
      : item.title;

  const truncatedDescription = item.description
    ? item.description.length > maxDescriptionLength
      ? item.description.substring(0, maxDescriptionLength).trim() + '...'
      : item.description
    : '';

  // Priority-based border styles. Low priority falls back to a visible theme
  // border (border-border) rather than themeClasses.borderColor, which is
  // border-transparent for the 'weather' variant and left low-priority cards
  // edgeless and blended into the page on every theme.
  const priorityBorderClass =
    item.priority === 'high'
      ? 'border-red-500 hover:border-red-400'
      : item.priority === 'medium'
      ? 'border-yellow-500 hover:border-yellow-400'
      : 'border-border';

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSafeUrl();
    }
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'border-2 transition-all hover:shadow-lg cursor-pointer group card-interactive',
          priorityBorderClass,
          'bg-card',
          className
        )}
        onClick={openSafeUrl}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
        aria-label={`${item.title} from ${item.source}, ${timeAgo}. Opens in new tab`}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Image thumbnail or category icon */}
            {item.imageUrl && !imageError ? (
              <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden border-2 rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div
                className={cn(
                  'w-16 h-16 flex-shrink-0 border-2 rounded flex items-center justify-center',
                  'border-border'
                )}
              >
                <CategoryBadge category={item.category} />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <PriorityIndicator priority={item.priority} size="sm" />
                <CategoryBadge category={item.category} />
                {/* Magnitude badge for earthquakes */}
                {item.magnitude && (
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border-2 rounded font-mono',
                    item.magnitude >= 6 ? 'bg-red-600 text-white border-red-800' :
                    item.magnitude >= 5 ? 'bg-orange-500 text-white border-orange-700' :
                    'bg-yellow-500 text-black border-yellow-700'
                  )}>
                    <Activity className="w-3 h-3" />
                    M{item.magnitude.toFixed(1)}
                  </span>
                )}
              </div>
              <h3
                className={cn(
                  'text-sm font-bold font-mono line-clamp-2 group-hover:underline',
                  themeClasses.headerText
                )}
              >
                {truncatedTitle}
              </h3>
              <p className={cn('text-xs mt-1', themeClasses.text)}>
                {item.source} • {timeAgo}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant. The whole card is the link (matching NewsHero and the
  // compact variant); the READ button stops propagation so it doesn't open a
  // second tab. `showImage` collapses to the text layout when there is no
  // image or it failed to load, so an errored image never leaves a blank banner
  // and a missing priority indicator.
  const showImage = Boolean(item.imageUrl) && !imageError;
  const categoryConfig = getCategoryConfig(item.category as CategoryType);
  const CategoryIcon = categoryConfig.icon;

  return (
    <Card
      className={cn(
        'border-2 transition-all hover:shadow-lg overflow-hidden group flex flex-col h-full cursor-pointer card-interactive',
        priorityBorderClass,
        'bg-card',
        className
      )}
      onClick={openSafeUrl}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`${item.title} from ${item.source}, ${timeAgo}. Opens in new tab`}
    >
      {/* Image */}
      {showImage ? (
        <div className="relative w-full h-48 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <PriorityIndicator priority={item.priority} size="md" />
          </div>
        </div>
      ) : (
        // Most feed items (USGS/NWS/NHC data feeds) have no image. Rather than
        // a blank card, show a category-colored banner with the category icon so
        // imageless cards read as deliberate and stay scannable by category.
        <div
          className={cn(
            'relative w-full h-24 flex items-center justify-center border-b-2',
            categoryConfig.colorClass
          )}
          aria-hidden="true"
        >
          <CategoryIcon className="w-10 h-10 opacity-90" />
          <div className="absolute top-2 right-2 flex gap-2">
            <PriorityIndicator priority={item.priority} size="md" />
          </div>
        </div>
      )}

      {/* Header */}
      <CardHeader className="flex-1">
        <div className="flex gap-2 mb-2 flex-wrap">
          <CategoryBadge category={item.category} />
          {/* Magnitude badge for earthquakes */}
          {item.magnitude && (
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border-2 rounded font-mono',
              item.magnitude >= 6 ? 'bg-red-600 text-white border-red-800' :
              item.magnitude >= 5 ? 'bg-orange-500 text-white border-orange-700' :
              'bg-yellow-500 text-black border-yellow-700'
            )}>
              <Activity className="w-3 h-3" />
              M{item.magnitude.toFixed(1)}
            </span>
          )}
        </div>
        <CardTitle
          className={cn(
            'text-base sm:text-lg font-bold font-mono line-clamp-3',
            themeClasses.headerText
          )}
        >
          {truncatedTitle}
        </CardTitle>
      </CardHeader>

      {/* Description */}
      {truncatedDescription && (
        <CardContent className="pt-0">
          <p className={cn('text-sm line-clamp-3', themeClasses.text)}>{truncatedDescription}</p>
        </CardContent>
      )}

      {/* Footer */}
      <CardFooter className="flex justify-between items-center border-t-2 pt-4 gap-2">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className={cn('text-xs flex items-center gap-1', themeClasses.text)}>
            <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{timeAgo}</span>
          </div>
          {item.location && (
            <div className={cn('text-xs flex items-center gap-1', themeClasses.text)}>
              <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{item.location}</span>
            </div>
          )}
          <div className={cn('text-xs truncate', themeClasses.text)}>
            {item.source}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn('font-mono font-bold text-xs border-2 flex-shrink-0', 'text-primary')}
          onClick={(e) => {
            e.stopPropagation();
            openSafeUrl();
          }}
          aria-label={`Read full article: ${item.title}`}
        >
          READ <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Calculate time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as date if older than 7 days
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
