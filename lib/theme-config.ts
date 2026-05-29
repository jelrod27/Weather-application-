/**
 * 16-Bit Weather Platform - Theme Configuration
 * 
 * Defines all available themes including premium themes for registered users
 * Colors are defined in globals.css as CSS custom properties
 */

export type ThemeType = 'nord' | 'daybreak' | 'synthwave84' | 'dracula' | 'cyberpunk' | 'matrix';

export interface ThemeDefinition {
  name: ThemeType;
  displayName: string;
  isPremium: boolean;
  description?: string;
}

export const THEME_DEFINITIONS: Record<ThemeType, ThemeDefinition> = {
  // Free themes
  nord: {
    name: 'nord',
    displayName: 'Nord',
    isPremium: false,
    description: 'Arctic, north-bluish color palette'
  },
  daybreak: {
    name: 'daybreak',
    displayName: 'Daybreak',
    isPremium: false,
    description: 'Warm dawn light theme with a sunrise horizon'
  },
  // Premium themes - only for registered users
  synthwave84: {
    name: 'synthwave84',
    displayName: 'Synthwave \'84 🌆',
    isPremium: true,
    description: 'Neon-soaked 1980s Miami aesthetic'
  },
  dracula: {
    name: 'dracula',
    displayName: 'Dracula 🦇',
    isPremium: true,
    description: 'Gothic vampire castle meets modern development'
  },
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk 2077 🤖',
    isPremium: true,
    description: 'Futuristic dystopian cityscape'
  },
  matrix: {
    name: 'matrix',
    displayName: 'Terminal Green (Matrix) 💻',
    isPremium: true,
    description: 'Classic phosphor terminal with Matrix look'
  }
};

// Get list of all theme names
export const THEME_LIST = Object.keys(THEME_DEFINITIONS) as ThemeType[];

// Get list of free themes
export const FREE_THEMES = THEME_LIST.filter(
  theme => !THEME_DEFINITIONS[theme].isPremium
);

// Get list of premium themes
export const PREMIUM_THEMES = THEME_LIST.filter(
  theme => THEME_DEFINITIONS[theme].isPremium
);

// Check if a theme is premium
export const isThemePremium = (theme: ThemeType): boolean => {
  return THEME_DEFINITIONS[theme]?.isPremium ?? false;
};

// Get theme definition
export const getThemeDefinition = (theme: ThemeType): ThemeDefinition => {
  return THEME_DEFINITIONS[theme] || THEME_DEFINITIONS.nord;
};