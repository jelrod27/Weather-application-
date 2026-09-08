/**
 * The Kp index and what it means: NOAA's G-scale mapping and the aurora
 * viewline.
 *
 * Both tables live here because the site previously carried two of them — the
 * hub's aurora map had its own Kp-to-latitude ladder while the intent pages
 * grew a second one — and they disagreed. At Kp 7 one said northern California
 * and Virginia, the other said you needed a G5 for Virginia. Two cross-linked
 * pages answering the same question differently is worse than either answer.
 */

export interface KpLevel {
  /** Lowest Kp that reaches this level. */
  minKp: number
  /** NOAA G-scale label, or "Quiet"/"Active" below storm level. */
  storm: string
  /** What this level means in plain terms. */
  meaning: string
}

/** Ordered high to low so a lookup returns the first level a reading reaches. */
export const KP_LEVELS: readonly KpLevel[] = [
  {
    minKp: 9,
    storm: 'G5 Extreme',
    meaning:
      'Power grids can experience voltage collapse, satellites lose orientation control, and HF radio is out for days in places.',
  },
  {
    minKp: 8,
    storm: 'G4 Severe',
    meaning:
      'Grid operators see widespread voltage control problems, spacecraft charging rises, and HF radio is intermittent for hours.',
  },
  {
    minKp: 7,
    storm: 'G3 Strong',
    meaning:
      'Surface charging on satellites, drag increases on low orbits, and HF radio is unreliable at high latitudes.',
  },
  {
    minKp: 6,
    storm: 'G2 Moderate',
    meaning:
      'High-latitude power systems can see alarms, and HF radio fades at higher latitudes.',
  },
  {
    minKp: 5,
    storm: 'G1 Minor',
    meaning:
      'Minor grid fluctuations, small effects on satellite operations, and aurora visible from the far north of the US.',
  },
  {
    minKp: 4,
    storm: 'Active',
    meaning:
      'Active but below storm level. Aurora stays near the polar regions, though a substorm can briefly push it further south.',
  },
  {
    minKp: 3,
    storm: 'Unsettled',
    meaning:
      'The field is stirring without reaching storm level. Worth watching if you are already far north.',
  },
  {
    minKp: 0,
    storm: 'Quiet',
    meaning:
      'No geomagnetic storm. Aurora is confined to the auroral oval over the high Arctic.',
  },
] as const

/** The level a reading falls in. Clamps rather than throwing on odd input. */
export function kpLevel(kp: number): KpLevel {
  const value = Number.isFinite(kp) ? kp : 0
  return KP_LEVELS.find((level) => value >= level.minKp) ?? KP_LEVELS[KP_LEVELS.length - 1]!
}

export interface Viewline {
  /**
   * Approximate northernmost latitude the aurora may become visible *from*, on
   * a clear dark night. This is the horizon viewline, not the auroral oval
   * itself, which sits several degrees further north. NOAA publishes these as
   * guidance, not a promise.
   */
  latitude: number
  /**
   * Places roughly on that viewline, phrased to complete "visible from about
   * ___". Kept consistent with `latitude`: a list of places thirteen degrees
   * south of the stated number is how the two tables drifted apart before.
   */
  places: string
  /** The fuller both-hemispheres line the hub's aurora map renders. */
  description: string
}

/**
 * Viewline by whole Kp step. Finer than the G-scale bands above, because the
 * interesting movement for a reader is between Kp 3 and Kp 6, which is a
 * single "Quiet"/"Active" band on the storm scale.
 */
const VIEWLINES: readonly { minKp: number; viewline: Viewline }[] = [
  {
    minKp: 9,
    viewline: {
      latitude: 40,
      places: 'northern California, Kansas and Virginia',
      description: 'Northern California, Kansas, Virginia — visible across much of the US, extremely rare',
    },
  },
  {
    minKp: 8,
    viewline: {
      latitude: 42,
      places: 'Oregon, Iowa and Pennsylvania',
      description: 'Oregon, Iowa, Pennsylvania, southern England — a rare event',
    },
  },
  {
    minKp: 7,
    viewline: {
      latitude: 45,
      places: 'Minnesota, Wisconsin and Maine',
      description: 'Minnesota, Wisconsin, Maine, central UK',
    },
  },
  {
    minKp: 6,
    viewline: {
      latitude: 48,
      places: 'the northern edge of Washington, Montana and North Dakota',
      description: 'Northern Washington, Montana, North Dakota, northern UK',
    },
  },
  {
    minKp: 5,
    viewline: {
      latitude: 50,
      places: 'the Canadian border and southern Ontario',
      description: 'The US–Canada border, southern Ontario, northern UK',
    },
  },
  {
    minKp: 4,
    viewline: {
      latitude: 55,
      places: 'central Canada and Scotland',
      description: 'Central Canada, Scotland, southern Scandinavia',
    },
  },
  {
    minKp: 3,
    viewline: {
      latitude: 58,
      places: 'southern Alaska and northern Scotland',
      description: 'Southern Alaska, central Canada, northern Scotland, central Scandinavia',
    },
  },
  {
    minKp: 2,
    viewline: {
      latitude: 64,
      places: 'Fairbanks and Reykjavík',
      description: 'Fairbanks, Reykjavík, northern Canada, northern Scandinavia',
    },
  },
  {
    minKp: 0,
    viewline: {
      latitude: 66,
      places: 'the Arctic Circle — northern Alaska, northern Canada and Tromsø',
      description: 'Far northern latitudes only (northern Alaska, northern Canada, Tromsø)',
    },
  },
] as const

/** The viewline a reading puts you on. Clamps rather than throwing. */
export function viewlineFor(kp: number): Viewline {
  const value = Number.isFinite(kp) ? kp : 0
  return (
    VIEWLINES.find((entry) => value >= entry.minKp)?.viewline ??
    VIEWLINES[VIEWLINES.length - 1]!.viewline
  )
}
