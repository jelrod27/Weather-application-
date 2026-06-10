/**
 * 16-Bit Weather Platform - Learning Card Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Card component for educational content sections on Learn hub page
 */

'use client';

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LearningCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  itemCount?: number;
}

export default function LearningCard({
  href,
  icon: Icon,
  title,
  description,
  itemCount
}: LearningCardProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  return (
    <Link href={href} className="block h-full">
      <Card className={cn(
        'h-full container-primary glow-interactive transition-all duration-300',
        'hover:scale-105 flex flex-col',
        themeClasses.background,
        themeClasses.text
      )}>
        <CardHeader className="text-center pb-2">
          <div className={cn(
            'w-16 h-16 flex items-center justify-center container-nested mb-4 mx-auto transition-colors rounded-md',
            'group-hover:animate-pulse',
            themeClasses.accentBg
          )}>
            <Icon className="w-8 h-8 text-black" />
          </div>
          <CardTitle className={cn(
            'text-xl font-bold font-mono uppercase mb-2 transition-colors',
            'group-hover:' + themeClasses.accentText,
            themeClasses.headerText
          )}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 text-center">
          <p className={cn(
            'text-sm font-mono mb-4',
            themeClasses.text
          )}>
            {description}
          </p>

          {itemCount !== undefined && (
            <Badge variant="outline" className={cn(
              'font-mono font-bold border border-subtle',
              themeClasses.text
            )}>
              {itemCount} ITEMS
            </Badge>
          )}
        </CardContent>
        <CardFooter className={cn(
          'border-t border-subtle flex items-center justify-between py-3'
        )}>
          <span className={cn(
            'text-sm font-mono font-bold uppercase',
            themeClasses.accentText
          )}>
            EXPLORE
          </span>
          <span className={cn(
            'text-lg font-bold transition-transform group-hover:translate-x-2',
            themeClasses.accentText
          )}>
            →
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
