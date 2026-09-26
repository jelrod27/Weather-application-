import { Body } from 'astronomy-engine';
import { bodyAltAz, calculateDarkWindow, catalogObjectAltAz } from '@/lib/stargazer/astronomy';
import { describeSkyPosition } from '@/lib/stargazer/direction';
import references from './fixtures/jpl-positions.json';
import catalogReference from './fixtures/catalog-position.json';

it.each(references)('matches recorded JPL refracted coordinates: $name', reference => {
  const body = reference.body === 'Moon' ? Body.Moon : Body.Saturn;
  const actual = bodyAltAz(body, reference.lat, reference.lon, new Date(reference.time));
  expect(Math.abs(actual.altitude - reference.altitude)).toBeLessThan(0.2);
  expect(Math.abs(actual.azimuth - reference.azimuth)).toBeLessThan(0.2);
});
it('keeps a far-southern catalog target below the horizon from London', () => {
  for (let hour = 0; hour < 24; hour += 3) {
    const position = catalogObjectAltAz(0.401, -72.08, 51.5, -0.12, new Date(Date.UTC(2026, 8, 27, hour)));
    expect(position.altitude).toBeLessThan(0);
    expect(position.azimuth).toBeGreaterThanOrEqual(0);
    expect(position.azimuth).toBeLessThan(360);
  }
});
it('describes true-north wrap, below-horizon and near-zenith positions clearly', () => {
  expect(describeSkyPosition({ azimuth: 359, altitude: 30 })).toContain('north');
  expect(describeSkyPosition({ azimuth: 90, altitude: 45 })).toContain('east');
  expect(describeSkyPosition({ azimuth: 260, altitude: 85 })).toBe('Nearly overhead.');
  expect(describeSkyPosition({ azimuth: 260, altitude: -1 })).toBe('Below the horizon at this time.');
});
it('advances to the upcoming night once astronomical dawn has passed', () => {
  const now = new Date('2026-09-27T10:30:00Z');
  const night = calculateDarkWindow(40.7128, -74.006, now);
  expect(night.astronomicalDusk.getTime()).toBeGreaterThan(now.getTime());
});

it('matches an independent catalog epoch reference from Astropy/ERFA', () => {
  const ref = catalogReference;
  const actual = catalogObjectAltAz(ref.ra, ref.dec, ref.lat, ref.lon, new Date(ref.time));
  expect(Math.abs(actual.altitude - ref.altitude)).toBeLessThan(0.03);
  expect(Math.abs(actual.azimuth - ref.azimuth)).toBeLessThan(0.03);
});
