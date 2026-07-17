/**
 * 16-Bit Weather Platform - Learn Hub Page
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Central hub for all educational weather content
 */

'use client';

import React from 'react';
import { Cloud, Zap, BookOpen, BookMarked, Satellite } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import PageWrapper from '@/components/page-wrapper';
import LearningCard from '@/components/learn/LearningCard';
import { Card, CardContent } from '@/components/ui/card';

export default function LearnPage() {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  const learningTopics = [
    {
      href: '/cloud-types',
      icon: Cloud,
      title: 'Cloud Atlas',
      description: 'Master 10 distinct cloud formations with Latin etymology, altitude classifications, and 16-bit visualizations.',
      itemCount: 10
    },
    {
      href: '/weather-systems',
      icon: Zap,
      title: 'Weather Systems',
      description: 'Analyze the atmospheric dynamics of 16 major storm types, complete with historical case studies and threat levels.',
      itemCount: 16
    },
    {
      href: '/fun-facts',
      icon: BookOpen,
      title: '16-Bit Takes',
      description: 'The science behind the strange. From Ball Lightning to Thundersnow, explore meteorology\'s rarest phenomena.',
      itemCount: 12
    },
    {
      href: '/map',
      icon: Satellite,
      title: 'Radar & Models',
      description: 'Professional-grade NEXRAD radar and GFS forecasting models, rendered in high-fidelity 16-bit style.',
      itemCount: undefined
    },
    {
      href: '/learn/glossary',
      icon: BookMarked,
      title: 'Weather Glossary',
      description: 'In-depth definitions of every weather metric. UV Index, humidity, pressure, wind, and more explained with practical tips.',
      itemCount: 10
    }
  ];

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8', themeClasses.background)}>
        {/* Header Section */}
        <div className="mb-10">
          <h1
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 font-mono',
              themeClasses.accentText,
              themeClasses.glow
            )}
          >
            WEATHER GUIDE
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-3xl', themeClasses.text)}>
            Explore our comprehensive weather education platform. From cloud identification to extreme weather events,
            learn about meteorology with retro terminal aesthetics.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>{learningTopics.length}</div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Topics</div>
            </CardContent>
          </Card>
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>50+</div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Articles</div>
            </CardContent>
          </Card>
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>100%</div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Free</div>
            </CardContent>
          </Card>
          <Card className={cn('container-nested', themeClasses.background)}>
            <CardContent className="p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', themeClasses.accentText)}>24/7</div>
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>Updated</div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {learningTopics.map((topic) => (
            <LearningCard key={topic.href} {...topic} />
          ))}
        </div>

        {/* Call to Action */}
        <Card className={cn('container-primary text-center', themeClasses.background)}>
          <CardContent className="p-8">
            <h2 className={cn('text-2xl font-bold font-mono mb-3', themeClasses.headerText)}>
              STAY CURIOUS
            </h2>
            <p className={cn('text-sm font-mono mb-4', themeClasses.text)}>
              New educational content added regularly. Check back often to expand your meteorology knowledge.
            </p>
            <div className={cn('inline-block px-4 py-2 text-xs font-mono font-bold rounded', themeClasses.accentBg)}>
              LAST UPDATED: JANUARY 2025
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
