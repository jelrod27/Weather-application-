import { render, screen } from '@testing-library/react';
import TonightVisibility from '@/components/stargazer/TonightVisibility';
import { formatObservingTime, getStargazerHref, readStargazerContext } from '@/lib/stargazer/context';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));

it('asks a direct guide visitor to choose a place instead of using New York', () => {
  window.history.replaceState(null, '', '/stargazer/objects/M31');
  render(<TonightVisibility ra={0.712} dec={41.27} objectName="Andromeda" />);
  expect(screen.getByRole('link', { name: /choose.*location/i })).toHaveAttribute('href', expect.stringContaining('/stargazer'));
  expect(screen.queryByText(/above horizon/i)).not.toBeInTheDocument();
});

it('retains only supported context through an object guide and back', () => {
  const context = readStargazerContext(new URLSearchParams('lat=-33.87&lon=151.21&q=Sydney&tz=Australia%2FSydney&at=2026-09-27T10%3A00%3A00Z&equipment=binoculars&from=start&returnTo=https%3A%2F%2Fevil.example'));
  const href = getStargazerHref(context, { objectId: 'M31' });
  const url = new URL(href, 'https://www.16bitweather.co');
  expect(url.pathname).toBe('/stargazer/objects/M31');
  expect(url.searchParams.get('at')).toBe('2026-09-27T10:00:00.000Z');
  expect(url.searchParams.has('returnTo')).toBe(false);
  const back = getStargazerHref(readStargazerContext(url.searchParams), { tab: 'start' });
  expect(back).toContain('lat=-33.87&lon=151.21');
  expect(back).toContain('equipment=binoculars');
  expect(back).toMatch(/#start$/);
});

it('distinguishes repeated clock hours with their UTC offsets', () => {
  expect(formatObservingTime(Date.parse('2026-11-01T05:30:00Z'), 'America/New_York')).toContain('GMT-4');
  expect(formatObservingTime(Date.parse('2026-11-01T06:30:00Z'), 'America/New_York')).toContain('GMT-5');
});

it('rejects impossible dates and preserves a real leap day', () => {
  expect(readStargazerContext(new URLSearchParams('at=2026-02-30T10:00:00Z')).at).toBeNull();
  expect(readStargazerContext(new URLSearchParams('at=2028-02-29T10:00:00Z')).at).toBe(Date.parse('2028-02-29T10:00:00Z'));
});
