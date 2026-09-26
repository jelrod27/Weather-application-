import CityWeatherPage from '@/app/weather/[city]/page';
import { permanentRedirect } from 'next/navigation';

jest.mock('next/navigation', () => ({ permanentRedirect: jest.fn((href: string) => { throw new Error(href); }) }));

describe('Canonical city coordinate returns', () => {
  it.each(['new-york', 'New-York-NY'])('keeps the resolved location when redirecting %s', async (city) => {
    await expect(CityWeatherPage({ params: Promise.resolve({ city }), searchParams: Promise.resolve({ location: '40.7128,-74.006' }) })).rejects.toThrow('/weather/new-york-ny?location=40.7128%2C-74.006');
    expect(permanentRedirect).toHaveBeenCalledWith('/weather/new-york-ny?location=40.7128%2C-74.006');
  });
});
