import {
  resolveAutoLocation,
  resolveUnitSystem,
  temperatureUnitFromUnitSystem,
  unitSystemFromTemperatureUnit,
} from '@/lib/preferences/resolve';

describe('preference resolve helpers', () => {
  it('maps temperature units to unit systems', () => {
    expect(unitSystemFromTemperatureUnit('celsius')).toBe('metric');
    expect(unitSystemFromTemperatureUnit('fahrenheit')).toBe('imperial');
    expect(temperatureUnitFromUnitSystem('metric')).toBe('celsius');
    expect(temperatureUnitFromUnitSystem('imperial')).toBe('fahrenheit');
  });

  it('prefers server auto_location over local mirror', () => {
    expect(resolveAutoLocation({ auto_location: false }, true)).toBe(false);
    expect(resolveAutoLocation({ auto_location: true }, false)).toBe(true);
  });

  it('falls back to local then default true for auto_location', () => {
    expect(resolveAutoLocation(null, false)).toBe(false);
    expect(resolveAutoLocation(undefined, undefined)).toBe(true);
  });

  it('prefers server temperature_unit for unit system', () => {
    expect(resolveUnitSystem({ temperature_unit: 'celsius' }, 'imperial')).toBe('metric');
    expect(resolveUnitSystem({ temperature_unit: 'fahrenheit' }, 'metric')).toBe('imperial');
    expect(resolveUnitSystem(null, 'metric')).toBe('metric');
    expect(resolveUnitSystem(undefined, undefined)).toBe('imperial');
  });
});
