import type { ForecastDay } from '@/lib/types';

/** Match the provider's current calendar day after incomplete days are removed. */
export function getTodayForecast(weather: { currentDate?: string; forecast: ForecastDay[] }): ForecastDay | undefined {
  return weather.currentDate
    ? weather.forecast.find((day) => day.date === weather.currentDate)
    : weather.forecast.find((day) => !day.date); // Legacy, undated cached payloads.
}
