/**
 * Unit tests for weather severity categorization.
 */

import { getPressureCategory } from '@/lib/weather-severity';

describe('getPressureCategory', () => {
  it('categorizes hPa values against hPa thresholds', () => {
    expect(getPressureCategory(1000).label).toBe('Low');
    expect(getPressureCategory('1000 hPa').label).toBe('Low');
    expect(getPressureCategory(1013).label).toBe('Normal');
    expect(getPressureCategory('1016 hPa').label).toBe('Normal');
    expect(getPressureCategory(1030).label).toBe('High');
    expect(getPressureCategory('1030 hPa').label).toBe('High');
  });

  // Regression: US/CA pressure strings are inHg ("29.92 in"). parseFloat
  // yielded ~30, which always fell below the 1009 hPa "Low" threshold, so
  // every imperial-format reading showed the "Low" badge.
  it('converts inHg-scale values before categorizing', () => {
    expect(getPressureCategory('29.92 in').label).toBe('Normal'); // ~1013 hPa
    expect(getPressureCategory('29.50 in').label).toBe('Low');    // ~999 hPa
    expect(getPressureCategory('30.50 in').label).toBe('High');   // ~1033 hPa
    expect(getPressureCategory(29.92).label).toBe('Normal');
  });

  it('returns Unknown for unparseable input', () => {
    expect(getPressureCategory('N/A').label).toBe('Unknown');
    expect(getPressureCategory(NaN).label).toBe('Unknown');
  });
});
