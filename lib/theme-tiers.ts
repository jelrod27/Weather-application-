/**
 * 16-Bit Weather Platform - Theme Tiers System
 * Implements freemium strategy for theme access
 */

export interface ThemeConfig {
  id: string
  name: string
  displayName: string
  description: string
  tier: 'free' | 'premium'
  category: 'basic' | 'retro' | 'seasonal' | 'special'
  previewImage?: string
  colors: {
    primary: string
    background: string
    accent: string
  }
}

/**
 * Swatch colors MUST mirror the canonical token values in `app/theme.css`
 * (the single source of truth for what actually gets applied). They are
 * written as `hsl(H S% L%)` strings copied verbatim from the matching
 * `[data-theme=...]` block so the preview a user clicks is exactly the
 * theme they get. If you change a palette in theme.css, change it here too.
 */
export const THEME_CONFIGS: ThemeConfig[] = [
  // FREE TIER - Available to everyone
  {
    id: 'nord',
    name: 'nord',
    displayName: 'Nord',
    description: 'Arctic, north-bluish color palette',
    tier: 'free',
    category: 'basic',
    colors: {
      primary: 'hsl(193 43% 67%)',
      background: 'hsl(220 16% 22%)',
      accent: 'hsl(210 34% 63%)'
    }
  },
  {
    id: 'daybreak',
    name: 'daybreak',
    displayName: 'Daybreak',
    description: 'Warm dawn light theme — cream paper, sky blue, sunrise amber',
    tier: 'free',
    category: 'basic',
    colors: {
      primary: 'hsl(205 85% 40%)',
      background: 'hsl(40 33% 96%)',
      accent: 'hsl(28 92% 52%)'
    }
  },

  // PREMIUM TIER - Requires registration
  {
    id: 'synthwave84',
    name: 'synthwave84',
    displayName: 'Synthwave \'84 🌆',
    description: 'Neon-soaked 1980s Miami aesthetic - perfect for sunset/sunrise times',
    tier: 'premium',
    category: 'retro',
    colors: {
      primary: 'hsl(319 100% 75%)',
      background: 'hsl(268 40% 15%)',
      accent: 'hsl(180 100% 50%)'
    }
  },
  {
    id: 'dracula',
    name: 'dracula',
    displayName: 'Dracula 🦇',
    description: 'Gothic vampire castle meets modern development - extremely popular in dev community',
    tier: 'premium',
    category: 'special',
    colors: {
      primary: 'hsl(326 100% 74%)',
      background: 'hsl(231 15% 18%)',
      accent: 'hsl(265 89% 78%)'
    }
  },
  {
    id: 'cyberpunk',
    name: 'cyberpunk',
    displayName: 'Cyberpunk 2077 🤖',
    description: 'Futuristic dystopian cityscape with glitch effects - edgy and trendy',
    tier: 'premium',
    category: 'special',
    colors: {
      primary: 'hsl(56 100% 52%)',
      background: 'hsl(0 0% 5%)',
      accent: 'hsl(180 100% 50%)'
    }
  },
  {
    id: 'matrix',
    name: 'matrix',
    displayName: 'Terminal Green (Matrix) 💻',
    description: 'Classic phosphor terminal with Matrix rain effects - for hackers and minimalists',
    tier: 'premium',
    category: 'retro',
    colors: {
      primary: 'hsl(120 100% 50%)',
      background: 'hsl(120 100% 3%)',
      accent: 'hsl(120 60% 35%)'
    }
  }
]

// Helper functions
export const isPremiumTheme = (themeId: string): boolean => {
  const theme = THEME_CONFIGS.find(t => t.id === themeId)
  return theme?.tier === 'premium' || false
}

export const getFreeThemes = (): ThemeConfig[] => {
  return THEME_CONFIGS.filter(theme => theme.tier === 'free')
}

export const getPremiumThemes = (): ThemeConfig[] => {
  return THEME_CONFIGS.filter(theme => theme.tier === 'premium')
}

export const getThemeConfig = (themeId: string): ThemeConfig | undefined => {
  return THEME_CONFIGS.find(theme => theme.id === themeId)
}

const getThemesByCategory = (category: string): ThemeConfig[] => {
  return THEME_CONFIGS.filter(theme => theme.category === category)
}

// Preview settings
export const THEME_PREVIEW_DURATION = 30000 // 30 seconds
export const THEME_PREVIEW_WARNING_TIME = 25000 // Warning at 25 seconds