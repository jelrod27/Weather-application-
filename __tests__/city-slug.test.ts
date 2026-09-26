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
    expect(slugToSearchTerm('kansas-city')).toBe('Kansas City');
    expect(slugToDisplayName('london-uk')).toBe('London Uk');
  });
  it.each([
    ['London, UK', 'London, GB'],
    ['London, United Kingdom', 'London, GB'],
    ['Paris, France', 'Paris, FR'],
    ['Tokyo, Japan', 'Tokyo, JP'],
    ['New York, NY', 'New York, NY'],
    ['Washington, D.C.', 'Washington, DC'],
    ['90210', '90210'],
  ])('preserves the geographic hint through routing: %s', (input, expected) => {
    expect(slugToSearchTerm(locationInputToSlug(input))).toBe(expected);
  });
  it.each([
    ['toronto-ontario-canada', 'Toronto, Ontario, Canada'],
    ['vancouver-bc-canada', 'Vancouver, BC, Canada'],
    ['sydney-new-south-wales-australia', 'Sydney, New South Wales, AU'],
    ['cape-town-south-africa', 'Cape Town, ZA'],
  ])('supports geographic hints in older shared route %s', (slug, expected) => {
    expect(slugToSearchTerm(slug)).toBe(expected);
  });
});
