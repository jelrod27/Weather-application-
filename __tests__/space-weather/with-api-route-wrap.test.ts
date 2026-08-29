/**
 * Pins every space-weather API route behind withApiRoute.
 * magnetometer and proton-flux go through swpcSeriesRoute, which wraps.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const SPACE_WEATHER_API = join(__dirname, '../../app/api/space-weather');

describe('space-weather routes use withApiRoute', () => {
  const routeFiles = readdirSync(SPACE_WEATHER_API, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(SPACE_WEATHER_API, entry.name, 'route.ts'));

  it('covers every space-weather route file', () => {
    expect(routeFiles.length).toBe(14);
  });

  it.each(routeFiles)('%s is wrapped', (file) => {
    const src = readFileSync(file, 'utf8');
    const wrappedDirectly = src.includes("from '@/lib/api/with-api-route'");
    const wrappedViaSeries = src.includes('swpcSeriesRoute');
    expect(wrappedDirectly || wrappedViaSeries).toBe(true);
  });
});
