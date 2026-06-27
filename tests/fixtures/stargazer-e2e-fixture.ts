/** Minimal valid /api/stargazer payload for Playwright smoke tests. */
export function stargazerE2eFixture() {
  const dusk = '2026-06-27T01:00:00.000Z';
  const dawn = '2026-06-27T09:00:00.000Z';
  const sunset = '2026-06-27T00:30:00.000Z';
  const sunrise = '2026-06-27T09:30:00.000Z';

  return {
    score: {
      overall: 72,
      label: 'Good',
      color: '#4ade80',
      summary: 'Partly cloudy with fair seeing tonight',
      subScores: { cloud: 70, moon: 80, seeing: 65, transparency: 75, ground: 70 },
    },
    bestWindow: null,
    nightAverage: 72,
    limitingFactor: null,
    darkWindow: {
      astronomicalDusk: dusk,
      astronomicalDawn: dawn,
      sunset,
      sunrise,
    },
    hourlyConditions: [],
    moon: {
      phaseName: 'Waning Crescent',
      phaseAngle: 45,
      illumination: 25,
      rise: null,
      set: null,
      moonUpDuringDarkWindowPercent: 10,
      darkWindowStart: dusk,
      darkWindowEnd: dawn,
      nextNewMoon: '2026-07-06T12:00:00.000Z',
      nextFullMoon: '2026-07-20T12:00:00.000Z',
    },
    planets: [],
    deepSkyHighlights: [],
    skyEvents: [],
    issPasses: [],
    launches: [],
    meteorShowers: [],
    location: {
      lat: 40.7128,
      lon: -74.006,
      displayName: 'New York, NY',
    },
    generatedAt: '2026-06-27T02:00:00.000Z',
  };
}
