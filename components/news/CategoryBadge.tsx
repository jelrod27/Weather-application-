/**
 * 16-Bit Weather Platform - Category Badge Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

'use client';

import React from 'react';
import { 
  Cloud, 
  AlertTriangle, 
  Globe, 
  Users, 
  Thermometer, 
  Wind, 
  Bell,
  Activity,
  Mountain,
  Sun,
  FlaskConical,
  CloudLightning
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Combined category type supporting both old and new categories
type CategoryType = 
  | 'alerts' | 'breaking' | 'weather' | 'severe' | 'local' 
  | 'climate' | 'tropical' | 'community' | 'general'
  | 'earthquakes' | 'volcanoes' | 'space' | 'science' | 'hurricanes';

interface CategoryBadgeProps {
  category: CategoryType;
  className?: string;
}

const categoryConfig: Record<
  CategoryType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  }
> = {
  // New RSS categories
  earthquakes: {
    label: 'QUAKE',
    icon: Activity,
    colorClass: 'bg-orange-600 text-white border-orange-800',
  },
  volcanoes: {
    label: 'VOLCANO',
    icon: Mountain,
    colorClass: 'bg-red-700 text-white border-red-900',
  },
  space: {
    label: 'SPACE',
    icon: Sun,
    colorClass: 'bg-purple-600 text-white border-purple-800',
  },
  science: {
    label: 'SCIENCE',
    icon: FlaskConical,
    colorClass: 'bg-green-600 text-white border-green-800',
  },
  hurricanes: {
    label: 'TROPICAL',
    icon: Wind,
    colorClass: 'bg-cyan-600 text-white border-cyan-800',
  },
  // Legacy categories
  alerts: {
    label: 'ALERTS',
    icon: Bell,
    colorClass: 'bg-yellow-600 text-black border-yellow-800',
  },
  breaking: {
    label: 'BREAKING',
    icon: AlertTriangle,
    colorClass: 'bg-red-600 text-white border-red-800',
  },
  weather: {
    label: 'WEATHER',
    icon: Cloud,
    colorClass: 'bg-sky-600 text-white border-sky-800',
  },
  severe: {
    label: 'SEVERE',
    icon: CloudLightning,
    colorClass: 'bg-yellow-500 text-black border-yellow-700',
  },
  local: {
    label: 'LOCAL',
    icon: Globe,
    colorClass: 'bg-green-600 text-white border-green-800',
  },
  climate: {
    label: 'CLIMATE',
    icon: Thermometer,
    colorClass: 'bg-teal-600 text-white border-teal-800',
  },
  tropical: {
    label: 'TROPICAL',
    icon: Wind,
    colorClass: 'bg-cyan-600 text-white border-cyan-800',
  },
  community: {
    label: 'COMMUNITY',
    icon: Users,
    colorClass: 'bg-purple-600 text-white border-purple-800',
  },
  general: {
    label: 'NEWS',
    icon: Globe,
    colorClass: 'bg-gray-600 text-white border-gray-800',
  },
};

/** Icon + color for a category; falls back to the generic config. Exported so
 *  imageless news cards can reuse the same icon/color for a placeholder banner. */
export function getCategoryConfig(category: CategoryType) {
  return categoryConfig[category] || categoryConfig.general;
}

export type { CategoryType };

export default function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide border-2 font-mono',
        config.colorClass,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  );
}
