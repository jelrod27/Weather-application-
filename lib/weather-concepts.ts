/**
 * Meteorological concept definitions for the education glossary.
 * Complements dashboard metric definitions in weather-definitions.ts.
 */

import type { WeatherMetricDefinition } from '@/lib/weather-definitions'

export const WEATHER_CONCEPTS: Record<string, WeatherMetricDefinition> = {
  supercell: {
    id: 'supercell',
    name: 'Supercell',
    brief:
      'A long-lived thunderstorm with a deep, persistently rotating updraft called a mesocyclone — the rarest but most dangerous storm type.',
    detailed:
      'Supercells are organized thunderstorms maintained by a rotating updraft. Wind shear tilts the storm so the updraft and downdraft do not cancel each other, allowing the cell to live for hours and travel hundreds of miles. They produce the strongest tornadoes, largest hail, and most destructive downbursts. Only a small fraction of thunderstorms become supercells, but they account for a disproportionate share of severe weather damage.',
    howMeasured:
      'Identified on radar by a persistent mesocyclone (rotating velocity couplet), a bounded weak echo region (BWER), and often a hook echo on reflectivity. Storm spotters look for a rotating wall cloud, tail cloud, and anvil with crisp edges.',
    ranges: [
      { label: 'Classic', range: 'Plains profile', description: 'Large hail and tornadoes common. Most photographed supercell type.' },
      { label: 'Low-precip', range: 'LP supercell', description: 'Sculpted structure, less rain, still tornado-capable.' },
      { label: 'High-precip', range: 'HP supercell', description: 'Heavy rain wraps the mesocyclone; tornadoes can be rain-wrapped and hard to see.' },
    ],
    practicalTips: [
      'Supercells need CAPE, moisture, and wind shear — watch the SPC outlook during spring on the Plains.',
      'A rotating wall cloud under a supercell is a tornado warning sign even before a funnel appears.',
      'Never chase without training — supercells produce lightning, hail, and flooding in addition to tornadoes.',
    ],
  },
  cape: {
    id: 'cape',
    name: 'CAPE',
    brief:
      'Convective Available Potential Energy — how much buoyancy is available to fuel thunderstorm updrafts, measured in J/kg.',
    detailed:
      'CAPE represents the energy a parcel of air would gain if lifted through the atmosphere. Higher CAPE means stronger potential updrafts and more vigorous thunderstorms. Values below 500 J/kg rarely support severe storms; 1000–2500 J/kg is typical for summer afternoon storms; above 3000 J/kg can support explosive supercell development when shear is present.',
    howMeasured:
      'Calculated from a radiosonde (weather balloon) or model sounding by integrating the area between the environmental temperature profile and the lifted parcel curve on a skew-T diagram.',
    ranges: [
      { label: 'Weak', range: '< 500 J/kg', description: 'Little thunderstorm potential.' },
      { label: 'Moderate', range: '500–1500 J/kg', description: 'Scattered thunderstorms possible.' },
      { label: 'Strong', range: '1500–3000 J/kg', description: 'Robust convection; severe storms possible with shear.' },
      { label: 'Extreme', range: '> 3000 J/kg', description: 'Explosive thunderstorm growth possible — monitor warnings closely.' },
    ],
    practicalTips: [
      'CAPE alone does not make supercells — wind shear organizes rotation.',
      'Morning CAPE can be misleading; afternoon heating often doubles values in summer.',
      'High CAPE with a cap (CIN) may mean storms wait until the cap breaks — watch timing.',
    ],
  },
  mesocyclone: {
    id: 'mesocyclone',
    name: 'Mesocyclone',
    brief:
      'A cyclonically rotating vortex 2–10 km wide within a thunderstorm — the rotating heart of a supercell and precursor to most strong tornadoes.',
    detailed:
      'Mesocyclones form when horizontal vorticity in the environment is tilted vertically by a strong updraft and stretched, increasing rotation rate. They persist for tens of minutes to hours, much longer than short-lived gustnado rotation. Not every mesocyclone produces a tornado, but nearly every significant tornado comes from a mesocyclone.',
    howMeasured:
      'Doppler radar detects mesocyclones via a velocity couplet — inbound and outbound winds side by side. Rotation must meet depth, duration, and shear thresholds to be classified.',
    ranges: [
      { label: 'Weak', range: 'Broad rotation', description: 'Organized storm possible; tornado risk lower.' },
      { label: 'Strong', range: 'Tight couplet', description: 'Tornado watch/warning territory.' },
      { label: 'Violent', range: 'Persistent + tight', description: 'Significant tornado potential — take shelter immediately.' },
    ],
    practicalTips: [
      'A tornado warning means rotation is detected or a funnel is reported — do not wait for visual confirmation.',
      'Mesocyclones can produce tornadoes with little warning when rain-wrapped.',
      'Learn the difference between a mesocyclone (storm-scale) and a tornado (ground contact).',
    ],
  },
  'wind-shear': {
    id: 'wind-shear',
    name: 'Wind Shear',
    brief:
      'Change in wind speed or direction with height — critical for organizing storm rotation and aviation safety.',
    detailed:
      'Vertical wind shear separates updraft from downdraft in supercells, allowing them to survive. Speed shear (winds increasing with height) and directional shear (wind backing or veering) both matter. Low-level shear in the 0–3 km layer is especially important for tornado formation. Horizontal wind shear at fronts can also trigger turbulence.',
    howMeasured:
      'Derived from radiosonde winds at multiple heights, Doppler radar velocity profiles, or pilot reports (PIREPs). Aviation uses shear alerts when speed changes exceed 15 kt in the lowest few thousand feet.',
    ranges: [
      { label: 'Weak', range: '< 10 kt / 6 km', description: 'Pulse storms or clusters; short-lived.' },
      { label: 'Moderate', range: '10–20 kt', description: 'Organized multicells; some supercell potential.' },
      { label: 'Strong', range: '> 20 kt', description: 'Supercells and tornadoes more likely.' },
    ],
    practicalTips: [
      'Sudden wind shifts at the surface often mean a front or outflow boundary is passing.',
      'Pilots should review shear forecasts before takeoff and landing in thunderstorm season.',
      'Directional shear + high CAPE is the classic supercell setup in Tornado Alley.',
    ],
  },
  updraft: {
    id: 'updraft',
    name: 'Updraft',
    brief:
      'A column of rising air inside a storm — in supercells it rotates and can exceed 100 mph vertically.',
    detailed:
      'Updrafts form when air is warmer and moister than its surroundings and becomes buoyant. In ordinary storms, updrafts last 15–30 minutes. In supercells, rotation and shear help sustain updrafts for hours. Updraft strength determines hail size (stronger updrafts suspend larger hailstones longer) and tornado potential when paired with rotation.',
    howMeasured:
      'Estimated from radar reflectivity cores, satellite cloud-top temperature, lightning rates, and dual-pol radar products. Storm spotters infer strength from cloud base lowering and rapid vertical growth.',
    ranges: [
      { label: 'Weak', range: '< 20 mph', description: 'Fair-weather cumulus or weak showers.' },
      { label: 'Moderate', range: '20–50 mph', description: 'Garden-variety thunderstorms.' },
      { label: 'Strong', range: '50–100 mph', description: 'Severe hail and wind likely.' },
      { label: 'Extreme', range: '> 100 mph', description: 'Supercell core — giant hail and tornado risk.' },
    ],
    practicalTips: [
      'Rapidly rising cloud towers signal strengthening updrafts — seek shelter if storms approach.',
      'Anvil tops spreading downwind mark the top of the updraft hitting the tropopause.',
      'Avoid flying through strong updrafts — severe turbulence and icing are guaranteed.',
    ],
  },
  'dew-point': {
    id: 'dew-point',
    name: 'Dew Point',
    brief:
      'The temperature air must cool to for saturation — a direct measure of moisture that drives heat index and storm fuel.',
    detailed:
      'Unlike relative humidity, dew point is comparable across temperatures. Dew points above 65°F feel muggy; above 70°F is oppressive in summer. In storm forecasting, dew points above 60°F in the Plains often provide enough moisture for severe thunderstorms when other ingredients align.',
    howMeasured:
      'Calculated from wet-bulb temperature or measured directly with chilled-mirror hygrometers at weather stations.',
    ranges: [
      { label: 'Dry', range: '< 40°F', description: 'Comfortable; low storm moisture.' },
      { label: 'Moderate', range: '40–60°F', description: 'Pleasant to slightly humid.' },
      { label: 'Humid', range: '60–70°F', description: 'Muggy; good thunderstorm moisture.' },
      { label: 'Oppressive', range: '> 70°F', description: 'Dangerous heat index combinations possible.' },
    ],
    practicalTips: [
      'Watch dew point more than humidity percentage when judging comfort.',
      'Rising dew points ahead of a front often signal increasing storm potential.',
      'Dew point spreading from the Gulf is a key ingredient in Plains severe weather setups.',
    ],
  },
}

export function getConceptDefinition(id: string): WeatherMetricDefinition | undefined {
  return WEATHER_CONCEPTS[id]
}

export function getAllConcepts(): WeatherMetricDefinition[] {
  return Object.values(WEATHER_CONCEPTS)
}
