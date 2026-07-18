import type { FlightCategory } from './brief-score';

export type WeatherDriver = {
  id: string;
  title: string;
  detail: string;
};

export function buildWeatherDrivers(input: {
  originIata: string;
  destIata: string;
  originCategory: FlightCategory;
  destCategory: FlightCategory;
  hazards: Array<{ type: string; hazard: string; severity: string }>;
}): WeatherDriver[] {
  const drivers: WeatherDriver[] = [];

  if (input.originCategory !== 'VFR' && input.originCategory !== 'UNKNOWN') {
    drivers.push({
      id: 'origin-cat',
      title: `${input.originIata} is ${input.originCategory}`,
      detail: `Departure airport flight category is ${input.originCategory} from the latest METAR.`,
    });
  }
  if (input.destCategory !== 'VFR' && input.destCategory !== 'UNKNOWN') {
    drivers.push({
      id: 'dest-cat',
      title: `${input.destIata} is ${input.destCategory}`,
      detail: `Arrival airport flight category is ${input.destCategory} from the latest METAR.`,
    });
  }

  for (const h of input.hazards.slice(0, 4)) {
    drivers.push({
      id: `haz-${h.type}-${h.hazard}`,
      title: `${h.type}: ${h.hazard}`,
      detail: `Severity ${h.severity}. Advisory intersects the approximate great-circle corridor.`,
    });
  }

  if (drivers.length === 0) {
    drivers.push({
      id: 'clear',
      title: 'No major weather drivers flagged',
      detail: 'Both ends look VFR/unknown and no corridor advisories matched the buffer.',
    });
  }

  return drivers;
}
