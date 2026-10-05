import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TurbulenceOutlook from '@/components/travel/turbulence/TurbulenceOutlook';
import type { TurbulenceData, TurbulencePolygon } from '@/lib/aviation/turbulence';

jest.mock('next/dynamic', () => () => function MapStub({ polygons }: { polygons: TurbulencePolygon[] }) {
  return <div data-testid="map-count">{polygons.length}</div>;
});
const now = Date.parse('2026-10-04T23:40:00Z');
const polygon: TurbulencePolygon = {
  id: 'area-1', coordinates: [[[-123, 38], [-122, 38], [-122, 39], [-123, 38]]],
  severity: 'moderate', rawSeverity: 'MOD', hazard: 'TURB-HI', forecastHour: 3,
  issuedAt: '2026-10-04T23:33:00Z', validFrom: '2026-10-05T00:00:00Z', validTo: '2026-10-05T03:00:00Z', baseFt: 24000, topFt: 35000,
};
const data: TurbulenceData = { polygons: [polygon], fetchedAt: '2026-10-04T23:40:00Z', source: 'NOAA AWC G-AIRMET',
  coverage: 'CONUS', status: 'available', rejectedRecords: 0, unavailableForecastHours: [] };
const fetchMock = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock; jest.spyOn(Date, 'now').mockReturnValue(now); });
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });
function respond(next: TurbulenceData): void { fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: next }) }); }

it('loads without trip details and keeps map/list altitude selections synchronized', async () => {
  respond(data); render(<TurbulenceOutlook />);
  await screen.findByRole('button', { name: 'Area 1 · MOD' });
  expect(screen.getByTestId('map-count')).toHaveTextContent('1');
  fireEvent.change(screen.getByLabelText('Altitude'), { target: { value: '5000' } });
  expect(screen.getByTestId('map-count')).toHaveTextContent('0');
  expect(screen.getByText(/No matching turbulence advisories/)).toBeVisible();
});
it('shows actual snapshot choices without generating missing time slots', async () => {
  respond({ ...data, polygons: [polygon, { ...polygon, id: 'area-2', forecastHour: 9, validFrom: '2026-10-05T06:00:00Z' }] });
  render(<TurbulenceOutlook />);
  const select = screen.getByLabelText('Advisory snapshot (UTC)');
  await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(2));
  fireEvent.change(select, { target: { value: '2026-10-05T06:00:00Z' } });
  expect(screen.getByText('Snapshot: Oct 5, 06:00 UTC')).toBeVisible();
});
it.each(['stale', 'expired'] as const)('hides %s data rather than showing reassuring empty conditions', async state => {
  respond(state === 'stale' ? { ...data, fetchedAt: '2026-10-04T22:00:00Z' }
    : { ...data, polygons: [{ ...polygon, validTo: '2026-10-04T23:00:00Z' }] });
  render(<TurbulenceOutlook />);
  await screen.findByText(/available data is stale or expired/);
  expect(screen.getByTestId('map-count')).toHaveTextContent('0');
  expect(screen.queryByText(/No matching turbulence advisories/)).not.toBeInTheDocument();
});
it('keeps partial data visible with a warning', async () => {
  respond({ ...data, status: 'partial', unavailableForecastHours: [12] }); render(<TurbulenceOutlook />);
  await screen.findByText(/Some advisory data is unavailable/);
  expect(screen.getByTestId('map-count')).toHaveTextContent('1');
});
it('does not present a partial empty result as healthy advisory absence', async () => {
  respond({ ...data, status: 'partial', polygons: [], unavailableForecastHours: [12] }); render(<TurbulenceOutlook />);
  await screen.findByText(/Some advisory data is unavailable/);
  expect(screen.queryByText(/No matching turbulence advisories/)).not.toBeInTheDocument();
});
it('offers recovery on failure and clears the unavailable map', async () => {
  fetchMock.mockRejectedValue(new Error('network'));
  render(<TurbulenceOutlook />);
  await screen.findByRole('alert');
  respond(data);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh advisories' }));
  await screen.findByRole('button', { name: 'Area 1 · MOD' });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
