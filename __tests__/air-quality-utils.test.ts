import { getAQIDescription } from '@/lib/air-quality-utils';

describe('getAQIDescription', () => {
  it('maps EPA US AQI breakpoints to category labels', () => {
    expect(getAQIDescription(0)).toBe('Good');
    expect(getAQIDescription(50)).toBe('Good');
    expect(getAQIDescription(51)).toBe('Moderate');
    expect(getAQIDescription(100)).toBe('Moderate');
    expect(getAQIDescription(101)).toBe('Unhealthy for Sensitive Groups');
    expect(getAQIDescription(151)).toBe('Unhealthy');
    expect(getAQIDescription(201)).toBe('Very Unhealthy');
    expect(getAQIDescription(301)).toBe('Hazardous');
  });
});
