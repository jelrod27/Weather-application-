import { fireEvent, render, screen } from '@testing-library/react';
import WarningDetailPage from '@/app/warnings/[id]/page';
import { fetchActiveAlertsDetail } from '@/lib/services/nws-alerts-service';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }), notFound: () => { throw new Error('not found'); } }));
jest.mock('@/components/page-wrapper', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/lib/supabase/service-role-client', () => ({ createServiceRoleSupabaseClient: () => null }));
jest.mock('@/lib/bitwatch/ingest', () => ({ loadCanonicalAlertBySlug: jest.fn() }));
jest.mock('@/lib/services/nws-alerts-service', () => ({ fetchActiveAlertsDetail: jest.fn() }));
jest.mock('@/components/warnings/warning-area-map', () => ({ __esModule: true, default: () => null }));

describe('Warning detail recovery', () => {
  it('distinguishes a failed warning load from an absent warning and retains recovery links', async () => {
    jest.mocked(fetchActiveAlertsDetail).mockRejectedValueOnce(new Error('offline'));
    render(await WarningDetailPage({ params: Promise.resolve({ id: 'test-alert' }), searchParams: Promise.resolve({ returnTo: '/warnings?state=TX' }) }));
    expect(screen.getByRole('alert')).toHaveTextContent('Warning information unavailable');
    expect(screen.getByRole('link', { name: 'Back to warning center' })).toHaveAttribute('href', '/warnings?state=TX');
    expect(screen.getByRole('link', { name: 'Official NWS alert' })).toHaveAttribute('href', 'https://api.weather.gov/alerts/test-alert');
    fireEvent.click(screen.getByRole('button', { name: 'Retry warning' }));
    expect(refresh).toHaveBeenCalled();
  });

  it('retains the selected official source and filters when a warning leaves the active feed', async () => {
    jest.mocked(fetchActiveAlertsDetail).mockResolvedValueOnce([]);
    render(await WarningDetailPage({ params: Promise.resolve({ id: 'test-alert' }), searchParams: Promise.resolve({ returnTo: '/warnings?state=TX&alert=test-alert' }) }));
    expect(screen.getByRole('status')).toHaveTextContent('Warning not in the active feed');
    expect(screen.getByRole('link', { name: 'Back to warning center' })).toHaveAttribute('href', '/warnings?state=TX&alert=test-alert');
    expect(screen.getByRole('link', { name: 'Official NWS alert' })).toHaveAttribute('href', 'https://api.weather.gov/alerts/test-alert');
  });
});
