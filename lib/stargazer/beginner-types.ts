import type { SkyPosition } from '@/lib/stargazer/direction';

export interface ObservingTarget extends SkyPosition {
  id: string;
  minAltitude: number;
  magnitude: number;
}
export type ObservingWeatherIssue = 'missing' | 'clouds' | 'precipitation' | 'weather-code';
export interface ObservingHour {
  start: number;
  end: number;
  midpoint: number;
  targets: ObservingTarget[];
  weather: {
    cloudLow: number | null;
    cloudHigh: number | null;
    temperatureLow: number | null;
    temperatureHigh: number | null;
    wind: number | null;
    precipitation: number | null;
    issues: ObservingWeatherIssue[];
  };
}
export interface BeginnerNight {
  hours: ObservingHour[];
  reason?: 'timezone' | 'coverage';
}
