import { getPollenColor } from '@/lib/air-quality-utils';
import { normalizePollenCategories } from '@/lib/pollen/normalize-pollen-categories';

describe('normalizePollenCategories', () => {
  it('fills empty tree and weed with None when grass has data', () => {
    const normalized = normalizePollenCategories(
      {},
      { Grasses: 'Very Low' },
      {},
    );

    expect(normalized.tree).toEqual({ Tree: 'None' });
    expect(normalized.grass).toEqual({ Grasses: 'Very Low' });
    expect(normalized.weed).toEqual({ Weed: 'None' });
  });

  it('preserves populated categories', () => {
    const normalized = normalizePollenCategories(
      { Oak: 'Low' },
      { Grass: 'Moderate' },
      { Ragweed: 'High' },
    );

    expect(normalized.tree).toEqual({ Oak: 'Low' });
    expect(normalized.grass).toEqual({ Grass: 'Moderate' });
    expect(normalized.weed).toEqual({ Ragweed: 'High' });
  });

  it('treats null or undefined maps as None', () => {
    const normalized = normalizePollenCategories(
      null as unknown as Record<string, string>,
      undefined as unknown as Record<string, string>,
      {},
    );

    expect(normalized.tree).toEqual({ Tree: 'None' });
    expect(normalized.grass).toEqual({ Grass: 'None' });
    expect(normalized.weed).toEqual({ Weed: 'None' });
  });
});

describe('getPollenColor', () => {
  it('maps None and Very Low to muted or green styles', () => {
    expect(getPollenColor('None')).toBe('text-gray-400 font-semibold');
    expect(getPollenColor('none')).toBe('text-gray-400 font-semibold');
    expect(getPollenColor('Very Low')).toBe('text-green-400 font-semibold');
    expect(getPollenColor('very low')).toBe('text-green-400 font-semibold');
  });

  it('maps unavailable and no data to muted gray', () => {
    expect(getPollenColor('Unavailable')).toBe('text-gray-400 font-semibold');
    expect(getPollenColor('No Data')).toBe('text-gray-400 font-semibold');
  });

  it('keeps existing severity colors', () => {
    expect(getPollenColor('Low')).toBe('text-green-400 font-semibold');
    expect(getPollenColor('Moderate')).toBe('text-yellow-400 font-semibold');
    expect(getPollenColor('High')).toBe('text-orange-400 font-semibold');
    expect(getPollenColor('Very High')).toBe('text-red-400 font-semibold');
  });
});
