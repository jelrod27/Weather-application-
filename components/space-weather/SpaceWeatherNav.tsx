/**
 * 16-Bit Weather Platform - Space Weather Navigation Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Horizontal tab navigation bar for space weather categories.
 * Terminal-styled with strong visual affordance for clickability.
 */

'use client';

import React from 'react';
import { Monitor, Sun, Activity, Wind, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SpaceWeatherTabId = 'command' | 'solar' | 'geomagnetic' | 'wind' | 'alerts';

interface SpaceWeatherNavProps {
  activeTab: string;
  onTabChange: (tab: SpaceWeatherTabId) => void;
}

const tabs: { id: SpaceWeatherTabId; label: string; icon: React.ElementType }[] = [
  { id: 'command', label: 'Command Center', icon: Monitor },
  { id: 'solar', label: 'Solar Activity', icon: Sun },
  { id: 'geomagnetic', label: 'Geomagnetic', icon: Activity },
  { id: 'wind', label: 'Solar Wind', icon: Wind },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
];

export default function SpaceWeatherNav({ activeTab, onTabChange }: SpaceWeatherNavProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: SpaceWeatherTabId) => {
    const index = tabs.findIndex(tab => tab.id === id);
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    onTabChange(tabs[next].id);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#tab-${tabs[next].id}`)?.focus();
  };
  return (
    <nav
      className="border border-border rounded-lg bg-card/50 overflow-x-auto scrollbar-none"
      role="tablist"
      aria-label="Space weather sections"
    >
      <div className="flex min-w-max md:min-w-0 border-b border-border/50">
        <div className="flex items-center px-3 py-2 text-xs font-mono text-muted-foreground/50 border-r border-border/30">
          //
        </div>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={event => handleKeyDown(event, id)}
              aria-controls={`panel-${id}`}
              onClick={() => onTabChange(id)}
              className={cn(
                'group flex items-center gap-2 px-5 py-3 font-mono text-sm uppercase tracking-wider',
                'transition-all duration-200 whitespace-nowrap md:flex-1 md:justify-center',
                'border-b-2 -mb-px',
                isActive
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:border-muted-foreground/50'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-colors',
                  isActive ? 'text-cyan-400' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              <span className={cn(
                isActive ? '' : 'group-hover:underline underline-offset-4'
              )}>
                {isActive ? `[ ${label} ]` : label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
