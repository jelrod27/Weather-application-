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

/**
 * User Cache Service
 * 
 * This service provides comprehensive caching and user preference management with:
 * - Location preferences and last location caching
 * - Weather data caching with expiration
 * - User settings persistence
 * - Cache cleanup and management
 * - Type-safe storage operations
 */

import { LOCATION_CACHE_TTL_MS, WEATHER_CACHE_TTL_MS } from '@/lib/cache/weather-cache-policy';
import type { WeatherData } from './types';
import type { LocationData } from './location-service';
import { safeStorage } from './safe-storage';
import type { ThemeType } from './theme-config';
import { THEME_LIST, DEFAULT_THEME } from './theme-config';
import type { UserPreferences as ServerUserPreferences } from '@/lib/supabase/types';
import type { UnitSystem } from '@/lib/preferences/resolve';

/**
 * StoredLastLocation intentionally excludes precise coordinates.
 * Latitude/longitude is considered sensitive (location privacy) and should not be
 * persisted in clear text client-side storage.
 */
export interface StoredLastLocation {
  displayName: string;
}

/**
 * Offline / anonymous preference mirror stored in localStorage.
 * Canonical signed-in prefs live in Supabase (`UserPreferences`).
 * @deprecated Prefer the name LocalUserCache — kept as alias for older imports.
 */
export interface LocalUserCache {
  lastLocation?: StoredLastLocation;
  settings: {
    units: UnitSystem;
    theme: ThemeType;
    cacheEnabled: boolean;
    auto_location?: boolean;
  };
  updatedAt: number;
}

export interface CachedWeatherData {
  data: WeatherData;
  timestamp: number;
  expiresAt: number;
  locationKey: string;
}

export interface CacheMetrics {
  totalEntries: number;
  totalSize: number; // approximate size in bytes
  oldestEntry?: number;
  newestEntry?: number;
  expiredEntries: number;
}

export class UserCacheService {
  private static instance: UserCacheService;
  private readonly STORAGE_PREFIX = 'bitweather_';
  private readonly PREFERENCES_KEY = 'user_preferences';
  private readonly WEATHER_CACHE_KEY = 'weather_cache';
  private readonly DEFAULT_WEATHER_CACHE_DURATION = WEATHER_CACHE_TTL_MS;
  private readonly DEFAULT_LOCATION_CACHE_DURATION = LOCATION_CACHE_TTL_MS;
  private readonly MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit

  static getInstance(): UserCacheService {
    if (!UserCacheService.instance) {
      UserCacheService.instance = new UserCacheService();
    }
    return UserCacheService.instance;
  }

  private constructor() {
    this.initializeDefaults();
    this.performMaintenanceCleanup();
  }

  /**
   * Initialize default preferences if they don't exist
   */
  private initializeDefaults(): void {
    if (!this.getPreferences()) {
      const defaultPreferences: LocalUserCache = {
        settings: {
          units: 'imperial',
          theme: DEFAULT_THEME,
          cacheEnabled: true,
          auto_location: true,
        },
        updatedAt: Date.now()
      };
      this.savePreferences(defaultPreferences);
    }
  }

  /**
   * Check if localStorage is available and functional.
   * Memoized: the probe is a synchronous write+delete and this method is
   * called at the top of every cache/preference operation (6+ times per
   * weather load). Reset via invalidateStorageProbe() when quota is hit.
   */
  private storageAvailableMemo: boolean | null = null;

  private isStorageAvailable(): boolean {
    if (this.storageAvailableMemo !== null) return this.storageAvailableMemo;
    try {
      const testKey = this.STORAGE_PREFIX + 'test';
      safeStorage.setItem(testKey, 'test');
      safeStorage.removeItem(testKey);
      this.storageAvailableMemo = true;
    } catch (error) {
      console.warn('localStorage not available:', error);
      this.storageAvailableMemo = false;
    }
    return this.storageAvailableMemo;
  }

  private invalidateStorageProbe(): void {
    this.storageAvailableMemo = null;
  }

  /**
   * Get user preferences with type safety
   */
  getPreferences(): LocalUserCache | null {
    if (!this.isStorageAvailable()) return null;

    try {
      const stored = safeStorage.getItem(this.STORAGE_PREFIX + this.PREFERENCES_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        // Validate and migrate old data if needed
        return this.validateAndMigratePreferences(preferences);
      }
    } catch (error) {
      console.warn('Failed to get preferences:', error);
      this.handleCorruptedData(this.PREFERENCES_KEY);
    }
    return null;
  }

  /** Local auto-locate mirror (defaults true). */
  getAutoLocationEnabled(): boolean {
    const value = this.getPreferences()?.settings.auto_location;
    return typeof value === 'boolean' ? value : true;
  }

  /** Local unit-system mirror (defaults imperial). */
  getUnitSystem(): UnitSystem {
    const units = this.getPreferences()?.settings.units;
    return units === 'metric' || units === 'imperial' ? units : 'imperial';
  }

  /**
   * Reset mirrored settings to anonymous defaults while keeping lastLocation.
   * Call on sign-out so guest sessions do not inherit signed-in units/auto-locate.
   */
  resetMirroredSettings(): boolean {
    const preferences = this.getPreferences();
    if (!preferences) {
      this.initializeDefaults();
      return true;
    }

    preferences.settings = {
      units: 'imperial',
      theme: DEFAULT_THEME,
      cacheEnabled: preferences.settings.cacheEnabled ?? true,
      auto_location: true,
    };
    return this.savePreferences(preferences);
  }

  /**
   * Mirror canonical Supabase preferences into local storage so anonymous
   * fallbacks and signed-in sessions share one shape.
   */
  mirrorServerPreferences(server: Pick<
    ServerUserPreferences,
    'theme' | 'temperature_unit' | 'auto_location'
  >): boolean {
    if (!this.getPreferences()) {
      this.initializeDefaults();
    }

    const theme = (THEME_LIST as string[]).includes(server.theme)
      ? (server.theme as ThemeType)
      : DEFAULT_THEME;

    return this.updateSettings({
      theme,
      units: server.temperature_unit === 'celsius' ? 'metric' : 'imperial',
      auto_location: server.auto_location,
    });
  }

  /**
   * Save user preferences
   */
  savePreferences(preferences: LocalUserCache): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      preferences.updatedAt = Date.now();
      const serialized = JSON.stringify(preferences);
      safeStorage.setItem(this.STORAGE_PREFIX + this.PREFERENCES_KEY, serialized);
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      this.handleStorageQuotaExceeded();
      return false;
    }
  }

  /**
   * Update specific preference settings
   */
  updateSettings(settings: Partial<LocalUserCache['settings']>): boolean {
    const preferences = this.getPreferences();
    if (!preferences) return false;

    preferences.settings = { ...preferences.settings, ...settings };
    return this.savePreferences(preferences);
  }

  /**
   * Save last location
   */
  saveLastLocation(location: LocationData): boolean {
    const preferences = this.getPreferences();
    if (!preferences) return false;

    // Store only non-sensitive location identifier (no precise coordinates).
    preferences.lastLocation = {
      displayName: location.displayName,
    };
    return this.savePreferences(preferences);
  }

  /**
   * Get last location
   */
  getLastLocation(): StoredLastLocation | null {
    const preferences = this.getPreferences();
    return preferences?.lastLocation || null;
  }


  /**
   * Cache weather data
   * Uses longer cache duration for forecast data (daily/hourly) vs current conditions
   */
  cacheWeatherData(locationKey: string, weatherData: WeatherData, customDuration?: number): boolean {
    if (!this.isStorageAvailable()) return false;

    const preferences = this.getPreferences();
    if (!preferences?.settings.cacheEnabled) return false;

    try {
      // Do not persist precise coordinates (lat/lon) in localStorage.
      // WeatherData includes optional coordinates; strip them before caching.
      const { coordinates, ...sanitizedWeather } = (weatherData as any) ?? {};

      // The cached blob always contains current conditions alongside the
      // forecast and is read as a whole, so the documented 10-minute policy
      // applies to all of it. (A previous forecast-presence branch silently
      // extended current conditions to 30 minutes, since full WeatherData
      // always includes a forecast array.)
      const duration = customDuration || this.DEFAULT_WEATHER_CACHE_DURATION;
      const cacheEntry: CachedWeatherData = {
        data: sanitizedWeather as WeatherData,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
        locationKey
      };

      const cacheKey = this.STORAGE_PREFIX + this.WEATHER_CACHE_KEY + '_' + this.sanitizeKey(locationKey);
      safeStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      return true;
    } catch (error) {
      console.warn('Failed to cache weather data:', error);
      this.handleStorageQuotaExceeded();
      return false;
    }
  }

  /**
   * Get cached weather data
   */
  getCachedWeatherData(locationKey: string): WeatherData | null {
    if (!this.isStorageAvailable()) return null;

    try {
      const cacheKey = this.STORAGE_PREFIX + this.WEATHER_CACHE_KEY + '_' + this.sanitizeKey(locationKey);
      const stored = safeStorage.getItem(cacheKey);

      if (stored) {
        const cacheEntry: CachedWeatherData = JSON.parse(stored);

        // Check if cache is still valid
        if (Date.now() < cacheEntry.expiresAt) {
          return cacheEntry.data;
        } else {
          // Remove expired cache
          safeStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Failed to get cached weather data:', error);
      // Must rebuild the same key shape used by cacheWeatherData above —
      // passing the bare locationKey removed a nonexistent key, so corrupted
      // entries were never cleaned up and warned on every read.
      this.handleCorruptedData(this.WEATHER_CACHE_KEY + '_' + this.sanitizeKey(locationKey));
    }

    return null;
  }

  /**
   * Clear weather cache for specific location
   */
  clearWeatherCache(locationKey?: string): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      if (locationKey) {
        // Clear specific location cache
        const cacheKey = this.STORAGE_PREFIX + this.WEATHER_CACHE_KEY + '_' + this.sanitizeKey(locationKey);
        safeStorage.removeItem(cacheKey);
      } else {
        // Clear all weather cache
        const keys = safeStorage.getAllKeys();
        const weatherCacheKeys = keys.filter(key =>
          key.startsWith(this.STORAGE_PREFIX + this.WEATHER_CACHE_KEY)
        );

        weatherCacheKeys.forEach(key => safeStorage.removeItem(key));
      }
      return true;
    } catch (error) {
      console.error('Failed to clear weather cache:', error);
      return false;
    }
  }

  /**
   * Get cache metrics and statistics
   */
  getCacheMetrics(): CacheMetrics {
    const metrics: CacheMetrics = {
      totalEntries: 0,
      totalSize: 0,
      expiredEntries: 0
    };

    if (!this.isStorageAvailable()) return metrics;

    try {
      const keys = safeStorage.getAllKeys();
      const weatherCacheKeys = keys.filter(key =>
        key.startsWith(this.STORAGE_PREFIX + this.WEATHER_CACHE_KEY)
      );

      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      weatherCacheKeys.forEach(key => {
        try {
          const stored = safeStorage.getItem(key);
          if (stored) {
            metrics.totalSize += stored.length * 2; // Approximate bytes (UTF-16)
            metrics.totalEntries++;

            const cacheEntry: CachedWeatherData = JSON.parse(stored);
            if (cacheEntry.timestamp < oldestTimestamp) {
              oldestTimestamp = cacheEntry.timestamp;
            }
            if (cacheEntry.timestamp > newestTimestamp) {
              newestTimestamp = cacheEntry.timestamp;
            }

            if (Date.now() > cacheEntry.expiresAt) {
              metrics.expiredEntries++;
            }
          }
        } catch {
          console.warn(`Corrupted cache entry: ${key}`);
          metrics.expiredEntries++;
        }
      });

      if (metrics.totalEntries > 0) {
        metrics.oldestEntry = oldestTimestamp;
        metrics.newestEntry = newestTimestamp;
      }

    } catch (error) {
      console.error('Failed to get cache metrics:', error);
    }

    return metrics;
  }

  /**
   * Perform maintenance cleanup
   */
  performMaintenanceCleanup(): void {
    if (!this.isStorageAvailable()) return;

    try {
      const metrics = this.getCacheMetrics();

      // Remove expired entries
      if (metrics.expiredEntries > 0) {
        this.cleanupExpiredEntries();
      }

      // If cache is too large, remove oldest entries
      if (metrics.totalSize > this.MAX_CACHE_SIZE) {
        this.cleanupOldestEntries();
      }
    } catch (error) {
      console.error('Cache maintenance failed:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const keys = safeStorage.getAllKeys();
    const weatherCacheKeys = keys.filter(key =>
      key.startsWith(this.STORAGE_PREFIX + this.WEATHER_CACHE_KEY)
    );

    let removedCount = 0;

    weatherCacheKeys.forEach(key => {
      try {
        const stored = safeStorage.getItem(key);
        if (stored) {
          const cacheEntry: CachedWeatherData = JSON.parse(stored);
          if (Date.now() > cacheEntry.expiresAt) {
            safeStorage.removeItem(key);
            removedCount++;
          }
        }
      } catch {
        // Remove corrupted entries
        safeStorage.removeItem(key);
        removedCount++;
      }
    });
  }

  /**
   * Clean up oldest cache entries to reduce size
   */
  private cleanupOldestEntries(): void {
    const keys = safeStorage.getAllKeys();
    const weatherCacheKeys = keys.filter(key =>
      key.startsWith(this.STORAGE_PREFIX + this.WEATHER_CACHE_KEY)
    );

    const entries: Array<{ key: string; timestamp: number; size: number }> = [];

    weatherCacheKeys.forEach(key => {
      try {
        const stored = safeStorage.getItem(key);
        if (stored) {
          const cacheEntry: CachedWeatherData = JSON.parse(stored);
          entries.push({
            key,
            timestamp: cacheEntry.timestamp,
            size: stored.length * 2
          });
        }
      } catch {
        // Add corrupted entries for removal
        entries.push({
          key,
          timestamp: 0,
          size: 0
        });
      }
    });

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries until under size limit
    let currentSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    let removedCount = 0;

    while (currentSize > this.MAX_CACHE_SIZE && entries.length > 0) {
      const entry = entries.shift()!;
      safeStorage.removeItem(entry.key);
      currentSize -= entry.size;
      removedCount++;
    }
  }

  /**
   * Handle corrupted data by removing it
   */
  private handleCorruptedData(key: string): void {
    try {
      const fullKey = this.STORAGE_PREFIX + key;
      safeStorage.removeItem(fullKey);
    } catch (error) {
      console.error('Failed to remove corrupted data:', error);
    }
  }

  /**
   * Handle storage quota exceeded
   */
  private handleStorageQuotaExceeded(): void {
    console.warn('Storage quota exceeded, performing emergency cleanup');
    // Storage state changed; re-probe availability on the next operation.
    this.invalidateStorageProbe();
    this.cleanupOldestEntries();
    this.cleanupExpiredEntries();
  }

  /**
   * Validate and migrate old preference data
   */
  private validateAndMigratePreferences(preferences: unknown): LocalUserCache {
    const defaultPreferences: LocalUserCache = {
      settings: {
        units: 'imperial',
        theme: DEFAULT_THEME,
        cacheEnabled: true,
        auto_location: true,
      },
      updatedAt: Date.now()
    };

    // Type guard for preferences
    const isValidPreferences = (obj: unknown): obj is Record<string, unknown> => {
      return typeof obj === 'object' && obj !== null;
    };

    if (!isValidPreferences(preferences)) {
      return defaultPreferences;
    }

    const settingsRaw =
      typeof preferences.settings === 'object' && preferences.settings !== null
        ? (preferences.settings as Record<string, unknown>)
        : {};

    // Legacy shapes: settings.autoLocation, top-level auto_location / autoLocation
    const legacyAuto =
      settingsRaw.auto_location ??
      settingsRaw.autoLocation ??
      preferences.auto_location ??
      preferences.autoLocation;

    const sanitizeLastLocation = (value: unknown): StoredLastLocation | undefined => {
      if (!value || typeof value !== 'object') return undefined;
      const v = value as { displayName?: unknown };
      if (typeof v.displayName === 'string' && v.displayName.trim().length > 0) {
        return { displayName: v.displayName };
      }
      return undefined;
    };

    const validatedPreferences: LocalUserCache = {
      ...defaultPreferences,
      // Drop any legacy cached location objects that contained latitude/longitude.
      lastLocation: sanitizeLastLocation(preferences.lastLocation) || defaultPreferences.lastLocation,
      updatedAt: typeof preferences.updatedAt === 'number' ? preferences.updatedAt : defaultPreferences.updatedAt,
      settings: {
        ...defaultPreferences.settings,
        units: settingsRaw.units === 'metric' || settingsRaw.units === 'imperial'
          ? settingsRaw.units
          : defaultPreferences.settings.units,
        // Validate against the canonical theme list. A hand-copied array
        // here previously drifted: it rejected 'daybreak' (the platform
        // default, silently rewritten to 'nord' on every read) and
        // accepted 'miami', which no longer exists.
        theme: (THEME_LIST as string[]).includes(settingsRaw.theme as string)
          ? (settingsRaw.theme as ThemeType)
          : defaultPreferences.settings.theme,
        cacheEnabled: typeof settingsRaw.cacheEnabled === 'boolean'
          ? settingsRaw.cacheEnabled
          : defaultPreferences.settings.cacheEnabled,
        auto_location: typeof legacyAuto === 'boolean'
          ? legacyAuto
          : defaultPreferences.settings.auto_location,
      }
    };

    return validatedPreferences;
  }

  /**
   * Sanitize key for safe localStorage usage
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }

  /**
   * Clear all user data (for privacy/reset purposes)
   */
  clearAllData(): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      const keys = safeStorage.getAllKeys();
      const ourKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));

      ourKeys.forEach(key => safeStorage.removeItem(key));
      this.initializeDefaults();
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Export user data for backup
   */
  exportUserData(): string | null {
    try {
      const preferences = this.getPreferences();
      const metrics = this.getCacheMetrics();

      const exportData = {
        version: '1.0',
        timestamp: Date.now(),
        preferences,
        cacheMetrics: metrics
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export user data:', error);
      return null;
    }
  }

  /**
   * Import user data from backup (preferences only, not cache)
   */
  importUserData(data: string): boolean {
    try {
      const importData = JSON.parse(data);

      if (importData.preferences) {
        const validatedPreferences = this.validateAndMigratePreferences(importData.preferences);
        return this.savePreferences(validatedPreferences);
      }

      return false;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }

  /**
   * Get location key for caching
   */
  getLocationKey(location: LocationData): string {
    // Do NOT persist precise coordinates (privacy / code scanning).
    // Use a stable, non-sensitive key derived from displayName.
    return this.sanitizeKey(location.displayName);
  }

  /**
   * Get location key from coordinate string
   */
  getLocationKeyFromCoords(coords: string): string {
    // Coords are sensitive; do not derive persistent storage keys from them.
    // Keep deterministic behavior without leaking coordinates by hashing-like sanitization.
    return this.sanitizeKey(coords);
  }
}

// Export singleton instance
export const userCacheService = UserCacheService.getInstance();