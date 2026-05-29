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
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Serialize an object for safe embedding inside <script type="application/ld+json">. */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
}

// Application Constants
export const APP_CONSTANTS = {
  STORAGE_KEYS: {
    THEME: 'weather-edu-theme',
    WEATHER_CACHE: 'bitweather_weather_data',
    WEATHER_CITY: 'bitweather_city',
    CACHE_TIMESTAMP: 'bitweather_cache_timestamp',
    RATE_LIMIT: 'weather-app-rate-limit',
    SNAKE_SCORES: 'snakeHighScores',
    TETRIS_SCORES: 'tetrisHighScores',
    PACMAN_SCORES: 'pacmanHighScores',
  },
  RATE_LIMITS: {
    MAX_REQUESTS_PER_HOUR: 10,
    COOLDOWN_SECONDS: 2,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    MAX_REQUESTS: 5
  },
  CACHE: {
    EXPIRY_MINUTES: 10,
  }
} as const

// Validation utilities
const validation = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  isValidUrl: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// Date and time utilities
const dateUtils = {
  formatTimestamp: (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
  },

  isExpired: (timestamp: number, expiryMinutes: number = APP_CONSTANTS.CACHE.EXPIRY_MINUTES): boolean => {
    const now = Date.now()
    const expiry = timestamp + (expiryMinutes * 60 * 1000)
    return now > expiry
  },

  getCurrentTimestamp: (): number => Date.now()
}

// Error handling utilities
const errorUtils = {
  logError: (context: string, error: unknown): void => {
    console.error(`[${context}]`, error)
  },

  createErrorMessage: (context: string, fallback: string = 'An error occurred'): string => {
    return `${context}: ${fallback}`
  }
}
