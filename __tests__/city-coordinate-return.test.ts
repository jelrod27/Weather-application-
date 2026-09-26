/** @jest-environment node */
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('Canonical city coordinate returns', () => {
  it.each(['new-york', 'New-York-NY'])('keeps the resolved location when redirecting %s', async (city) => {
    const response = await middleware(new NextRequest(`https://www.16bitweather.co/weather/${city}?location=40.7128%2C-74.006`));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://www.16bitweather.co/weather/new-york-ny?location=40.7128%2C-74.006');
  });
  it.each(['new-york-ny', 'unknown-city', 'london-uk'])('does not redirect canonical or uncatalogued route %s', async (city) => {
    const response = await middleware(new NextRequest(`https://www.16bitweather.co/weather/${city}`));
    expect(response.headers.get('location')).toBeNull();
  });
});
