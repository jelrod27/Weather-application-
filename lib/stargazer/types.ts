/**
 * Stargazer - Astrophotography Forecast Types
 */

// ============================================================================
// Score Types
// ============================================================================

export interface StargazerSubScores {
  cloud: number;
  moon: number;
  seeing: number;
  transparency: number;
  ground: number;
}

export interface StargazerScore {
  overall: number;
  label: ScoreLabel;
  color: string;
  summary: string;
  subScores: StargazerSubScores;
}

export type ScoreLabel = 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Bad';

// ============================================================================
// Dark Window
// ============================================================================

export interface DarkWindow {
  astronomicalDusk: Date;
  astronomicalDawn: Date;
  sunset: Date;
  sunrise: Date;
}

// ============================================================================
// Hourly Conditions
// ============================================================================

export interface HourlyCondition {
  time: Date;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  seeing: number;
  transparency: number;
  windSpeed: number;
  /** Ground wind direction in degrees (0-360, meteorological) */
  windDirection: number;
  humidity: number;
  temperature: number;
  dewpoint: number;
  dewRisk: 'low' | 'moderate' | 'high';
  /** Horizontal visibility in meters (Open-Meteo) */
  visibility: number;
  /** Surface pressure in hPa */
  surfacePressure: number;
  /** Per-hour composite score (0-100), computed during dark window */
  hourlyScore?: number;
  /** Per-hour sub-scores breakdown */
  hourlySubScores?: StargazerSubScores;
  /** True if high cloud cover is penalizing transparency */
  cirrusWarning?: boolean;
}

// ============================================================================
// Moon
// ============================================================================

export interface MoonInfo {
  phaseName: string;
  phaseAngle: number;
  illumination: number;
  rise: Date | null;
  set: Date | null;
  moonUpDuringDarkWindowPercent: number;
  darkWindowStart: Date | null;
  darkWindowEnd: Date | null;
  nextNewMoon: Date;
  nextFullMoon: Date;
}

// ============================================================================
// Planets
// ============================================================================

export interface PlanetVisibility {
  name: string;
  rise: Date | null;
  set: Date | null;
  peakAltitude: number;
  peakTime: Date;
  magnitude: number;
  constellation: string;
  notes: string;
}

// ============================================================================
// Deep Sky Objects
// ============================================================================

export type DeepSkyType =
  | 'emission_nebula'
  | 'reflection_nebula'
  | 'planetary_nebula'
  | 'dark_nebula'
  | 'supernova_remnant'
  | 'spiral_galaxy'
  | 'elliptical_galaxy'
  | 'irregular_galaxy'
  | 'galaxy_group'
  | 'open_cluster'
  | 'globular_cluster'
  | 'star_forming_region';

export interface DeepSkyObject {
  id: string;
  name: string;
  altNames: string[];
  type: DeepSkyType;
  constellation: string;
  ra: number;
  dec: number;
  magnitude: number;
  size: string;
  distance: string;
  bestMonths: number[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  imagingTips: string;
  longDescription?: string;
  discoveredBy?: string;
  physicalProperties?: string;
  notableFeatures?: string;
  nakedEyeVisible?: boolean;
  binocularTarget?: boolean;
  telescopeMinAperture?: string;
  wikipediaSlug?: string;
}

export interface DeepSkyHighlight extends DeepSkyObject {
  maxAltitude: number;
  transitTime: Date;
  transitsDuringDarkWindow: boolean;
}

// ============================================================================
// Meteor Showers
// ============================================================================

export interface MeteorShower {
  name: string;
  peak: string;
  peakMonth: number;
  peakDay: number;
  activeStart: string;
  activeEnd: string;
  zhr: number;
  speed: number;
  radiantConstellation: string;
  radiantRA: number;
  radiantDec: number;
  parentBody: string;
  description: string;
}

export interface MeteorShowerEvent extends MeteorShower {
  moonInterference: 'none' | 'low' | 'moderate' | 'high';
  moonIlluminationAtPeak: number;
}

// ============================================================================
// ISS Passes
// ============================================================================

export interface ISSPass {
  date: Date;
  riseTime: Date;
  riseDirection: string;
  maxElevation: number;
  maxTime: Date;
  setDirection: string;
  setTime: Date;
  brightness: number;
}

// ============================================================================
// Launches
// ============================================================================

export interface Launch {
  id: string;
  name: string;
  net: Date;
  status: string;
  provider: string;
  vehicle: string;
  padName: string;
  padLocation: string;
  padMapUrl: string | null;
  missionName: string;
  missionDescription: string;
  missionType: string;
  isCrewed: boolean;
  slug: string;
  videoUrls: string[];
  imageUrl: string | null;
}

// ============================================================================
// Sky Events
// ============================================================================

export interface SkyEvent {
  date: Date;
  type: 'meteor_shower' | 'conjunction' | 'opposition' | 'lunar_eclipse' | 'solar_eclipse' | 'equinox' | 'solstice';
  title: string;
  description: string;
  moonInterference?: string;
}

// ============================================================================
// 7Timer API Response
// ============================================================================

export interface SevenTimerDataPoint {
  timepoint: number;
  cloudcover: number;
  seeing: number;
  transparency: number;
  lifted_index: number;
  rh2m: number;
  wind10m: {
    direction: string;
    speed: number;
  };
  temp2m: number;
  prec_type: string;
}

export interface SevenTimerResponse {
  product: string;
  init: string;
  dataseries: SevenTimerDataPoint[];
}

// ============================================================================
// Best Window & Limiting Factor
// ============================================================================

export interface BestWindow {
  startTime: Date;
  endTime: Date;
  score: number;
  label: ScoreLabel;
  color: string;
}

export interface LimitingFactor {
  category: keyof StargazerSubScores;
  label: string;
  detail: string;
}

// ============================================================================
// Sky Environment (space weather + aerosols)
// ============================================================================

export interface StargazerEnvironment {
  /** Current planetary Kp index (0-9), null if unavailable */
  kpIndex: number | null;
  /** Max expected Kp over the next ~24h, null if unavailable */
  kpForecastMax: number | null;
  /** Dust concentration in ug/m3, null if unavailable */
  dust: number | null;
  /** Fine particulate (PM2.5) in ug/m3, null if unavailable */
  pm2_5: number | null;
  /** US Air Quality Index, null if unavailable */
  usAqi: number | null;
}

// ============================================================================
// Consolidated API Response
// ============================================================================

export interface StargazerData {
  score: StargazerScore;
  bestWindow: BestWindow | null;
  nightAverage: number;
  limitingFactor: LimitingFactor | null;
  darkWindow: DarkWindow;
  hourlyConditions: HourlyCondition[];
  environment: StargazerEnvironment;
  moon: MoonInfo;
  planets: PlanetVisibility[];
  deepSkyHighlights: DeepSkyHighlight[];
  skyEvents: SkyEvent[];
  issPasses: ISSPass[];
  launches: Launch[];
  meteorShowers: MeteorShowerEvent[];
  location: {
    lat: number;
    lon: number;
    name?: string;
    displayName?: string;
    bortle?: number;
    bortleLabel?: string;
  };
  generatedAt: string;
}
