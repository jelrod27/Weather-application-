/**
 * 16-Bit Weather Platform
 * Weather systems educational content for app/weather-systems
 */

export type WeatherSystemData = {
  id: number;
  name: string;
  classification: string;
  category: 'pressure' | 'frontal' | 'large-scale' | 'specialized';
  pressureRange?: string;
  windSpeed: string;
  formationProcess: string;
  temperatureRange?: string;
  rotation?: string;
  associatedWeather: string;
  seasonalOccurrence?: string;
  geographicRegions: string;
  weatherImpact: string;
  description16bit: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'boss-level' | 'elite-tier';
  // Additional optional properties
  slope?: string;
  precipitationType?: string;
  diameter?: string;
  altitude?: string;
  waterTransport?: string;
  duration?: string;
  types?: string;
  etymology?: string;
  notableEvent?: string;
};

// Weather Systems Database - Comprehensive 16 systems
export const weatherSystemsDatabase: WeatherSystemData[] = [
  // PRESSURE SYSTEMS
  {
    id: 1,
    name: "CYCLONES",
    classification: "LOW PRESSURE",
    category: "pressure",
    pressureRange: "950-1010 mb",
    windSpeed: "30-80 mph",
    formationProcess: "Warm air rises, creating low pressure at surface. Air converges and rotates counterclockwise (Northern Hemisphere)",
    temperatureRange: "Variable, typically 40-70°F",
    rotation: "Counterclockwise (Northern Hemisphere), Clockwise (Southern Hemisphere)",
    associatedWeather: "Cloudy skies, precipitation, strong winds, storms",
    seasonalOccurrence: "Year-round, more intense in winter",
    geographicRegions: "Mid-latitudes, especially over oceans and continental boundaries",
    weatherImpact: "Brings unsettled weather, rain, snow, and storms to affected regions",
    description16bit: "Spinning vortex of chaos - where low pressure creates nature's washing machine",
    emoji: "🌀",
    rarity: "common",
    etymology: "From Greek 'kyklon' meaning 'moving in a circle' or 'coiled snake'",
    notableEvent: "The Great Storm of 1987 (UK) - A violent extratropical cyclone"
  },
  {
    id: 2,
    name: "ANTICYCLONES",
    classification: "HIGH PRESSURE",
    category: "pressure",
    pressureRange: "1020-1050 mb",
    windSpeed: "5-25 mph",
    formationProcess: "Cold air descends, creating high pressure at surface. Air diverges and rotates clockwise (Northern Hemisphere)",
    temperatureRange: "Variable, clear skies allow temperature extremes",
    rotation: "Clockwise (Northern Hemisphere), Counterclockwise (Southern Hemisphere)",
    associatedWeather: "Clear skies, calm winds, stable conditions",
    seasonalOccurrence: "Year-round, winter anticyclones can bring extreme cold",
    geographicRegions: "Continental interiors, subtropical regions around 30° latitude",
    weatherImpact: "Brings fair weather, but can cause droughts or temperature extremes",
    description16bit: "High pressure dome of stability - nature's weather shield deflecting storms",
    emoji: "☀️",
    rarity: "common",
    etymology: "Coined by Sir Francis Galton in 1860 to describe the opposite of a cyclone"
  },
  {
    id: 3,
    name: "DEPRESSIONS",
    classification: "MATURE LOW PRESSURE",
    category: "pressure",
    pressureRange: "970-1000 mb",
    windSpeed: "25-60 mph",
    formationProcess: "Fully developed cyclonic system with well-defined warm and cold fronts",
    temperatureRange: "Wide variation across frontal boundaries",
    rotation: "Counterclockwise circulation with frontal boundaries",
    associatedWeather: "Sequential weather changes as fronts pass: warm sector rain, cold front storms",
    seasonalOccurrence: "Most common autumn through spring",
    geographicRegions: "North Atlantic, North Pacific, Southern Ocean storm tracks",
    weatherImpact: "Brings organized weather sequences over 2-3 days as system passes",
    description16bit: "Mature storm system - organized chaos with predictable weather sequences",
    emoji: "🌧️",
    rarity: "uncommon",
    etymology: "Latin 'depressio' (pressing down) - referring to the dip in barometric pressure"
  },
  {
    id: 4,
    name: "BLOCKING HIGHS",
    classification: "PERSISTENT HIGH PRESSURE",
    category: "pressure",
    pressureRange: "1025-1055 mb",
    windSpeed: "5-20 mph (light winds)",
    formationProcess: "Anticyclone becomes stationary, blocking normal weather pattern flow",
    temperatureRange: "Can create extreme heat or cold depending on season",
    rotation: "Slow clockwise circulation that diverts weather systems",
    associatedWeather: "Extended periods of similar weather - heat waves, cold snaps, or droughts",
    seasonalOccurrence: "Can occur any season, often persist for weeks",
    geographicRegions: "Can form anywhere but common over continents in summer",
    weatherImpact: "Disrupts normal weather patterns, causes extended extreme conditions",
    description16bit: "Weather roadblock - stationary high pressure fortress deflecting all storms",
    emoji: "🛡️",
    rarity: "elite-tier",
    etymology: "Named for its ability to 'block' the normal zonal flow of westerly winds",
    notableEvent: "2003 European Heat Wave - Caused by a persistent Omega Block"
  },

  // FRONTAL SYSTEMS
  {
    id: 5,
    name: "WARM FRONTS",
    classification: "ADVANCING WARM AIR",
    category: "frontal",
    windSpeed: "10-30 mph",
    formationProcess: "Warm air mass gradually overrides cooler air ahead",
    temperatureRange: "Gradual warming as front passes",
    slope: "Gentle (1:200 ratio), extends 500-1000 km ahead",
    associatedWeather: "Light to moderate, widespread, long duration (6-24 hours)",
    precipitationType: "Light to moderate, widespread, long duration",
    geographicRegions: "Mid-latitude regions with contrasting air masses",
    weatherImpact: "Gradual weather deterioration over large area",
    description16bit: "Gentle giant - warm air slowly conquering cold territory with steady rain",
    emoji: "🌤️",
    rarity: "common",
    etymology: "Named for the leading edge of a warm air mass replacing a cold one"
  },
  {
    id: 6,
    name: "COLD FRONTS",
    classification: "ADVANCING COLD AIR",
    category: "frontal",
    windSpeed: "25-60 mph, gusty",
    formationProcess: "Dense cold air rapidly undercuts and lifts warm air",
    temperatureRange: "Sharp temperature drop (10-20°F in hours)",
    slope: "Steep (1:50 ratio), narrow band 50-200 km wide",
    associatedWeather: "Heavy, intense, short duration (1-4 hours)",
    precipitationType: "Heavy, intense, short duration",
    geographicRegions: "Mid-latitude regions, especially Great Plains",
    weatherImpact: "Violent but brief weather followed by clearing and cooling",
    description16bit: "Cold blade - dense air wedge slicing through warmth with thunderous fury",
    emoji: "⚡",
    rarity: "common",
    etymology: "Named for the leading edge of a cold air mass replacing a warm one"
  },
  {
    id: 7,
    name: "OCCLUDED FRONTS",
    classification: "COMPLEX FRONTAL MERGER",
    category: "frontal",
    windSpeed: "20-50 mph",
    formationProcess: "Fast-moving cold front catches up to warm front, lifting warm air completely off surface",
    temperatureRange: "Variable, depends on type of occlusion",
    types: "Cold occlusion (colder air behind) or warm occlusion (less cold air behind)",
    associatedWeather: "Mixed types, can be heavy and prolonged",
    geographicRegions: "Mature storm systems in mid-latitudes",
    weatherImpact: "Complex weather with multiple precipitation types",
    description16bit: "Weather sandwich - cold front devours warm front creating layered chaos",
    emoji: "🥪",
    rarity: "uncommon",
    etymology: "Latin 'occludere' (to shut up, close up) - the warm air is closed off from the surface"
  },
  {
    id: 8,
    name: "STATIONARY FRONTS",
    classification: "NON-MOVING BOUNDARY",
    category: "frontal",
    windSpeed: "Variable, often light",
    formationProcess: "Two air masses meet but neither advances significantly",
    temperatureRange: "Minimal, boundary remains in same location",
    associatedWeather: "Light, intermittent, can persist for days",
    duration: "Can remain stationary for days or weeks",
    geographicRegions: "Anywhere air masses of different temperatures meet",
    weatherImpact: "Extended periods of similar weather on each side of boundary",
    description16bit: "Atmospheric standoff - two air masses locked in eternal stalemate",
    emoji: "⚖️",
    rarity: "uncommon",
    etymology: "Latin 'stationarius' - staying in one place"
  },

  // LARGE-SCALE SYSTEMS
  {
    id: 9,
    name: "ATMOSPHERIC RIVERS",
    classification: "MOISTURE TRANSPORT SYSTEM",
    category: "large-scale",
    windSpeed: "50-150 mph at jet level",
    formationProcess: "Jet stream guides narrow bands of moisture from tropics",
    diameter: "400-600 km wide, 1,000-4,000 km long",
    waterTransport: "Equivalent to 15-30 Mississippi Rivers",
    duration: "Individual events last 1-3 days",
    associatedWeather: "Can provide 30-50% of annual precipitation in single events",
    geographicRegions: "West coasts of continents, especially California, Pacific Northwest",
    weatherImpact: "Can provide 30-50% of annual precipitation in single events",
    description16bit: "Sky river express - atmospheric highway delivering tropical moisture bombs",
    emoji: "🌊",
    rarity: "boss-level",
    etymology: "Coined in the 1990s to describe the filamentary structure of atmospheric water vapor transport",
    notableEvent: "The 'Pineapple Express' - Famous AR connecting Hawaii to the US West Coast"
  },
  {
    id: 10,
    name: "JET STREAMS",
    classification: "HIGH-ALTITUDE WIND SYSTEM",
    category: "large-scale",
    altitude: "30,000-50,000 feet (9-15 km)",
    windSpeed: "80-275 mph",
    formationProcess: "Temperature differences between air masses create pressure gradients",
    diameter: "100-400 km wide, 3-7 km thick",
    types: "Polar Jet (stronger), Subtropical Jet (weaker)",
    seasonalOccurrence: "Shift north in summer, south in winter",
    associatedWeather: "Steer surface weather systems, create turbulence for aircraft",
    geographicRegions: "Global, separate streams for each hemisphere",
    weatherImpact: "Steer surface weather systems, create turbulence for aircraft",
    description16bit: "Atmospheric autobahn - high-speed wind rivers steering Earth's weather",
    emoji: "✈️",
    rarity: "elite-tier",
    etymology: "First identified by Wasaburo Oishi in the 1920s, gained prominence in WWII aviation",
    notableEvent: "Used by Japanese 'Fire Balloon' bombs in WWII to cross the Pacific"
  },
  {
    id: 11,
    name: "MONSOONS",
    classification: "SEASONAL WIND REVERSAL",
    category: "large-scale",
    windSpeed: "10-40 mph surface winds",
    formationProcess: "Seasonal heating/cooling differences between land and ocean",
    types: "Summer monsoon (wet), Winter monsoon (dry)",
    duration: "3-6 month seasons",
    associatedWeather: "Can deliver 80% of annual rainfall in affected regions",
    geographicRegions: "Tropical and subtropical regions, especially Asia",
    weatherImpact: "Defines wet and dry seasons for billions of people",
    description16bit: "Seasonal wind revolution - continental-scale weather system flip every six months",
    emoji: "🏔️",
    rarity: "elite-tier",
    etymology: "Arabic 'mausim' meaning 'season'",
    notableEvent: "The Indian Summer Monsoon - Critical for the agriculture of the subcontinent"
  },
  {
    id: 12,
    name: "POLAR VORTEX",
    classification: "CIRCUMPOLAR CIRCULATION",
    category: "large-scale",
    altitude: "10-50 km high in stratosphere",
    windSpeed: "60-200 mph",
    temperatureRange: "-70 to -100°F at center",
    formationProcess: "Strong temperature gradient around polar regions",
    seasonalOccurrence: "Stronger in winter, weaker in summer",
    associatedWeather: "Contains frigid air, but when disrupted causes extreme cold outbreaks",
    geographicRegions: "Arctic and Antarctic regions, occasional mid-latitude intrusions",
    weatherImpact: "Contains frigid air, but when disrupted causes extreme cold outbreaks",
    description16bit: "Arctic fortress - spinning wall of frigid air guarding polar regions",
    emoji: "🧊",
    rarity: "boss-level",
    etymology: "Latin: 'polus' (pole) + 'vertex' (whirlpool)",
    notableEvent: "2014 North American Cold Wave - Popularized the term 'Polar Vortex'"
  },

  // SPECIALIZED SYSTEMS
  {
    id: 13,
    name: "MID-LATITUDE CYCLONES",
    classification: "EXTRA-TROPICAL STORM",
    category: "specialized",
    diameter: "1,500-5,000 km",
    pressureRange: "950-1000 mb at center",
    windSpeed: "30-80 mph",
    formationProcess: "Temperature contrasts along polar front",
    duration: "3-7 days from formation to decay",
    seasonalOccurrence: "Autumn through spring",
    associatedWeather: "Brings most weather changes to mid-latitudes",
    geographicRegions: "30-60° latitude storm tracks",
    weatherImpact: "Brings most weather changes to mid-latitudes",
    description16bit: "Mid-latitude monster - massive spinning storm bringing weather variety to temperate zones",
    emoji: "🌪️",
    rarity: "elite-tier",
    etymology: "Also known as 'Extratropical Cyclones' or 'Wave Cyclones'",
    notableEvent: "The Columbus Day Storm of 1962 - Strongest extratropical cyclone in US history"
  },
  {
    id: 14,
    name: "TROPICAL CYCLONES",
    classification: "TROPICAL STORM SYSTEM",
    category: "specialized",
    diameter: "200-1,000 km",
    pressureRange: "900-980 mb (intense storms)",
    windSpeed: "74+ mph (hurricane threshold)",
    formationProcess: "Warm ocean water (26.5°C+) provides energy",
    seasonalOccurrence: "Late summer/early fall",
    associatedWeather: "Catastrophic winds, storm surge, flooding",
    geographicRegions: "Tropical oceans between 5-30° latitude",
    weatherImpact: "Catastrophic winds, storm surge, flooding",
    description16bit: "Tropical destroyer - ocean-powered spiral of catastrophic winds and water",
    emoji: "🌀",
    rarity: "boss-level",
    etymology: "From 'Huracan' (Taino storm god) or 'Cyclops' (Greek)",
    notableEvent: "Hurricane Katrina (2005) or Typhoon Tip (1979 - Largest ever)"
  },
  {
    id: 15,
    name: "SQUALL LINES",
    classification: "LINEAR THUNDERSTORM COMPLEX",
    category: "specialized",
    diameter: "100-1,000 km long, 20-50 km wide",
    duration: "6-12 hours",
    windSpeed: "60-100+ mph gusts",
    formationProcess: "Cold front or convergence line triggers line of thunderstorms",
    associatedWeather: "Heavy rain, hail, tornadoes, damaging winds",
    geographicRegions: "Great Plains, southeastern US, other continental areas",
    weatherImpact: "Produces most damaging straight-line winds",
    description16bit: "Storm formation flight - squadron of thunderstorms marching in military precision",
    emoji: "⛈️",
    rarity: "rare",
    etymology: "Nautical term 'squall' meaning a sudden violent gust of wind",
    notableEvent: "The 2012 North American Derech - A massive squall line event"
  },
  {
    id: 16,
    name: "MESOSCALE CONVECTIVE COMPLEXES",
    classification: "LARGE THUNDERSTORM CLUSTER",
    category: "specialized",
    diameter: "100-1,000 km",
    duration: "6-20 hours",
    formationProcess: "Multiple thunderstorms merge into organized system",
    windSpeed: "Variable, 50-100+ mph in embedded storms",
    seasonalOccurrence: "Late spring through early fall",
    associatedWeather: "Heavy rainfall, flash flooding, hail, occasional tornadoes",
    geographicRegions: "Great Plains, Midwest US, similar continental regions",
    weatherImpact: "Major source of warm-season precipitation and flooding",
    description16bit: "Thunderstorm metropolis - sprawling city of storms dominating the night sky",
    emoji: "🏙️",
    rarity: "rare",
    etymology: "Meso (middle) + scale + convection (heat transfer by movement)",
    notableEvent: "The Great Flood of 1993 - Partly caused by repeated MCCs"
  }
];
