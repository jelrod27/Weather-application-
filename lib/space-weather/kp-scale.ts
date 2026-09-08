/**
 * The Kp index and what it means: NOAA's G-scale mapping and the aurora
 * viewline. Shared by the Kp and aurora intent pages so the two can never
 * describe the same reading differently.
 */

export interface KpLevel {
  /** Lowest Kp that reaches this level. */
  minKp: number
  /** NOAA G-scale label, or "Quiet"/"Unsettled" below storm level. */
  storm: string
  /** What this level means in plain terms. */
  meaning: string
  /**
   * Approximate northernmost US latitude the aurora may become visible from,
   * on a clear dark night. NOAA publishes these as guidance, not a promise.
   */
  viewlineLatitude: number
  /** Places roughly on that viewline, for readers who do not think in degrees. */
  viewlineExample: string
}

/** Ordered high to low so a lookup returns the first level a reading reaches. */
export const KP_LEVELS: readonly KpLevel[] = [
  {
    minKp: 9,
    storm: 'G5 Extreme',
    meaning:
      'Power grids can experience voltage collapse, satellites lose orientation control, and HF radio is out for days in places.',
    viewlineLatitude: 40,
    viewlineExample: 'northern California, Kansas, Virginia',
  },
  {
    minKp: 8,
    storm: 'G4 Severe',
    meaning:
      'Grid operators see widespread voltage control problems, spacecraft charging rises, and HF radio is intermittent for hours.',
    viewlineLatitude: 45,
    viewlineExample: 'Oregon, Nebraska, Pennsylvania',
  },
  {
    minKp: 7,
    storm: 'G3 Strong',
    meaning:
      'Surface charging on satellites, drag increases on low orbits, and HF radio is unreliable at high latitudes.',
    viewlineLatitude: 50,
    viewlineExample: 'Washington, Iowa, New York',
  },
  {
    minKp: 6,
    storm: 'G2 Moderate',
    meaning:
      'High-latitude power systems can see alarms, and HF radio fades at higher latitudes.',
    viewlineLatitude: 55,
    viewlineExample: 'the northern tier states on a clear night',
  },
  {
    minKp: 5,
    storm: 'G1 Minor',
    meaning:
      'Minor grid fluctuations, small effects on satellite operations, and aurora visible from the far north of the US.',
    viewlineLatitude: 60,
    viewlineExample: 'northern Michigan, Maine, and most of Canada',
  },
  {
    minKp: 4,
    storm: 'Unsettled',
    meaning:
      'Active but below storm level. Aurora stays near the polar regions, though a substorm can briefly push it further.',
    viewlineLatitude: 65,
    viewlineExample: 'central Alaska and northern Scandinavia',
  },
  {
    minKp: 0,
    storm: 'Quiet',
    meaning:
      'No geomagnetic storm. Aurora is confined to the auroral oval over the high Arctic.',
    viewlineLatitude: 67,
    viewlineExample: 'Fairbanks, Tromsø, Yellowknife',
  },
] as const

/** The level a reading falls in. Clamps rather than throwing on odd input. */
export function kpLevel(kp: number): KpLevel {
  const value = Number.isFinite(kp) ? kp : 0
  return KP_LEVELS.find((level) => value >= level.minKp) ?? KP_LEVELS[KP_LEVELS.length - 1]
}
