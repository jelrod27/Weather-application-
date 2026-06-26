'use client';

import React from 'react';
import {
  Activity,
  Mountain,
  Sun,
  Thermometer,
  CloudLightning,
  FlaskConical,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import { CATEGORY_CONFIG, type FeedCategory } from '@/lib/services/rss/feedSources';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import NewsCard from './NewsCard';

const SECTION_ICONS: Record<FeedCategory, React.ComponentType<{ className?: string }>> = {
  earthquakes: Activity,
  volcanoes: Mountain,
  space: Sun,
  climate: Thermometer,
  severe: CloudLightning,
  science: FlaskConical,
  hurricanes: Wind,
};

interface NewsCategorySectionsProps {
  sections: Array<{ category: FeedCategory; items: RSSItem[] }>;
  className?: string;
}

export default function NewsCategorySections({ sections, className }: NewsCategorySectionsProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  return (
    <div className={cn('space-y-8', className)}>
      {sections.map(({ category, items }) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = SECTION_ICONS[category];
        return (
          <section key={category}>
            <h2
              className={cn(
                'mb-4 flex items-center gap-2 text-xl font-bold font-mono',
                themeClasses.headerText,
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {config.label.toUpperCase()}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
