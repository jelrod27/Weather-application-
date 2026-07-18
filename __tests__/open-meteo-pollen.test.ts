import { grainsToCategory, mapOpenMeteoPollenHourly } from '@/lib/pollen/open-meteo-pollen';

describe('grainsToCategory', () => {
  it('maps null to Unavailable', () => {
    expect(grainsToCategory(null)).toBe('Unavailable');
  });

  it('maps concentration bands', () => {
    expect(grainsToCategory(0)).toBe('None');
    expect(grainsToCategory(10)).toBe('Low');
    expect(grainsToCategory(30)).toBe('Moderate');
    expect(grainsToCategory(75)).toBe('High');
    expect(grainsToCategory(120)).toBe('Very High');
  });
});

describe('mapOpenMeteoPollenHourly', () => {
  it('maps European CAMS hourly pollen into tree/grass/weed', () => {
    const mapped = mapOpenMeteoPollenHourly({
      time: ['2026-07-17T12:00', '2026-07-17T13:00'],
      birch_pollen: [5, 40],
      grass_pollen: [0, 12],
      ragweed_pollen: [null, 60],
    });

    expect(mapped.source).toBe('open-meteo');
    expect(mapped.tree.Birch).toMatch(/Low|Moderate|High|Very High|None/);
    expect(mapped.grass.Grass).toBeDefined();
  });

  it('returns unavailable when all pollen values are null', () => {
    const mapped = mapOpenMeteoPollenHourly({
      time: ['2026-07-17T12:00'],
      birch_pollen: [null],
      grass_pollen: [null],
    });
    expect(mapped.source).toBe('unavailable');
    expect(mapped.tree.Tree).toBe('Unavailable');
  });

  it('selects the hour using utc_offset_seconds (location-local timestamps)', () => {
    jest.useFakeTimers();
    // 18:30 UTC → 13:30 CDT (utc_offset_seconds = -18000)
    jest.setSystemTime(new Date('2026-07-17T18:30:00.000Z'));

    const mapped = mapOpenMeteoPollenHourly(
      {
        time: ['2026-07-17T12:00', '2026-07-17T13:00', '2026-07-17T14:00'],
        birch_pollen: [5, 40, 90],
        grass_pollen: [1, 2, 3],
      },
      -18000,
    );

    expect(mapped.source).toBe('open-meteo');
    expect(mapped.tree.Birch).toBe('Moderate'); // 40 at local 13:00
    expect(mapped.grass.Grass).toBe('Low');

    jest.useRealTimers();
  });
});
