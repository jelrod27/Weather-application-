/**
 * Unit tests for theme configuration
 */

import fs from 'fs';
import path from 'path';
import {
  THEME_DEFINITIONS,
  THEME_LIST,
  FREE_THEMES,
  PREMIUM_THEMES,
  isThemePremium,
  getThemeDefinition,
  type ThemeType,
} from '@/lib/theme-config';

describe('Theme Configuration', () => {
  describe('THEME_DEFINITIONS', () => {
    it('should have exactly 6 themes', () => {
      expect(Object.keys(THEME_DEFINITIONS)).toHaveLength(6);
    });

    it('should contain all expected themes', () => {
      const expectedThemes = ['nord', 'daybreak', 'synthwave84', 'dracula', 'cyberpunk', 'matrix'];
      expectedThemes.forEach(theme => {
        expect(THEME_DEFINITIONS).toHaveProperty(theme);
      });
    });

    it('should have valid structure for each theme', () => {
      Object.values(THEME_DEFINITIONS).forEach(theme => {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('displayName');
        expect(theme).toHaveProperty('isPremium');
      });
    });
  });

  describe('THEME_LIST', () => {
    it('should be an array of theme names', () => {
      expect(Array.isArray(THEME_LIST)).toBe(true);
      expect(THEME_LIST).toHaveLength(6);
    });

    it('should contain valid theme types', () => {
      THEME_LIST.forEach(theme => {
        expect(THEME_DEFINITIONS).toHaveProperty(theme);
      });
    });

    it('is listed in the live user_preferences theme CHECK migration', () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '..', 'supabase', 'migrations', '20260905_user_preferences_theme_daybreak.sql'),
        'utf8',
      );
      THEME_LIST.forEach((theme) => {
        expect(sql).toContain(`'${theme}'`);
      });
    });
  });

  describe('FREE_THEMES', () => {
    it('should contain only non-premium themes', () => {
      FREE_THEMES.forEach(theme => {
        expect(THEME_DEFINITIONS[theme].isPremium).toBe(false);
      });
    });

    it('should include nord and daybreak', () => {
      expect(FREE_THEMES).toContain('nord');
      expect(FREE_THEMES).toContain('daybreak');
    });
  });

  describe('PREMIUM_THEMES', () => {
    it('should contain only premium themes', () => {
      PREMIUM_THEMES.forEach(theme => {
        expect(THEME_DEFINITIONS[theme].isPremium).toBe(true);
      });
    });

    it('should include synthwave84, dracula, cyberpunk, and matrix', () => {
      expect(PREMIUM_THEMES).toContain('synthwave84');
      expect(PREMIUM_THEMES).toContain('dracula');
      expect(PREMIUM_THEMES).toContain('cyberpunk');
      expect(PREMIUM_THEMES).toContain('matrix');
    });
  });

  describe('isThemePremium', () => {
    it('should return false for nord theme', () => {
      expect(isThemePremium('nord')).toBe(false);
    });

    it('should return true for premium themes', () => {
      expect(isThemePremium('synthwave84')).toBe(true);
      expect(isThemePremium('dracula')).toBe(true);
      expect(isThemePremium('cyberpunk')).toBe(true);
      expect(isThemePremium('matrix')).toBe(true);
    });
  });

  describe('getThemeDefinition', () => {
    it('should return correct theme definition', () => {
      const theme = getThemeDefinition('nord');
      expect(theme.name).toBe('nord');
      expect(theme.displayName).toBe('Nord');
    });

    it('should return nord theme for invalid theme names', () => {
      const result = getThemeDefinition('invalid' as ThemeType);
      expect(result.name).toBe('nord');
    });
  });
});
