export interface ThemeStyles {
  background: string
  text: string
  mutedText?: string
  borderColor: string
  border: string
  accentBg: string
  accentText: string
  cardBg: string
  hoverBg: string
  glow: string
  gradient?: string
  secondary: string
  headerText?: string
  secondaryText?: string
  warningText?: string
  successText?: string
  shadowColor?: string
}

/**
 * Static Tailwind token classes. Theme color comes from CSS variables on
 * `[data-theme]`. Daybreak already no-ops `.glow` in globals.css, so these
 * maps do not take a theme argument.
 */
const BASE: ThemeStyles = {
  background: 'bg-background',
  text: 'text-foreground',
  mutedText: 'text-muted-foreground',
  borderColor: 'border-transparent',
  border: 'border-0',
  accentBg: 'bg-primary',
  accentText: 'text-primary-foreground',
  cardBg: 'bg-card',
  hoverBg: 'hover:bg-primary/20',
  glow: 'glow',
  secondary: 'text-secondary-foreground',
  headerText: 'text-primary font-mono font-bold',
  secondaryText: 'text-muted-foreground',
  warningText: 'text-yellow-500',
  successText: 'text-green-500',
  shadowColor: 'var(--primary)',
}

export const themeTokens = {
  weather: BASE,
  dashboard: BASE,
  modal: BASE,
  auth: BASE,
  card: {
    ...BASE,
    background: 'bg-card',
    borderColor: 'border-transparent',
    border: 'border-0',
    cardBg: 'bg-muted',
  },
  button: {
    ...BASE,
    background: 'bg-secondary',
    hoverBg: 'hover:bg-primary hover:text-primary-foreground hover:scale-105',
    borderColor: 'border-transparent',
    border: 'border-0',
  },
  input: {
    ...BASE,
    background: 'bg-input',
    borderColor: 'border-transparent focus:border-transparent',
    border: 'border-0 focus:border-0',
    text: 'text-foreground placeholder:text-muted-foreground',
  },
  navigation: {
    ...BASE,
    background: 'bg-background',
    borderColor: 'border-transparent',
    border: 'border-0',
    hoverBg: 'hover:bg-primary/20',
  },
} as const satisfies Record<string, ThemeStyles>
