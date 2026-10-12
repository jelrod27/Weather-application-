/**
 * 16-Bit Weather Platform - News Empty State Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

'use client';

import React from 'react';
import { Cloud, CheckCircle, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';

interface NewsEmptyProps {
  type?: 'no-alerts' | 'no-results' | 'error' | 'no-news';
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function NewsEmpty({
  type = 'no-news',
  message,
  onRetry,
  className,
}: NewsEmptyProps): React.JSX.Element {
  const themeClasses = themeTokens.weather;

  const configs = {
    'no-alerts': {
      icon: CheckCircle,
      title: 'No Current NWS Warnings in This Feed',
      description: message || 'The latest verified source check returned no current warnings. Check the Warning Center and official sources for your area.',
      iconColor: 'text-green-500',
    },
    'no-results': {
      icon: Search,
      title: 'No Results Found',
      description: message || 'No articles match your current filters. Try adjusting your search criteria.',
      iconColor: 'text-gray-500',
    },
    error: {
      icon: AlertCircle,
      title: 'Unable to Load News',
      description: message || 'We encountered an error loading news. Please try again.',
      iconColor: 'text-red-500',
    },
    'no-news': {
      icon: Cloud,
      title: 'No Weather News',
      description: message || 'No recent weather news available. Check back soon!',
      iconColor: 'text-terminal-accent-info',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <Card className={cn('border-2', themeClasses.borderColor, className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <Icon className={cn('w-16 h-16 mb-4', config.iconColor)} />
        <h3 className={cn('text-xl font-bold font-mono mb-2', themeClasses.headerText)}>
          {config.title}
        </h3>
        <p className={cn('text-sm text-center mb-6 max-w-md', themeClasses.text)}>
          {config.description}
        </p>
        {onRetry && type === 'error' && (
          <Button
            onClick={onRetry}
            className={cn('font-mono font-bold', themeClasses.accentBg)}
          >
            TRY AGAIN
          </Button>
        )}
        {type === 'no-results' && (
          <p className={cn('text-xs mt-4', themeClasses.text)}>
            Tip: Try using broader search terms or removing some filters
          </p>
        )}
      </CardContent>
    </Card>
  );
}
