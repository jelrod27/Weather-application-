/**
 * 16-Bit Weather Platform - Category Badge Component
 */

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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CATEGORY_CONFIG, type FeedCategory } from '@/lib/services/rss/feedSources';

const CATEGORY_ICONS: Record<FeedCategory, React.ComponentType<{ className?: string }>> = {
  earthquakes: Activity,
  volcanoes: Mountain,
  space: Sun,
  climate: Thermometer,
  severe: CloudLightning,
  science: FlaskConical,
  hurricanes: Wind,
};

interface CategoryBadgeProps {
  category: FeedCategory;
  className?: string;
}

export function getCategoryConfig(category: FeedCategory) {
  const config = CATEGORY_CONFIG[category];
  return {
    label: config.shortLabel,
    icon: CATEGORY_ICONS[category],
    colorClass: config.badgeClass,
    bannerClass: config.bannerClass,
  };
}

export default function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide border-2 font-mono',
        config.colorClass,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  );
}
