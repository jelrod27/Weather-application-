import {
  formatLocationTime,
  formatLocationTimeWithZone,
} from '@/lib/format-location-time';

describe('formatLocationTime', () => {
  // Fixed instant: 2025-08-09T19:27:00Z = 12:27 PM PDT / 8:27 PM WEST
  const instant = '2025-08-09T19:27:00.000Z';

  it('formats in the location timezone, not the viewer timezone', () => {
    expect(formatLocationTime(instant, 'America/Los_Angeles')).toBe('12:27 PM');
    expect(formatLocationTime(instant, 'Europe/Lisbon')).toBe('8:27 PM');
  });

  it('includes a short zone name when requested', () => {
    const label = formatLocationTimeWithZone(instant, 'America/Los_Angeles');
    expect(label).toMatch(/^12:27 PM/);
    expect(label).toMatch(/P[DS]T/);
  });

  it('falls back to viewer-local formatting when timezone is missing', () => {
    const label = formatLocationTime(instant, null);
    expect(label.length).toBeGreaterThan(0);
  });
});
