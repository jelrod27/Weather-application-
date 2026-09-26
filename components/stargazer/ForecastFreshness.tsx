'use client';

import { useEffect, useState } from 'react';
import { getStargazerFreshness } from '@/lib/stargazer/freshness';
import { formatObservingTime } from '@/lib/stargazer/context';

interface ForecastFreshnessProps {
  retrievedAt?: string | null;
  receivedAt: number | null;
  timeZone?: string;
}

export default function ForecastFreshness({ retrievedAt, receivedAt, timeZone }: ForecastFreshnessProps): React.JSX.Element {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(interval); }, []);
  const status = getStargazerFreshness(retrievedAt, receivedAt, now);
  return <p className="text-xs text-muted-foreground" role="status">
    {status.time == null ? 'Forecast receipt time unavailable.' : `${status.source === 'provider' ? 'Forecast retrieved' : 'Page received forecast'} ${formatObservingTime(status.time, timeZone || 'UTC')}.`}
    {' '}Provider model issuance time unavailable. {status.stale && 'Refresh before choosing an observing hour.'}
  </p>;
}
