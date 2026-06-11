import { formatHeaderLocation } from '@/lib/format-header-location';

describe('formatHeaderLocation', () => {
  it('3-part: full state name is abbreviated', () => {
    expect(formatHeaderLocation('San Ramon, California, US')).toBe('San Ramon, CA');
  });

  it('3-part: already-abbreviated state passes through', () => {
    expect(formatHeaderLocation('Dublin, CA, US')).toBe('Dublin, CA');
  });

  it('3-part: another full state name', () => {
    expect(formatHeaderLocation('Austin, Texas, US')).toBe('Austin, TX');
  });

  it('3-part: unknown region passes through as-is', () => {
    expect(formatHeaderLocation('Paris, Île-de-France, FR')).toBe('Paris, Île-de-France');
  });

  it('2-part US: city in map returns city + state', () => {
    expect(formatHeaderLocation('Chicago, US')).toBe('Chicago, IL');
  });

  it('2-part US: city NOT in map returns bare city', () => {
    expect(formatHeaderLocation('Tulsa, US')).toBe('Tulsa');
  });

  it('2-part non-US: returns bare city', () => {
    expect(formatHeaderLocation('London, GB')).toBe('London');
  });

  it('single part: returned as-is', () => {
    expect(formatHeaderLocation('Tokyo')).toBe('Tokyo');
  });

  it('empty string: returned as-is', () => {
    expect(formatHeaderLocation('')).toBe('');
  });
});
