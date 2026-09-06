/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 *
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

"use client"

import { ResponsiveGrid } from '@/components/responsive-container'
import { themeTokens } from '@/lib/theme-tokens'

export function WeatherSkeleton() {
  const themeClasses = themeTokens.weather

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Location Title Skeleton */}
      <div className="text-center mb-4">
        <div
          className={`h-8 rounded-md w-64 mx-auto animate-pulse ${themeClasses.cardBg}`}
          style={{ opacity: 0.5 }}
        />
      </div>

      {/* 3-column weather cards skeleton (Temperature, Conditions, Wind) */}
      <ResponsiveGrid cols={{ sm: 1, md: 3 }} className="gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={`temp-${i}`}
            className={`p-4 card-rounded-md border-0 ${themeClasses.cardBg} ${themeClasses.borderColor} animate-pulse`}
          >
            <div
              className="h-6 rounded w-24 mx-auto mb-3"
              style={{ backgroundColor: 'rgba(156, 163, 175, 0.3)' }}
            />
            <div
              className="h-10 rounded w-20 mx-auto"
              style={{ backgroundColor: 'rgba(156, 163, 175, 0.3)' }}
            />
          </div>
        ))}
      </ResponsiveGrid>

      {/* Sun/UV/Moon skeleton (3-column grid) */}
      <ResponsiveGrid cols={{ sm: 1, md: 3 }} className="gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={`sun-${i}`}
            className={`p-4 card-rounded-md border-0 ${themeClasses.cardBg} ${themeClasses.borderColor} animate-pulse`}
          >
            <div
              className="h-6 rounded w-20 mx-auto mb-2"
              style={{ backgroundColor: 'rgba(156, 163, 175, 0.3)' }}
            />
            <div
              className="h-8 rounded w-16 mx-auto"
              style={{ backgroundColor: 'rgba(156, 163, 175, 0.3)' }}
            />
          </div>
        ))}
      </ResponsiveGrid>

      {/* 5-day forecast skeleton */}
      <div className={`p-4 card-rounded-md border-0 ${themeClasses.cardBg} ${themeClasses.borderColor} animate-pulse`}>
        <div
          className="h-6 rounded w-32 mb-4"
          style={{ backgroundColor: 'rgba(156, 163, 175, 0.3)' }}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`forecast-${i}`}
              className="h-32 rounded"
              style={{ backgroundColor: 'rgba(156, 163, 175, 0.2)' }}
            />
          ))}
        </div>
      </div>

      {/* Map skeleton placeholder */}
      <div className={`h-96 card-rounded-md border-0 ${themeClasses.cardBg} ${themeClasses.borderColor} animate-pulse`}>
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="h-8 rounded w-48"
            style={{ backgroundColor: 'rgba(156, 163, 175, 0.3)' }}
          />
        </div>
      </div>
    </div>
  )
}
