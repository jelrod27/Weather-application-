import { scoreFlightBrief } from '@/lib/aviation/brief-score';
import { sampleGreatCircle, pointNearCorridor } from '@/lib/aviation/route-corridor';
import { buildWeatherDrivers } from '@/lib/aviation/weather-drivers';

describe('scoreFlightBrief', () => {
  it('returns low for VFR with no hazards', () => {
    const result = scoreFlightBrief({
      originCategory: 'VFR',
      destCategory: 'VFR',
      intersectingHazardCount: 0,
      hasSevereHazard: false,
    });
    expect(result.level).toBe('low');
  });

  it('returns elevated for LIFR + severe hazards', () => {
    const result = scoreFlightBrief({
      originCategory: 'LIFR',
      destCategory: 'IFR',
      intersectingHazardCount: 2,
      hasSevereHazard: true,
    });
    expect(result.level).toBe('elevated');
  });

  it('returns watch for MVFR at both ends', () => {
    const result = scoreFlightBrief({
      originCategory: 'MVFR',
      destCategory: 'MVFR',
      intersectingHazardCount: 0,
      hasSevereHazard: false,
    });
    expect(result.level).toBe('watch');
  });
});

describe('route corridor', () => {
  it('samples great circle and detects nearby points', () => {
    const corridor = sampleGreatCircle(
      { lat: 33.94, lon: -118.41 },
      { lat: 39.86, lon: -104.67 },
      10,
    );
    expect(corridor.length).toBe(10);
    expect(pointNearCorridor(corridor[4]!, corridor, 50)).toBe(true);
    expect(pointNearCorridor({ lat: 0, lon: 0 }, corridor, 50)).toBe(false);
  });
});

describe('weather drivers', () => {
  it('includes clear driver when nothing flagged', () => {
    const drivers = buildWeatherDrivers({
      originIata: 'LAX',
      destIata: 'DEN',
      originCategory: 'VFR',
      destCategory: 'VFR',
      hazards: [],
    });
    expect(drivers[0]!.id).toBe('clear');
  });
});
