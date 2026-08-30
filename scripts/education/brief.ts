/**
 * The Entry's own structured data, as prompt context.
 *
 * Only physical fields cross this seam. `description16bit`, `bitFact`, `emoji`
 * and `rarity` are arcade chrome — "Massive storm tower reaching max altitude
 * limit" is flavour text, and letting it into the grounding block is how that
 * register leaks into 900 words meant to rank in search.
 *
 * These same fields render in the Guide's "At a glance" panel, so the prompt
 * passes them to keep the prose consistent with the panel, not to have them
 * recited back.
 */

import type { CloudData } from '@/data/cloud-types';
import type { WeatherPhenomena } from '@/data/fun-facts';
import type { WeatherSystemData } from '@/data/weather-systems';
import { getCloudBySlug, getPhenomenonBySlug, getWeatherSystemBySlug } from '@/lib/education/entries';

import type { EligibleEntry } from './queue';

function line(label: string, value: string | undefined): string | null {
  return value && value.trim() ? `${label}: ${value.trim()}` : null;
}

function cloudFacts(cloud: CloudData): string[] {
  return [
    line('Category', cloud.category),
    line('Cloud type', cloud.cloudType),
    line('Parent genus', cloud.parentGenus ?? undefined),
    line('Altitude range', cloud.altitudeRange),
    line('Temperature', cloud.temperature),
    line('Droplet size', cloud.dropletSize),
    line('Formation time', cloud.formationTime),
    line('Associated winds', cloud.windSpeed),
    line('Pressure range', cloud.pressureRange),
    line('Density', cloud.density),
    line('Thickness', cloud.thickness),
    line('Precipitation', cloud.precipitation),
    line('Lifespan', cloud.lifespan),
    line('Formation', cloud.formation),
    line('Appearance', cloud.appearance),
    line('Forecast signal', cloud.weatherPrediction),
    line('Etymology', cloud.etymology),
  ].filter((entry): entry is string => entry !== null);
}

function systemFacts(system: WeatherSystemData): string[] {
  return [
    line('Classification', system.classification),
    line('Category', system.category),
    line('Pressure range', system.pressureRange),
    line('Wind speed', system.windSpeed),
    line('Temperature range', system.temperatureRange),
    line('Rotation', system.rotation),
    line('Formation process', system.formationProcess),
    line('Associated weather', system.associatedWeather),
    line('Seasonal occurrence', system.seasonalOccurrence),
    line('Geographic regions', system.geographicRegions),
    line('Weather impact', system.weatherImpact),
    line('Slope', system.slope),
    line('Precipitation type', system.precipitationType),
    line('Diameter', system.diameter),
    line('Altitude', system.altitude),
    line('Duration', system.duration),
    line('Types', system.types),
    line('Etymology', system.etymology),
    line('Notable event', system.notableEvent),
  ].filter((entry): entry is string => entry !== null);
}

function phenomenonFacts(phenomenon: WeatherPhenomena): string[] {
  return [
    line('Category', phenomenon.category),
    line('Description', phenomenon.description),
    line('Scientific mechanism', phenomenon.scientificMechanism),
    line('Historical occurrence', phenomenon.historicalOccurrence),
    line('How to spot it', phenomenon.howToSpot),
    line('Where to see it', phenomenon.whereToSee),
    line('Best season', phenomenon.bestSeason),
    ...phenomenon.facts.map((fact, i) => `Recorded fact ${i + 1}: ${fact}`),
  ].filter((entry): entry is string => entry !== null);
}

/**
 * The Entry's physical fields as prompt lines, or an empty list when the Entry
 * has vanished from the databases between queueing and drafting.
 */
export function entryFacts(entry: EligibleEntry): string[] {
  if (entry.kind === 'cloud') {
    const cloud = getCloudBySlug(entry.slug);
    return cloud ? cloudFacts(cloud) : [];
  }
  if (entry.kind === 'weather-system') {
    const system = getWeatherSystemBySlug(entry.slug);
    return system ? systemFacts(system) : [];
  }
  const phenomenon = getPhenomenonBySlug(entry.slug);
  return phenomenon ? phenomenonFacts(phenomenon) : [];
}

/** Human label for the Atlas an Entry belongs to, used in the prompt header. */
export function kindLabel(entry: EligibleEntry): string {
  if (entry.kind === 'cloud') return 'Cloud Atlas';
  if (entry.kind === 'weather-system') return 'Weather Systems';
  return 'Weather Phenomena';
}
