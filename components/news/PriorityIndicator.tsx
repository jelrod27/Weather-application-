/**
 * 16-Bit Weather Platform - Priority Indicator Component
 */

'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NewsPriority } from '@/lib/news/types';

interface PriorityIndicatorProps {
  priority: NewsPriority;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const priorityConfig: Record<
  NewsPriority,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    textClass: string;
  }
> = {
  high: {
    label: 'URGENT',
    icon: AlertTriangle,
    colorClass: 'text-destructive',
    textClass: 'text-destructive font-bold',
  },
  medium: {
    label: 'WARNING',
    icon: AlertCircle,
    colorClass: 'text-yellow-500',
    textClass: 'text-yellow-600 font-semibold',
  },
  low: {
    label: 'INFO',
    icon: Info,
    colorClass: 'text-sky-500',
    textClass: 'text-sky-600 font-normal',
  },
};

export default function PriorityIndicator({
  priority,
  showLabel = false,
  size = 'md',
  className,
}: PriorityIndicatorProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon className={cn(sizeClasses[size], config.colorClass)} />
      {showLabel && (
        <span className={cn('text-xs font-mono uppercase tracking-wide', config.textClass)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
