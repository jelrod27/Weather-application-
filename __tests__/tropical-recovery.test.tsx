import { act, fireEvent, render, screen } from '@testing-library/react';
import TropicalGraphic from '@/components/tropical/tropical-graphic';
import { getGraphicUpdatedAt, TROPICAL_GRAPHICS } from '@/lib/tropical/graphics';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

jest.mock('@/lib/fetch-with-timeout');
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => jest.useRealTimers());

describe('Tropical image recovery', () => {
  it('shows source time distinctly from valid time, and recovers a failed image', () => {
    render(<TropicalGraphic graphic={TROPICAL_GRAPHICS[2]} updatedAt="2026-09-25T12:00:00Z" />);
    expect(screen.getByText(/Source file updated/)).toHaveTextContent('Fri, 25 Sep 2026 12:00:00 GMT');
    expect(screen.getByText(/Observation or forecast valid time/)).toBeInTheDocument();
    const src = screen.getByRole('img').getAttribute('src');
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /official NOAA/ })).toHaveAttribute('href', TROPICAL_GRAPHICS[2].link);
    fireEvent.click(screen.getByRole('button', { name: 'Retry image' }));
    expect(screen.getByRole('img').getAttribute('src')).not.toBe(src);
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
  it('offers recovery for an image that never loads without inventing an update time', () => {
    jest.useFakeTimers();
    render(<TropicalGraphic graphic={TROPICAL_GRAPHICS[3]} updatedAt={null} />);
    expect(screen.getByText(/Source update time unavailable/)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(15000));
    expect(screen.getByRole('button', { name: 'Retry image' })).toBeInTheDocument();
  });
  it('uses upstream modification time only when a successful response supplies a valid date', async () => {
    const fetchMock = jest.mocked(fetchWithTimeout);
    for (const [ok, header, expected] of [[true, 'Fri, 25 Sep 2026 12:00:00 GMT', '2026-09-25T12:00:00.000Z'], [true, 'invalid', null], [false, 'Fri, 25 Sep 2026 12:00:00 GMT', null]] as const) {
      fetchMock.mockResolvedValueOnce({ ok, headers: { get: () => header } } as unknown as Response);
      expect(await getGraphicUpdatedAt(TROPICAL_GRAPHICS[0].src)).toBe(expected);
    }
  });
});
