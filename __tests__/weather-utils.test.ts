/**
 * Unit tests for weather utility functions
 */

import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatTemperature,
  getCompassDirection,
  getWindDirection,
  formatTime,
  calculateDewPoint,
  getUVDescription,
  mapWeatherCondition,
  normalizeInput,
  shouldUseMetricUnits,
  isUSALocation,
} from '@/lib/weather/weather-utils';

describe('Temperature Conversions', () => {
  describe('celsiusToFahrenheit', () => {
    it('should convert 0°C to 32°F', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
    });

    it('should convert 100°C to 212°F', () => {
      expect(celsiusToFahrenheit(100)).toBe(212);
    });

    it('should convert -40°C to -40°F', () => {
      expect(celsiusToFahrenheit(-40)).toBe(-40);
    });

    it('should convert 20°C to 68°F', () => {
      expect(celsiusToFahrenheit(20)).toBe(68);
    });
  });

  describe('fahrenheitToCelsius', () => {
    it('should convert 32°F to 0°C', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
    });

    it('should convert 212°F to 100°C', () => {
      expect(fahrenheitToCelsius(212)).toBe(100);
    });

    it('should convert -40°F to -40°C', () => {
      expect(fahrenheitToCelsius(-40)).toBe(-40);
    });
  });

  describe('formatTemperature', () => {
    it('should format temperature for US locations in Fahrenheit', () => {
      const result = formatTemperature(20, 'US');
      expect(result.unit).toBe('°F');
    });

    it('should format temperature for non-US locations in Celsius', () => {
      const result = formatTemperature(20, 'GB');
      expect(result.unit).toBe('°C');
    });

    it('should convert Fahrenheit to Celsius for non-US locations', () => {
      // formatTemperature expects input in Fahrenheit
      // 68°F = 20°C
      const result = formatTemperature(68, 'GB');
      expect(result.value).toBe(20);
    });

    it('should honor metric unitSystem without conversion', () => {
      const result = formatTemperature(20, 'GB', 'metric');
      expect(result.value).toBe(20);
      expect(result.unit).toBe('°C');
    });

    it('should honor imperial unitSystem even for non-US', () => {
      const result = formatTemperature(72, 'GB', 'imperial');
      expect(result.value).toBe(72);
      expect(result.unit).toBe('°F');
    });
  });
});

describe('Wind Direction', () => {
  describe('getCompassDirection', () => {
    it('should return N for 0 degrees', () => {
      expect(getCompassDirection(0)).toBe('N');
    });

    it('should return E for 90 degrees', () => {
      expect(getCompassDirection(90)).toBe('E');
    });

    it('should return S for 180 degrees', () => {
      expect(getCompassDirection(180)).toBe('S');
    });

    it('should return W for 270 degrees', () => {
      expect(getCompassDirection(270)).toBe('W');
    });

    it('should return NE for 45 degrees', () => {
      expect(getCompassDirection(45)).toBe('NE');
    });

    it('should return N for 360 degrees', () => {
      expect(getCompassDirection(360)).toBe('N');
    });
  });

  describe('getWindDirection', () => {
    it('should return wind direction with degree symbol', () => {
      const result = getWindDirection(90);
      expect(result).toContain('E');
    });
  });
});

describe('UV Index', () => {
  describe('getUVDescription', () => {
    it('should return Low for UV index 0-2', () => {
      expect(getUVDescription(0)).toBe('Low');
      expect(getUVDescription(1)).toBe('Low');
      expect(getUVDescription(2)).toBe('Low');
    });

    it('should return Moderate for UV index 3-5', () => {
      expect(getUVDescription(3)).toBe('Moderate');
      expect(getUVDescription(4)).toBe('Moderate');
      expect(getUVDescription(5)).toBe('Moderate');
    });

    it('should return High for UV index 6-7', () => {
      expect(getUVDescription(6)).toBe('High');
      expect(getUVDescription(7)).toBe('High');
    });

    it('should return Very High for UV index 8-10', () => {
      expect(getUVDescription(8)).toBe('Very High');
      expect(getUVDescription(9)).toBe('Very High');
      expect(getUVDescription(10)).toBe('Very High');
    });

    it('should return Extreme for UV index 11+', () => {
      expect(getUVDescription(11)).toBe('Extreme');
      expect(getUVDescription(15)).toBe('Extreme');
    });
  });
});

describe('Weather Condition Mapping', () => {
  describe('mapWeatherCondition', () => {
    it('should map Clear to sunny', () => {
      expect(mapWeatherCondition('Clear')).toBe('sunny');
    });

    it('should map Clouds to cloudy', () => {
      expect(mapWeatherCondition('Clouds')).toBe('cloudy');
    });

    it('should map Rain to rainy', () => {
      expect(mapWeatherCondition('Rain')).toBe('rainy');
    });

    it('should map unknown conditions to sunny as default', () => {
      expect(mapWeatherCondition('Unknown')).toBe('sunny');
    });
  });
});

describe('Input Normalization', () => {
  describe('normalizeInput', () => {
    it('should trim whitespace', () => {
      expect(normalizeInput('  New York  ')).toBe('New York');
    });

    it('should handle empty strings', () => {
      expect(normalizeInput('')).toBe('');
    });
  });
});

describe('Location Detection', () => {
  describe('isUSALocation', () => {
    it('should return true for US country code', () => {
      expect(isUSALocation('US')).toBe(true);
    });

    it('should return true for USA country code', () => {
      expect(isUSALocation('USA')).toBe(true);
    });

    it('should return false for other country codes', () => {
      expect(isUSALocation('GB')).toBe(false);
      expect(isUSALocation('DE')).toBe(false);
      expect(isUSALocation('FR')).toBe(false);
    });
  });

  describe('shouldUseMetricUnits', () => {
    it('should return false for US locations', () => {
      expect(shouldUseMetricUnits('US')).toBe(false);
    });

    it('should return true for non-US locations', () => {
      expect(shouldUseMetricUnits('GB')).toBe(true);
      expect(shouldUseMetricUnits('DE')).toBe(true);
    });
  });
});

describe('Dew Point Calculation', () => {
  describe('calculateDewPoint', () => {
    it('should calculate dew point correctly (Fahrenheit input)', () => {
      // At 68°F (20°C) and 50% humidity, dew point should be around 48°F (9°C)
      const dewPoint = calculateDewPoint(68, 50);
      expect(dewPoint).toBeGreaterThan(45);
      expect(dewPoint).toBeLessThan(52);
    });

    it('should return temperature when humidity is 100%', () => {
      // At 100% humidity, dew point equals air temperature
      const dewPoint = calculateDewPoint(68, 100);
      expect(dewPoint).toBe(68);
    });
  });
});

describe('Time Formatting', () => {
  describe('formatTime', () => {
    it('should format unix timestamp to time string', () => {
      // Test with a known timestamp (Jan 1, 2024 12:00:00 UTC)
      const timestamp = 1704110400;
      const result = formatTime(timestamp, 0);
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
  });
});
