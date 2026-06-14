export const TOPIC_SLUGS = [
  'volcanoes',
  'ocean_currents',
  'cryosphere',
  'severe_storms',
  'earthquakes',
  'tropical',
  'atmosphere_layers',
  'space_weather',
  'historical_events',
  'biometeorology',
  'urban_climate',
  'aviation',
  'marine',
  'agricultural',
  'paleoclimate',
  'tech_and_models',
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export interface Topic {
  slug: TopicSlug;
  title: string;
  description: string;
  keywords: string[];
}

export const TOPICS: Record<TopicSlug, Topic> = {
  volcanoes: {
    slug: 'volcanoes',
    title: 'Volcanoes & Atmospheric Impact',
    description:
      'Volcanic eruptions inject sulfur dioxide and ash into the stratosphere, where they form sulfate aerosol layers that reflect sunlight and cool global temperatures for months to years. Major events like Pinatubo (1991) dropped global temperatures by roughly 0.5°C. Volcanic Ash Advisory Centers (VAACs) coordinate the aviation response in real time, and modern satellites track plume height, SO2 burden, and ash dispersion to inform both climate models and flight rerouting.',
    keywords: [
      'eruption',
      'sulfate aerosol',
      'stratosphere',
      'VAAC',
      'ash plume',
      'Pinatubo',
      'Krakatoa',
      'volcanic SO2',
      'climate cooling',
    ],
  },
  ocean_currents: {
    slug: 'ocean_currents',
    title: 'Ocean Currents & Heat Transport',
    description:
      'Ocean currents are the planet\'s primary heat-redistribution system, moving warmth from the tropics toward the poles and shaping continental climates. The Gulf Stream and the broader Atlantic Meridional Overturning Circulation (AMOC) keep northwestern Europe far warmer than its latitude suggests, while ENSO cycles in the Pacific drive global precipitation patterns, fisheries collapses, and severe weather seasons. Marine heatwaves, AMOC slowdown signals, and shifts in ENSO phase are among the most consequential indicators in modern climate science.',
    keywords: [
      'Gulf Stream',
      'AMOC',
      'ENSO',
      'El Niño',
      'La Niña',
      'marine heatwave',
      'thermohaline circulation',
      'sea surface temperature',
    ],
  },
  cryosphere: {
    slug: 'cryosphere',
    title: 'The Cryosphere',
    description:
      'The cryosphere — sea ice, glaciers, ice sheets, snow cover, and permafrost — is both a passive recorder of climate and an active driver of it. Loss of high-albedo ice exposes darker ocean and tundra, accelerating warming through the ice-albedo feedback. Permafrost thaw releases methane and CO2 that were locked up for tens of thousands of years, creating a self-reinforcing carbon cycle response that current models still struggle to bound.',
    keywords: [
      'sea ice',
      'glacier',
      'permafrost',
      'albedo feedback',
      'ice sheet',
      'snow cover',
      'Arctic amplification',
      'methane',
    ],
  },
  severe_storms: {
    slug: 'severe_storms',
    title: 'Severe Convective Storms',
    description:
      'Severe convective storms — supercells, derechos, hailstorms, and tornadoes — emerge when the atmosphere loads with instability (CAPE) and shear in specific configurations. The Storm Prediction Center categorizes severe risk days from Marginal to High, and the United States sees more tornadoes than the rest of the world combined due to the unique geometry of the Rockies, the Gulf of Mexico, and the polar jet. Hail formation, mesocyclone rotation, and the dryline are mechanisms every weather literate reader should be able to picture.',
    keywords: [
      'tornado',
      'supercell',
      'derecho',
      'hail',
      'CAPE',
      'wind shear',
      'mesocyclone',
      'SPC',
      'dryline',
      'EF scale',
    ],
  },
  earthquakes: {
    slug: 'earthquakes',
    title: 'Earthquakes & Seismic Hazards',
    description:
      'Earthquakes release stress along faults and plate boundaries, producing seismic waves that reveal both the rupture and the structure of the Earth beneath it. Magnitude, depth, focal mechanism, and tectonic setting determine whether an event is a local jolt, a damaging regional earthquake, or a tsunami-capable subduction-zone rupture. Weekly seismic recaps should distinguish felt domestic events from globally significant quakes, and should explain aftershock and tsunami context without implying weather causality.',
    keywords: [
      'earthquake',
      'seismic waves',
      'fault',
      'subduction zone',
      'aftershock',
      'tsunami',
      'magnitude',
      'USGS',
    ],
  },
  tropical: {
    slug: 'tropical',
    title: 'Tropical Systems',
    description:
      'Tropical cyclones — hurricanes in the Atlantic, typhoons in the western Pacific, cyclones in the Indian Ocean — are heat engines that convert ocean warmth into wind and rain. Their formation, intensification, and tracks are governed by sea surface temperatures, vertical wind shear, mid-level humidity, and large-scale modulators like the Madden-Julian Oscillation. Monsoons, while structurally different, share the same basic physics of differential heating between land and sea.',
    keywords: [
      'hurricane',
      'typhoon',
      'cyclone',
      'monsoon',
      'MJO',
      'rapid intensification',
      'eyewall',
      'storm surge',
      'NHC',
    ],
  },
  atmosphere_layers: {
    slug: 'atmosphere_layers',
    title: 'Atmospheric Structure',
    description:
      'The atmosphere is layered — troposphere, stratosphere, mesosphere, thermosphere — and each layer hosts distinct weather and chemistry. Jet streams in the upper troposphere steer storm tracks; the stratosphere hosts the ozone layer and the polar vortex; sudden stratospheric warmings (SSWs) can rearrange tropospheric weather weeks later. Understanding which layer matters for which phenomenon is one of the highest-leverage frames in meteorology.',
    keywords: [
      'stratosphere',
      'mesosphere',
      'jet stream',
      'polar vortex',
      'SSW',
      'tropopause',
      'ozone',
      'gravity wave',
    ],
  },
  space_weather: {
    slug: 'space_weather',
    title: 'Space Weather',
    description:
      'Space weather refers to conditions in the near-Earth space environment driven by the Sun — solar flares, coronal mass ejections, the solar wind, and the geomagnetic storms they trigger when they hit our magnetosphere. These events disrupt GPS, HF radio, satellite operations, and power grids, and produce auroras visible from latitudes well outside their normal range. The Kp and G-scales quantify storm severity, and the NOAA Space Weather Prediction Center is the operational authority.',
    keywords: [
      'solar flare',
      'CME',
      'aurora',
      'Kp index',
      'geomagnetic storm',
      'solar wind',
      'sunspot',
      'X-class',
      'SWPC',
    ],
  },
  historical_events: {
    slug: 'historical_events',
    title: 'Historical Weather Events',
    description:
      'History is punctuated by weather events that reshaped politics, economies, and the shape of cities. The Year Without a Summer (1816) followed Tambora\'s eruption and triggered famines across the Northern Hemisphere. The Galveston hurricane of 1900 remains the deadliest natural disaster in US history. The Dust Bowl of the 1930s was a coupled climate-and-land-use catastrophe that drove millions into migration. Each event carries forward-looking lessons about modern vulnerability.',
    keywords: [
      'Year Without a Summer',
      'Tambora',
      'Galveston 1900',
      'Dust Bowl',
      'Great Storm of 1987',
      'Storm of the Century',
      '1936 heat wave',
    ],
  },
  biometeorology: {
    slug: 'biometeorology',
    title: 'Biometeorology',
    description:
      'Biometeorology studies how weather and climate interact with living systems. Bird migration is timed to thermal columns, pollen counts are modulated by humidity and wind, asthma flares track thunderstorm outflows, and mood patterns shift with seasonal light availability. The field sits at the intersection of atmospheric science, ecology, and public health, and underpins everything from allergy forecasts to thermal-comfort design.',
    keywords: [
      'pollen',
      'allergies',
      'migration',
      'phenology',
      'thunderstorm asthma',
      'SAD',
      'heat illness',
      'thermal comfort',
    ],
  },
  urban_climate: {
    slug: 'urban_climate',
    title: 'Urban Climate',
    description:
      'Cities create their own weather. The urban heat island effect can push downtown temperatures 5–10°F above surrounding rural areas at night, with public-health consequences during heatwaves. The urban canyon channels and accelerates wind between tall buildings, modifies precipitation patterns downwind of cities, and traps pollutants under temperature inversions. Modern urban planning increasingly treats microclimate as a design variable rather than a side effect.',
    keywords: [
      'urban heat island',
      'urban canyon',
      'microclimate',
      'thermal inversion',
      'cool roof',
      'green infrastructure',
      'pollution dome',
    ],
  },
  aviation: {
    slug: 'aviation',
    title: 'Aviation Weather',
    description:
      'Aviation weather is its own discipline because aircraft operate across the full vertical structure of the troposphere and lower stratosphere, where conditions vary far more sharply than at the surface. Pilots and dispatchers contend with clear-air turbulence on jet stream boundaries, structural icing in supercooled liquid clouds, contrail formation as a climate forcing in its own right, and low-level wind shear on approach. METARs, TAFs, SIGMETs, and PIREPs form the operational data backbone.',
    keywords: [
      'turbulence',
      'icing',
      'contrail',
      'wind shear',
      'METAR',
      'TAF',
      'SIGMET',
      'PIREP',
      'jet stream',
      'CAT',
    ],
  },
  marine: {
    slug: 'marine',
    title: 'Marine Weather',
    description:
      'Marine weather covers everything from rogue waves and sea state forecasting to coastal fog, sea breezes, and weather routing for commercial shipping. Wave height is governed by wind speed, fetch, and duration; rogue waves remain a partly unsolved problem in oceanography. Modern weather routing software can save large vessels six-figure fuel costs per voyage by threading them between weather systems, while small-craft advisories and gale warnings save lives.',
    keywords: [
      'rogue wave',
      'sea state',
      'fog',
      'sea breeze',
      'weather routing',
      'wave height',
      'gale warning',
      'small craft advisory',
    ],
  },
  agricultural: {
    slug: 'agricultural',
    title: 'Agricultural Weather',
    description:
      'Agricultural weather translates atmospheric conditions into outcomes for crops, livestock, and food supply. Growing degree days drive plant development models; frost risk windows determine planting dates; the Palmer Drought Severity Index and the U.S. Drought Monitor track moisture deficits. A single late freeze, a hail core through a corn belt, or a multi-year drought can ripple through commodity markets globally.',
    keywords: [
      'growing degree day',
      'GDD',
      'frost',
      'PDSI',
      'drought monitor',
      'planting date',
      'evapotranspiration',
      'crop yield',
    ],
  },
  paleoclimate: {
    slug: 'paleoclimate',
    title: 'Paleoclimate',
    description:
      'Paleoclimate reconstructs the climate of the past — decades, centuries, millennia, even hundreds of millions of years — through proxies. Ice cores from Greenland and Antarctica preserve atmospheric composition trapped in air bubbles. Tree rings record growing-season conditions year by year. Marine sediment cores and speleothems extend the record into deep time. These records provide the only ground truth we have for testing whether climate models can reproduce conditions our instruments never measured.',
    keywords: [
      'ice core',
      'tree ring',
      'dendrochronology',
      'isotope',
      'speleothem',
      'sediment core',
      'proxy',
      'Holocene',
      'Younger Dryas',
    ],
  },
  tech_and_models: {
    slug: 'tech_and_models',
    title: 'Forecasting Tech',
    description:
      'Modern weather forecasting is a numerical exercise running on some of the largest supercomputers on Earth. Global models like GFS, ECMWF, and the new ML-based GraphCast and Pangu-Weather solve fluid-dynamics equations on grids spanning the planet, while ensembles quantify uncertainty by perturbing initial conditions and physics schemes. Machine learning is rapidly reshaping the field — current ML models match or beat conventional models on many metrics at a fraction of the compute.',
    keywords: [
      'GFS',
      'ECMWF',
      'GraphCast',
      'Pangu',
      'ensemble',
      'data assimilation',
      'NWP',
      'ML weather',
      'reanalysis',
      'ERA5',
    ],
  },
};

export interface TopicHistoryEntry {
  slug: TopicSlug;
  weeksSince: number;
}

const NEVER_USED_SCORE = 99;

export interface SelectionResult {
  topic: Topic;
  rationale: string;
  candidates: Array<{ slug: TopicSlug; score: number }>;
}

/**
 * Weighted-random selection from the top 5 topics scored by weeks-since-last-used.
 * Topics never used in the lookback window receive NEVER_USED_SCORE so they are
 * heavily favored. Pure round-robin would be predictable; pure random would
 * cluster recent topics.
 */
export function selectTopic(
  weeksSinceLastUsed: Map<TopicSlug, number>,
  rng: () => number = Math.random,
): SelectionResult {
  const candidates = TOPIC_SLUGS.map((slug) => ({
    slug,
    score: weeksSinceLastUsed.get(slug) ?? NEVER_USED_SCORE,
  })).sort((a, b) => b.score - a.score);

  const top5 = candidates.slice(0, 5);
  const totalWeight = top5.reduce((sum, c) => sum + c.score, 0);
  let pick = rng() * totalWeight;
  let chosen = top5[0];
  for (const candidate of top5) {
    pick -= candidate.score;
    if (pick <= 0) {
      chosen = candidate;
      break;
    }
  }

  const rationale =
    chosen.score === NEVER_USED_SCORE
      ? `Selected "${chosen.slug}" — never used in 12-week lookback`
      : `Selected "${chosen.slug}" — last used ${chosen.score} week(s) ago, weighted-random pick from top 5`;

  return { topic: TOPICS[chosen.slug], rationale, candidates };
}
