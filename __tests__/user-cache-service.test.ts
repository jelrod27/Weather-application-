/**
 * Unit tests for UserCacheService preference validation and cache hygiene.
 *
 * Regression coverage for the 2026-06 review:
 * - Theme validation must track the canonical THEME_LIST; a hand-copied
 *   whitelist previously rejected 'daybreak' (the platform default, rewritten
 *   to 'nord' on every read) and accepted the removed 'miami' theme.
 * - Corrupted weather-cache entries must be removed under the same key shape
 *   they were stored with.
 */

import { userCacheService } from '@/lib/user-cache-service';
import { DEFAULT_THEME } from '@/lib/theme-config';

const PREFS_KEY = 'bitweather_user_preferences';

beforeEach(() => {
  localStorage.clear();
});

describe('preference theme validation', () => {
  it('preserves the daybreak theme across a read round-trip', () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        settings: { units: 'imperial', theme: 'daybreak', cacheEnabled: true },
        updatedAt: Date.now(),
      })
    );

    const prefs = userCacheService.getPreferences();
    expect(prefs?.settings.theme).toBe('daybreak');
  });

  it('falls back to the platform default for removed themes', () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        settings: { units: 'imperial', theme: 'miami', cacheEnabled: true },
        updatedAt: Date.now(),
      })
    );

    const prefs = userCacheService.getPreferences();
    expect(prefs?.settings.theme).toBe(DEFAULT_THEME);
  });
});

describe('corrupted weather cache cleanup', () => {
  it('removes a corrupted entry under the key it was stored with', () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        settings: { units: 'imperial', theme: DEFAULT_THEME, cacheEnabled: true },
        updatedAt: Date.now(),
      })
    );

    const locationKey = 'Chicago, IL';
    const sanitized = locationKey.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const cacheKey = `bitweather_weather_cache_${sanitized}`;
    localStorage.setItem(cacheKey, '{not valid json');

    expect(userCacheService.getCachedWeatherData(locationKey)).toBeNull();
    // Previously the cleanup removed bitweather_<locationKey> (nonexistent),
    // leaving the corrupted entry to warn on every subsequent read.
    expect(localStorage.getItem(cacheKey)).toBeNull();
  });
});
