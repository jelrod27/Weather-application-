/**
 * Stargazer - Ground condition helpers
 *
 * Pure functions for ground weather readouts. Kept separate from the API route
 * so they can be unit tested without a fetch.
 */

export type DewRisk = 'low' | 'moderate' | 'high';

/** Temperature minus dewpoint (both Celsius). Larger spread means lower dew risk. */
export function dewpointSpread(tempC: number, dewpointC: number): number {
  return tempC - dewpointC;
}

/** Classify dew risk from the temperature/dewpoint spread (both Celsius). */
export function getDewRisk(tempC: number, dewpointC: number): DewRisk {
  const delta = dewpointSpread(tempC, dewpointC);
  if (delta < 2) return 'high';
  if (delta < 5) return 'moderate';
  return 'low';
}
