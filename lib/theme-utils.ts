/**
 * 16-Bit Weather Platform
 * Centralized Theme Utility System
 */

import type { ThemeType } from './theme-config';

export type { ThemeType };

export interface ThemeStyles {
  background: string;
  text: string;
  mutedText?: string;
  borderColor: string;
  border: string;
  accentBg: string;
  accentText: string;
  cardBg: string;
  hoverBg: string;
  glow: string;
  gradient?: string;
  secondary: string;
  headerText?: string;
  secondaryText?: string;
  warningText?: string;
  successText?: string;
  shadowColor?: string;
}

export interface ComponentVariants {
  card: ThemeStyles;
  button: ThemeStyles;
  input: ThemeStyles;
  navigation: ThemeStyles;
  weather: ThemeStyles;
  dashboard: ThemeStyles;
  modal: ThemeStyles;
  auth: ThemeStyles;
}

/**
 * Common standard tailwind UI classes based on Shadcn CSS mapping
 */
export const getThemeStyles = (theme?: ThemeType): ThemeStyles => {
  return {
    background: 'bg-background',
    text: 'text-foreground',
    mutedText: 'text-muted-foreground',
    borderColor: 'border-transparent',
    border: 'border-0',
    accentBg: 'bg-primary',
    accentText: 'text-primary-foreground',
    cardBg: 'bg-card',
    hoverBg: 'hover:bg-primary/20',
    glow: theme === 'daybreak' ? '' : 'glow',
    secondary: 'text-secondary-foreground',
    headerText: 'text-primary font-mono font-bold',
    secondaryText: 'text-muted-foreground',
    warningText: 'text-yellow-500',
    successText: 'text-green-500',
    shadowColor: 'var(--primary)'
  };
};

export const getComponentStyles = (theme: ThemeType, variant: keyof ComponentVariants): ThemeStyles => {
  const base = getThemeStyles(theme);

  switch (variant) {
    case 'card':
      return {
        ...base,
        background: 'bg-card',
        borderColor: 'border-transparent',
        border: 'border-0',
        cardBg: 'bg-muted'
      };

    case 'button':
      return {
        ...base,
        background: 'bg-secondary',
        hoverBg: 'hover:bg-primary hover:text-primary-foreground hover:scale-105',
        borderColor: 'border-transparent',
        border: 'border-0'
      };

    case 'input':
      return {
        ...base,
        background: 'bg-input',
        borderColor: 'border-transparent focus:border-transparent',
        border: 'border-0 focus:border-0',
        text: 'text-foreground placeholder:text-muted-foreground'
      };

    case 'navigation':
      return {
        ...base,
        background: 'bg-background',
        borderColor: 'border-transparent',
        border: 'border-0',
        hoverBg: 'hover:bg-primary/20'
      };

    default:
      return base;
  }
};

/**
 * Get theme-specific gradient definitions (for things that still explicitly need it like OPengraph)
 */
const getThemeGradients = (theme?: ThemeType): { primary: string; accent: string; card: string } => {
  return {
    primary: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)',
    accent: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
    card: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)'
  };
};

const BREAKPOINTS = {
  mobile: '(max-width: 640px)',
  tablet: '(min-width: 641px) and (max-width: 1024px)',
  desktop: '(min-width: 1025px)',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:'
} as const;

const getResponsiveFontSize = (mobile: string, desktop: string, viewport = '2.5vw') => {
  return `clamp(${mobile}, ${viewport}, ${desktop})`;
};

const COMPONENT_SIZES = {
  touchTarget: 'min-h-[44px]',
  button: {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg'
  },
  icon: {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
} as const;

const ANIMATIONS = {
  transition: 'transition-all duration-200',
  hover: 'hover:scale-105',
  glow: 'animate-pulse',
  flicker: 'animate-flicker'
} as const;

const PIXEL_EFFECTS = {
  border: 'pixel-border',
  glow: (theme: ThemeType) => 'pixel-glow glow',
  shadow: 'pixel-shadow',
  font: 'pixel-font font-mono'
} as const;

const getGlowClass = (theme: ThemeType): string => 'glow';

const getRetroEffects = (theme: ThemeType) => ({
  glow: 'glow',
  pixelBorder: 'pixel-border',
  pixelShadow: 'pixel-shadow',
  scanlines: theme === 'matrix' || theme === 'synthwave84',
});
