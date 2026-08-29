/**
 * Unit tests for Open-Meteo forecast processing
 */

import { processDailyForecastFromOpenMeteo } from '@/lib/weather/weather-forecast';

describe('processDailyForecastFromOpenMeteo', () => {
  it('should transform Open-Meteo daily parallel arrays into ForecastDay[] with correct day names', () => {
    const daily = {
      time: ['2026-03-25', '2026-03-26', '2026-03-27'],
      temperature_2m_max: [72, 68, 75],
      temperature_2m_min: [55, 50, 58],
      weather_code: [0, 3, 61],
      precipitation_probability_max: [0, 10, 80],
      wind_speed_10m_max: [12, 15, 20],
      uv_index_max: [6, 4, 2],
    };

    const result = processDailyForecastFromOpenMeteo(daily);

    expect(result).toHaveLength(3);
    // 2026-03-25 is a Wednesday
    expect(result[0].day).toBe('Wednesday');
    expect(result[0].highTemp).toBe(72);
    expect(result[0].lowTemp).toBe(55);
    expect(result[0].details?.precipitationChance).toBe(0);
    expect(result[0].details?.windSpeed).toBe(12);
    expect(result[0].details?.uvIndex).toBe(6);
  });

  it('should map WMO weather codes to correct condition and description', () => {
    const daily = {
      time: ['2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29'],
      temperature_2m_max: [70, 65, 60, 55, 50],
      temperature_2m_min: [50, 45, 40, 35, 30],
      weather_code: [0, 3, 61, 73, 95],
      precipitation_probability_max: [0, 0, 80, 90, 70],
      wind_speed_10m_max: [10, 10, 10, 10, 10],
      uv_index_max: [5, 5, 5, 5, 5],
    };

    const result = processDailyForecastFromOpenMeteo(daily);

    expect(result[0].condition).toBe('sunny');
    expect(result[0].description).toBe('Clear Sky');
    expect(result[1].condition).toBe('cloudy');
    expect(result[1].description).toBe('Overcast');
    expect(result[2].condition).toBe('rainy');
    expect(result[2].description).toBe('Slight Rain');
    expect(result[3].condition).toBe('snowy');
    expect(result[3].description).toBe('Moderate Snowfall');
    expect(result[4].condition).toBe('rainy');
    expect(result[4].description).toBe('Thunderstorm');
  });

  it('should return 7 days of forecast data when given 7 days of input', () => {
    const daily = {
      time: ['2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31'],
      temperature_2m_max: [72, 68, 75, 70, 65, 60, 63],
      temperature_2m_min: [55, 50, 58, 52, 48, 45, 47],
      weather_code: [0, 1, 2, 3, 61, 71, 95],
      precipitation_probability_max: [0, 5, 10, 15, 80, 60, 70],
      wind_speed_10m_max: [12, 8, 15, 10, 20, 18, 25],
      uv_index_max: [6, 7, 4, 3, 2, 1, 2],
    };

    const result = processDailyForecastFromOpenMeteo(daily);

    expect(result).toHaveLength(7);
    expect(result[0].day).toBe('Wednesday');
    expect(result[6].day).toBe('Tuesday');
    expect(result[6].highTemp).toBe(63);
    expect(result[6].lowTemp).toBe(47);
  });
});
