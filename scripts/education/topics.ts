/**
 * Per-Entry drafting brief: which sources a Guide draws on, and the one line of
 * editorial direction that separates this Guide from its neighbours.
 *
 * Keyed `<kind>:<slug>` over the 29 published Guides. The subject tags live in
 * `lib/education/topics.ts`, shared with the Guide pages' Related Guides block;
 * this file adds what only the generator needs — the focus line and any pinned
 * sources — and `GUIDE_BRIEFS` joins the two. `__tests__/education/` asserts
 * both maps cover exactly the eligible set, so adding a Guide URL without a
 * brief — or leaving a brief behind after one is removed — fails CI.
 *
 * `focus` is direction, not content. It exists because eight of these Entries
 * are fronts or pressure systems that a general model will describe in nearly
 * the same words; naming the distinct thing each one owns is what keeps the
 * similarity judge quiet and the pages worth ranking separately.
 *
 * A focus line may only ask for what the catalog can cite. The sources are
 * federal reference pages about mechanism, so "how deepening is measured in
 * millibars per hour" or "first photographed in 1989" commissions precisely the
 * claim the fact check then refuses — that is how the Depressions run of
 * 2026-09-01 failed. A test rejects any focus line carrying a year.
 */

import { GUIDE_TOPICS } from '@/lib/education/topics';

import type { SourceTag } from './sources';

export interface GuideDirection {
  focus: string;
  /**
   * Catalog ids offered ahead of the ranked candidates. For the page a focus
   * line cannot do without — the Saffir-Simpson scale, the inversion entry —
   * not for everything relevant; tag ranking carries the rest.
   */
  pin?: string[];
}

export interface GuideBrief extends GuideDirection {
  /** Most important first; `sourcesForTags` weights matches by this order. */
  tags: SourceTag[];
}

export const GUIDE_DIRECTION: Record<string, GuideDirection> = {
  // --- Clouds -------------------------------------------------------------
  'cloud:cirrus': {
    focus:
      'Ice, not water, and what that changes. Cirrus as the visible edge of an approaching system — the long warning it gives, and the halo that says the ice crystals are hexagonal.',
  },
  'cloud:cumulus': {
    focus:
      'The fair-weather cloud as a picture of the boundary layer: flat bases mark the condensation level, and the same cloud grows into congestus and then a storm when the atmosphere stops capping it.',
  },
  'cloud:cumulonimbus': {
    focus: 'The storm tower end to end — updraft, anvil, downdraft, gust front, and shear.',
  },
  'cloud:stratus': {
    focus:
      'Cloud that forms by cooling a whole layer rather than lifting a parcel. Fog that is not touching the ground, the marine layer, and why stratus drizzles instead of raining.',
  },
  'cloud:nimbostratus': {
    focus:
      'The all-day rain cloud. Warm-front overrunning as the mechanism, the featureless grey base, and why steady precipitation looks nothing like a convective shower on radar.',
  },
  'cloud:altocumulus': {
    focus:
      'Mid-level instability made visible. The forecaster\'s reading of a morning altocumulus field, and how to tell it from cirrocumulus above and stratocumulus below.',
  },
  'cloud:lenticular': {
    focus:
      'A cloud that stands still while the air moves through it. Mountain waves, the standing-wave crest, and why pilots read a lenticular as a turbulence sign.',
  },

  // --- Weather systems ----------------------------------------------------
  'weather-system:cyclones': {
    focus:
      'Low pressure as a circulation, not a number. Convergence at the surface, rising motion, and why the rotation direction follows the hemisphere.',
  },
  'weather-system:anticyclones': {
    focus:
      'Subsidence and what it suppresses. Why high pressure means clear skies in summer and trapped haze or fog in winter — the same mechanism, opposite comfort.',
    // Origin of Wind is the only page that explains subsidence and fair weather
    // together; the inversion entry is what the winter-fog half rests on. Neither
    // carries the brief's tags strongly enough to rank on its own.
    pin: ['jetstream-synoptic-origin-of-wind', 'glossary-inversion'],
  },
  'weather-system:depressions': {
    focus:
      'Why forecasters say depression where the textbooks say low, and what deepening means for the weather underneath it.',
    pin: ['glossary-depression'],
  },
  'weather-system:blocking-highs': {
    focus:
      'A pattern that stops moving. Omega and Rex blocks in the 500 mb flow, and why a block is a heat-wave and flood story at the same time in two different places.',
    pin: ['jetstream-upper-air-charts-basic-wave-patterns'],
  },
  'weather-system:warm-fronts': {
    focus:
      'The gentle slope, and the cloud sequence it writes across the sky hours ahead of the rain — cirrus, cirrostratus, altostratus, nimbostratus.',
    // The cloud sequence is the focus, and `clouds` is the brief's last tag.
    pin: ['jetstream-clouds-ten-basic-clouds'],
  },
  'weather-system:cold-fronts': {
    focus:
      'The steep slope and the abrupt handover: wind shift, pressure trough, temperature drop, and the narrow band of convection along the boundary.',
  },
  'weather-system:occluded-fronts': {
    focus:
      'What happens when the cold front catches the warm one. Cold and warm occlusions, and why an occlusion marks a cyclone near the end of its life.',
  },
  'weather-system:stationary-fronts': {
    focus:
      'A boundary that stalls, and the multi-day rainfall that trains along it. The alternating red and blue notation, and what makes a stalled front start moving again.',
  },
  'weather-system:atmospheric-rivers': {
    focus:
      'A narrow corridor of water vapour transport measured in Mississippi-Rivers-worth. Landfall, orographic enhancement, and why the same feature is both a water supply and a flood risk.',
    // The only catalog page about atmospheric rivers as such; the tags alone
    // would fill the list with generic precipitation and flood pages. The
    // focus names orographic enhancement, and no brief tag reaches that entry.
    pin: ['noaa-atmospheric-rivers', 'glossary-orographic'],
  },
  'weather-system:jet-streams': {
    focus:
      'A thermal wind produced by a temperature contrast. Polar and subtropical jets, jet streaks and their divergent quadrants, and the steering of surface systems.',
  },
  'weather-system:monsoons': {
    focus:
      'A seasonal wind reversal, not a rainstorm. Differential heating between land and ocean, and the North American monsoon as the version that reaches the US Southwest.',
  },
  'weather-system:polar-vortex': {
    focus:
      'A circulation that is always there. What "the polar vortex" in a headline actually describes, the stratospheric vortex as distinct from the tropospheric one, and how a sudden stratospheric warming can displace or split it and let Arctic air spill south.',
    // The safety explainer defines the term; the Bismarck page is the only
    // catalog source that describes sudden stratospheric warming.
    pin: ['safety-cold-polar-vortex', 'nws-bis-sudden-stratospheric-warming'],
  },
  'weather-system:mid-latitude-cyclones': {
    focus:
      'The Norwegian cyclone model as a life cycle: wave, open stage, occlusion, decay — and where you stand relative to the warm sector.',
  },
  'weather-system:tropical-cyclones': {
    focus:
      'A warm-core engine over warm ocean water. Eye and eyewall structure, the Saffir-Simpson scale and the hazards it deliberately leaves out, and storm surge as the deadlier one.',
    // The focus names the scale and the eye/eyewall structure by name. The
    // sea-surface threshold is left to the sources: JetStream gives it in
    // Fahrenheit, and a Celsius figure in the brief commissioned a conversion
    // the fact check could not verify. The NHC surge page carries three of the
    // brief's tags and ranks first on its own.
    pin: [
      'nhc-sshws',
      'jetstream-tropical-tropical-cyclone-introduction',
      'jetstream-tropical-tropical-cyclone-introduction-tropical-cyclone-structure',
    ],
  },
  'weather-system:squall-lines': {
    focus:
      'Convection organised into a line. The cold pool that keeps it going, the bow echo, and why the wind threat outruns the tornado threat in this mode.',
  },
  'weather-system:mesoscale-convective-complexes': {
    focus:
      'The overnight storm system that covers a state. Size and duration criteria from satellite, the nocturnal low-level jet that feeds it, and flash flooding as the signature hazard.',
  },

  // --- Phenomena ----------------------------------------------------------
  'phenomenon:ball-lightning': {
    focus:
      'A phenomenon with reports and no settled explanation. Treat the uncertainty as the subject: what witnesses most often describe — size, colour, how long it lasts, how close to the ground it moves — and how thin that record is next to the lightning types that are understood.',
    // The one catalog page that mentions ball lightning at all. Without it the
    // draft has nothing to quote and the fact check refuses every description.
    pin: ['nws-wrn-lightning-types'],
  },
  'phenomenon:thundersnow': {
    focus:
      'Convection inside a snowstorm. The elevated instability and steep mid-level lapse rates that let a snow band produce lightning, why that is rare, and why thundersnow marks the heaviest snowfall rates.',
    // The catalog has no page on thundersnow as a topic; these NWS write-ups
    // carry the mechanism (slantwise and elevated convection) and the snowfall
    // rates the focus asks for. Tag ranking cannot pick them out of `winter`.
    pin: [
      'nws-epz-conditional-symmetric-instability',
      'nws-okx-blizzard-meteorology',
      'nws-lot-thundersnow',
    ],
  },
  'phenomenon:microbursts': {
    focus:
      'A small, violent downdraft. Wet versus dry microbursts, the diverging straight-line outflow that separates its damage from a tornado\'s, and the safety guidance that follows from how little warning it gives.',
    // Wet versus dry is the focus and each has its own glossary entry.
    pin: ['glossary-dry-microburst', 'glossary-wet-microburst'],
  },
  'phenomenon:sun-dogs': {
    focus:
      'Refraction through hexagonal plate crystals. The 22-degree geometry, why sun dogs sit level with the sun, and what their presence says about the cloud overhead.',
    pin: ['glossary-parhelion'],
  },
  'phenomenon:haboob': {
    focus:
      'A thunderstorm outflow made visible by the surface it crosses. The gust front as the driver, the wall of dust, and the driving guidance that follows from near-zero visibility.',
  },
  'phenomenon:sprites': {
    focus:
      'Electrical discharge above the storm rather than below it. The altitudes sprites and elves reach, their link to positive cloud-to-ground strokes, and why a faint red flash lasting a fraction of a second is so rarely seen without a sensitive camera.',
    // The positive-lightning page is the only JetStream page that mentions
    // sprites; the WRN page is the only other NWS text that names them.
    pin: ['jetstream-lightning-positive-and-negative-side-of-lightning', 'nws-wrn-lightning-types'],
  },
};

/**
 * Direction joined to tags. A key present in one map and not the other is a
 * programming error, not a missing Guide, so it throws at import rather than
 * yielding a brief with no tags to rank on.
 */
export const GUIDE_BRIEFS: Record<string, GuideBrief> = Object.fromEntries(
  Object.entries(GUIDE_DIRECTION).map(([key, direction]) => {
    const tags = GUIDE_TOPICS[key];
    if (!tags) throw new Error(`Brief "${key}" has no tags in lib/education/topics.ts.`);
    return [key, { ...direction, tags: [...tags] }];
  }),
);

export function getGuideBrief(kind: string, slug: string): GuideBrief | null {
  return GUIDE_BRIEFS[`${kind}:${slug}`] ?? null;
}
