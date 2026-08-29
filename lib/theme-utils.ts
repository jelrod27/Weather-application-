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
