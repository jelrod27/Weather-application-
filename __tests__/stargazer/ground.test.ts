/**
 * Tests for Stargazer ground-condition helpers
 */

import { dewpointSpread, getDewRisk } from '@/lib/stargazer/ground';

describe('dewpointSpread', () => {
  it('returns the difference between temperature and dewpoint', () => {
    expect(dewpointSpread(15, 10)).toBe(5);
  });

  it('can be zero when temperature equals dewpoint (saturated air)', () => {
    expect(dewpointSpread(8, 8)).toBe(0);
  });

  it('can be negative for supersaturated/edge inputs', () => {
    expect(dewpointSpread(4, 6)).toBe(-2);
  });
});

describe('getDewRisk', () => {
  it('flags high risk when the spread is under 2 degrees', () => {
    expect(getDewRisk(10, 9)).toBe('high');
    expect(getDewRisk(10, 10)).toBe('high');
  });

  it('flags moderate risk for a 2 to 5 degree spread', () => {
    expect(getDewRisk(12, 10)).toBe('moderate');
    expect(getDewRisk(14, 10)).toBe('moderate');
  });

  it('flags low risk for a spread of 5 degrees or more', () => {
    expect(getDewRisk(20, 10)).toBe('low');
    expect(getDewRisk(15, 10)).toBe('low');
  });
});
