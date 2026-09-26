import type { StargazerData } from '../../lib/stargazer/types';

/** Deterministic UI data, not a claim about the real sky on this date. */
export function beginnerStargazerFixture(now = Date.parse('2026-09-27T00:00:00Z')): StargazerData {
  const date = (hours: number): Date => new Date(now + hours * 3600000);
  return {
    score: { overall: null, label: 'Unavailable', color: '#9ca3af', summary: 'Seeing and transparency data unavailable.', subScores: null },
    bestWindow: null, nightAverage: null, limitingFactor: null,
    darkWindow: { status: 'normal', sunset: date(-1), sunrise: date(9), astronomicalDusk: date(0), astronomicalDawn: date(8) },
    moon: { phaseName: 'Waxing Crescent', phaseAngle: 45, illumination: 15, rise: null, set: null, moonUpDuringDarkWindowPercent: 20, darkWindowStart: date(0), darkWindowEnd: date(8), nextNewMoon: date(600), nextFullMoon: date(240) },
    hourlyConditions: [1, 2, 3].map(offset => ({ time: date(offset), cloudCover: 20, cloudCoverLow: 10, cloudCoverMid: 5, cloudCoverHigh: 5, seeing: null, transparency: null, windSpeed: 8, humidity: 50, temperature: 12, dewpoint: 2, dewRisk: 'low', precipitationProbability: 5, weatherCode: 2, hourlyScore: null })),
    planets: [], deepSkyHighlights: [], skyEvents: [], issPasses: [], launches: [], meteorShowers: [],
    location: { lat: 40.7128, lon: -74.006, displayName: 'New York', timezone: 'America/New_York' },
    weatherRetrievedAt: new Date(now).toISOString(), generatedAt: new Date(now).toISOString(),
    beginnerNight: { hours: [1, 2].map(offset => ({ start: date(offset).getTime(), end: date(offset + 1).getTime(), midpoint: date(offset + 0.5).getTime(),
      weather: { cloudLow: 10, cloudHigh: offset * 20, temperatureLow: 12, temperatureHigh: 14, wind: 8, precipitation: 5, issues: [] },
      targets: [{ id: 'Moon', altitude: 40 + offset * 5, azimuth: 90 + offset * 10, minAltitude: 30, magnitude: -10 }, { id: 'M31', altitude: 50 + offset * 5, azimuth: 75 + offset * 20, minAltitude: 35, magnitude: 3.4 }],
    })) },
  };
}
