/**
 * 16-Bit Weather Platform - News Filter Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

'use client';

import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Activity, 
  Mountain, 
  Sun, 
  Thermometer, 
  CloudLightning, 
  FlaskConical, 
  Wind,
  LayoutGrid
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { CATEGORY_CONFIG, type FeedCategory } from '@/lib/services/rss/feedSources';

type FilterCategory = FeedCategory | 'all';

interface NewsFilterProps {
  onCategoryChange: (category: FilterCategory) => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  currentCategory?: FilterCategory;
  searchQuery?: string;
  isLoading?: boolean;
  className?: string;
}

const categories: { id: FilterCategory; label: string; icon: React.ComponentType<{ className?: string }>; tabClass?: string }[] = [
  { id: 'all', label: 'ALL', icon: LayoutGrid },
  { id: 'earthquakes', label: 'QUAKES', icon: Activity, tabClass: CATEGORY_CONFIG.earthquakes.tabActiveClass },
  { id: 'volcanoes', label: 'VOLCANOES', icon: Mountain, tabClass: CATEGORY_CONFIG.volcanoes.tabActiveClass },
  { id: 'space', label: 'SPACE', icon: Sun, tabClass: CATEGORY_CONFIG.space.tabActiveClass },
  { id: 'climate', label: 'CLIMATE', icon: Thermometer, tabClass: CATEGORY_CONFIG.climate.tabActiveClass },
  { id: 'severe', label: 'SEVERE', icon: CloudLightning, tabClass: CATEGORY_CONFIG.severe.tabActiveClass },
  { id: 'hurricanes', label: 'TROPICAL', icon: Wind, tabClass: CATEGORY_CONFIG.hurricanes.tabActiveClass },
  { id: 'science', label: 'SCIENCE', icon: FlaskConical, tabClass: CATEGORY_CONFIG.science.tabActiveClass },
];

export default function NewsFilter({
  onCategoryChange,
  onSearchChange,
  onRefresh,
  currentCategory = 'all',
  searchQuery = '',
  isLoading = false,
  className,
}: NewsFilterProps) {
  const themeClasses = themeTokens.navigation;

  const [localSearch, setLocalSearch] = React.useState(searchQuery);

  // Debounce search input
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => clearTimeout(timeout);
  }, [localSearch, onSearchChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className={cn('absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4', themeClasses.text)} />
          <Input
            type="text"
            placeholder="Search news..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className={cn(
              'pl-10 font-mono card-inner',
              themeClasses.background,
              themeClasses.text
            )}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="font-mono"
          title="Refresh news"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={currentCategory}
        onValueChange={(value) => onCategoryChange(value as FilterCategory)}
        className="w-full"
      >
        <TabsList
          className={cn(
            'w-full flex flex-wrap gap-1 p-1 font-mono h-auto container-nested',
            themeClasses.background
          )}
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className={cn(
                  'flex items-center gap-1 text-xs sm:text-sm font-bold uppercase tracking-wide data-[state=active]:ring-2 transition-all px-2 sm:px-3 py-1.5 card-inner',
                  cat.id === 'all'
                    ? 'data-[state=active]:ring-primary'
                    : cat.tabClass,
                  themeClasses.text,
                )}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Active filters indicator */}
      {(searchQuery || currentCategory !== 'all') && (
        <div className={cn('flex items-center gap-2 text-xs font-mono flex-wrap', themeClasses.text)}>
          <span>Filters:</span>
          {currentCategory !== 'all' && (
            <span className={cn('px-2 py-1 rounded card-inner', themeClasses.accentText)}>
              {categories.find(c => c.id === currentCategory)?.label || currentCategory.toUpperCase()}
            </span>
          )}
          {searchQuery && (
            <span className={cn('px-2 py-1 rounded card-inner', themeClasses.accentText)}>
              &quot;{searchQuery}&quot;
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalSearch('');
              onSearchChange('');
              onCategoryChange('all');
            }}
            className="text-xs font-mono underline"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
