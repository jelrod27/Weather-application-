/**
 * Precipitation severity helper for 7-day forecast tiles.
 *
 * Uses a symmetric top strip + faint wash (same pattern as AQI panels on
 * daybreak) so wet days stand out without a lopsided left border.
 */

export type PrecipTier = 'none' | 'light' | 'moderate' | 'heavy'

export interface PrecipSeverity {
  tier: PrecipTier
  /** Subtle card background wash */
  cardClass: string
  /** Top edge strip inside the card */
  stripClass: string
  /** Precip % pill */
  chipClass: string
}

export function getPrecipSeverity(prob: number | null | undefined): PrecipSeverity {
  const p = typeof prob === 'number' ? prob : 0

  if (p < 20) {
    return {
      tier: 'none',
      cardClass: '',
      stripClass: '',
      chipClass: 'bg-muted/40 text-muted-foreground',
    }
  }
  if (p < 40) {
    return {
      tier: 'light',
      cardClass: 'bg-sky-500/[0.04] dark:bg-sky-400/[0.06]',
      stripClass: 'h-px bg-gradient-to-r from-transparent via-sky-400/45 to-transparent',
      chipClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    }
  }
  if (p < 70) {
    return {
      tier: 'moderate',
      cardClass: 'bg-sky-500/[0.07] dark:bg-sky-400/[0.09]',
      stripClass: 'h-0.5 bg-gradient-to-r from-sky-500/30 via-sky-400/65 to-sky-500/30',
      chipClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-200 font-medium',
    }
  }
  return {
    tier: 'heavy',
    cardClass: 'bg-sky-600/[0.10] dark:bg-sky-400/[0.12]',
    stripClass: 'h-1 bg-gradient-to-r from-sky-600/50 via-sky-400/85 to-sky-600/50',
    chipClass: 'bg-sky-500/20 text-sky-900 dark:text-sky-100 font-semibold',
  }
}
