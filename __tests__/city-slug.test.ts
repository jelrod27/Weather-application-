import {
  locationInputToSlug,
  slugToDisplayName,
  slugToSearchTerm,
} from '@/lib/city-slug';

describe('city-slug', () => {
  it('normalizes location input to slugs', () => {
    expect(locationInputToSlug('New York, NY')).toBe('new-york-ny');
    expect(locationInputToSlug('  Houston, TX ')).toBe('houston-tx');
  });

  it('builds search terms from slugs', () => {
    expect(slugToSearchTerm('denver-co')).toBe('Denver, CO');
    expect(slugToDisplayName('london-uk')).toBe('London Uk');
  });
});
