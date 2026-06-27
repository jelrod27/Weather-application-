import { getPrecipSeverity } from '@/lib/weather/precip-utils';

describe('getPrecipSeverity', () => {
  it('returns none tier below 20%', () => {
    expect(getPrecipSeverity(10).tier).toBe('none');
    expect(getPrecipSeverity(10).stripClass).toBe('');
  });

  it('escalates strip and wash with higher probability', () => {
    const light = getPrecipSeverity(25);
    const moderate = getPrecipSeverity(50);
    const heavy = getPrecipSeverity(80);

    expect(light.tier).toBe('light');
    expect(moderate.tier).toBe('moderate');
    expect(heavy.tier).toBe('heavy');
    expect(light.stripClass).toContain('h-px');
    expect(moderate.stripClass).toContain('h-0.5');
    expect(heavy.stripClass).toContain('h-1');
  });
});
