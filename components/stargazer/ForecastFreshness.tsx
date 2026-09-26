'use client';

import { getStargazerFreshness } from '@/lib/stargazer/freshness';
import { formatObservingTime } from '@/lib/stargazer/context';

interface ForecastFreshnessProps {
  retrievedAt?: string | null;
  receivedAt: number | null;
  now: number;
  timeZone?: string;
}

export default function ForecastFreshness({ retrievedAt, receivedAt, timeZone, now }: ForecastFreshnessProps): React.JSX.Element {
  const status = getStargazerFreshness(retrievedAt, receivedAt, now);
  return <p className="text-xs text-muted-foreground" role="status">
    {status.time == null ? 'Forecast receipt time unavailable.' : `${status.source === 'provider' ? 'Forecast retrieved' : 'Page received forecast'} ${formatObservingTime(status.time, timeZone || 'UTC')}.`}
    {' '}Provider model issuance time unavailable. {status.stale && 'Refresh before choosing an observing hour.'}
  </p>;
}
