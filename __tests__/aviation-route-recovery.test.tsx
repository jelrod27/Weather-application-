import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FlightRouteLookup from '@/components/aviation/FlightRouteLookup';
import { resolveRouteAirport } from '@/lib/aviation/route-airport';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

jest.mock('@/lib/fetch-with-timeout');
jest.mock('next/dynamic', () => () => jest.requireActual('@/components/aviation/FlightNumberInput').default);
jest.mock('@/hooks/useDemoMode', () => ({ useDemoMode: () => [false, jest.fn()] }));
const fetchMock = jest.mocked(fetchWithTimeout);
const pireps = [
  { id: 'near', latitude: 39, longitude: -112, altitudeFt: 30000, turbulenceIntensity: 'MOD', observationTime: '2026-09-25T12:00:00Z', rawText: 'Report along route' },
  { id: 'far', latitude: 26, longitude: -80, altitudeFt: 30000, turbulenceIntensity: 'MOD', observationTime: '2026-09-25T12:00:00Z', rawText: 'Unrelated Florida report' },
];
beforeEach(() => { jest.clearAllMocks(); fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { pireps } }) } as Response); });

describe('Aviation route recovery', () => {
  it.each([['sfo', 'DEN'], ['KSFO', 'KDEN']])('resolves manual %s → %s without a flight number', async (dep, arr) => {
    const onRouteSearch = jest.fn();
    render(<FlightRouteLookup onRouteSearch={onRouteSearch} />);
    fireEvent.change(screen.getByLabelText('Departure (IATA or ICAO)'), { target: { value: dep } });
    fireEvent.change(screen.getByLabelText('Arrival (IATA or ICAO)'), { target: { value: arr } });
    fireEvent.click(screen.getByTestId('search-route-button'));
    await waitFor(() => expect(onRouteSearch).toHaveBeenCalledWith('KSFO', 'KDEN'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('listitem')).toHaveTextContent('39.00N, 112.00W');
  });
  it('rejects equivalent endpoints and unknown airports before fetching', async () => {
    render(<FlightRouteLookup />);
    fireEvent.change(screen.getByTestId('departure-input'), { target: { value: 'SFO' } });
    fireEvent.change(screen.getByTestId('arrival-input'), { target: { value: 'KSFO' } });
    fireEvent.click(screen.getByTestId('search-route-button'));
    expect(screen.getByText(/airports must be different/)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('arrival-input'), { target: { value: 'ZZZZ' } });
    fireEvent.click(screen.getByTestId('search-route-button'));
    expect(screen.getByText(/Airport not found/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('only uses matching, valid coordinates supplied by a flight', () => {
    const flightAirport = { iata: 'ABC', icao: 'XABC', lat: 0, lon: 0 };
    expect(resolveRouteAirport('abc', flightAirport)).toEqual(flightAirport);
    expect(resolveRouteAirport('XYZ', flightAirport)).toBeNull();
    expect(resolveRouteAirport('ABC', { ...flightAirport, lat: NaN })).toBeNull();
  });
  it('ignores a pending flight-number result after the user submits a newer manual route', async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const onRouteSearch = jest.fn();
    render(<FlightRouteLookup onRouteSearch={onRouteSearch} />);
    fireEvent.change(screen.getByTestId('flight-number-input'), { target: { value: 'AA123' } });
    fireEvent.click(screen.getByTestId('flight-search-button'));
    const signal = fetchMock.mock.calls[0][1]?.signal;
    fireEvent.change(screen.getByTestId('departure-input'), { target: { value: 'SFO' } });
    fireEvent.change(screen.getByTestId('arrival-input'), { target: { value: 'DEN' } });
    fireEvent.click(screen.getByTestId('search-route-button'));
    await waitFor(() => expect(onRouteSearch).toHaveBeenCalledWith('KSFO', 'KDEN'));
    await act(async () => finish({ ok: true, json: async () => ({ success: true, data: {
      flightNumber: 'AA123', departure: { icao: 'KLAX', iata: 'LAX', city: 'Los Angeles', lat: 33.94, lon: -118.41 },
      arrival: { icao: 'KJFK', iata: 'JFK', city: 'New York', lat: 40.64, lon: -73.78 }, airline: { name: 'American' },
    } }) } as Response));
    expect(signal?.aborted).toBe(true);
    expect(screen.getByTestId('departure-input')).toHaveValue('SFO');
    expect(screen.getByTestId('arrival-input')).toHaveValue('DEN');
    expect(onRouteSearch).toHaveBeenCalledTimes(1);
  });
});
