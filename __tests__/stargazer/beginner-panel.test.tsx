import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BeginnerPanel from '@/components/stargazer/BeginnerPanel';
import { readStargazerContext } from '@/lib/stargazer/context';
import type { StargazerData } from '@/lib/stargazer/types';
import type { StargazerContext } from '@/lib/stargazer/context';
import { stargazerE2eFixture } from '@/tests/fixtures/stargazer-e2e-fixture';

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ preferences: { temperature_unit: 'celsius', wind_unit: 'kmh' } }) }));
const now = Date.parse('2026-09-27T00:00:00Z');
const hour = (offset: number, id: string) => ({ start: now + offset * 3600000, end: now + (offset + 1) * 3600000, midpoint: now + offset * 3600000 + 1800000,
  weather: { cloudLow: 10, cloudHigh: 20, temperatureLow: 12, temperatureHigh: 14, wind: 8, precipitation: 5, issues: [] },
  targets: [{ id, altitude: 40 + offset, azimuth: 90, minAltitude: 30, magnitude: 0 }] });
const data = { ...stargazerE2eFixture(), location: { lat: 40.7, lon: -74, timezone: 'America/New_York', displayName: 'New York' }, beginnerNight: { hours: [hour(1, 'Moon'), hour(2, 'M31')] }, weatherRetrievedAt: null } as unknown as StargazerData;
function Harness({ value = data, at = null, clock = now, receivedAt = now }: { value?: StargazerData; at?: number | null; clock?: number; receivedAt?: number }): React.JSX.Element {
  const [context, setContext] = useState<StargazerContext>({ ...readStargazerContext(new URLSearchParams('lat=40.7&lon=-74&q=New+York&tz=America%2FNew_York')), at });
  return <BeginnerPanel onTabChange={jest.fn()} data={value} context={context} now={clock} receivedAt={receivedAt} onContextChange={change => setContext(current => ({ ...current, ...change }))} />;
}
it('shows a suggested hour, real weather tradeoffs and realistic target expectations', () => {
  render(<Harness />);
  expect(screen.getByRole('heading', { name: 'Try this hour' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Moon' })).toBeInTheDocument();
  expect(screen.getByText('12°C – 14°C')).toBeInTheDocument();
  expect(screen.getByText(/True north/i)).toBeInTheDocument();
});
it('changes target eligibility and guide context when equipment and hour change', () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Observing hour'), { target: { value: String(now + 2 * 3600000) } });
  expect(screen.queryByRole('heading', { name: 'Andromeda Galaxy' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Binoculars' }));
  expect(screen.getByRole('heading', { name: 'Andromeda Galaxy' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Finding guide/ }).getAttribute('href')).toContain('equipment=binoculars');
  expect(screen.getByRole('link', { name: /Finding guide/ }).getAttribute('href')).toContain('at=2026-09-27T02');
});
it('replaces expired shared hours with a visible explanation', () => {
  render(<Harness at={now - 3600000} />);
  expect(screen.getByText(/shared hour.*replaced/i)).toBeInTheDocument();
});
it('withholds affirmative suggestions for stale forecasts and keeps reference learning available', () => {
  render(<Harness receivedAt={now - 31 * 60000} />);
  expect(screen.getByRole('heading', { name: /Refresh to plan/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Try this hour' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Browse.*catalog/ })).toBeInTheDocument();
});
it('explains weather limitations without hiding calculated positions', () => {
  const overcast: StargazerData = { ...data, beginnerNight: { hours: data.beginnerNight!.hours.map(value => ({ ...value, weather: { ...value.weather, cloudHigh: 100, issues: ['clouds'] } })) } };
  render(<Harness value={overcast} />);
  expect(screen.getByText(/Cloud cover reaches our 75% cutoff/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Try this hour' })).not.toBeInTheDocument();
  expect(screen.getByText(/A target to try if skies clear/)).toBeInTheDocument();
});

it('does not claim a replacement when no future hour exists', () => {
  render(<Harness at={now - 3600000} value={{ ...data, beginnerNight: { hours: [] } }} />);
  expect(screen.queryByText(/has been replaced/)).not.toBeInTheDocument();
  expect(screen.getByText(/No replacement is available/)).toBeInTheDocument();
});
