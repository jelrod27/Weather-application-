'use client';

import { useCallback } from 'react';
import { useRemoteData } from '@/hooks/useRemoteData';
import {
  OUTLOOK_TYPE_LABELS,
  RISK_LABELS,
  RISK_ORDER,
  type SPCOutlookGeoJSON,
} from '@/lib/services/spc-outlook-service';

type OutlookApi = SPCOutlookGeoJSON & { noRiskLabel?: string | null };

export interface SPCDay1Summary {
  label: string | null;
  fill: string;
  issue: string | null;
  riskCode: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

interface Day1Risk {
  riskCode: string | null;
  label: string;
  fill: string;
  issue: string | null;
}

const UNAVAILABLE: Day1Risk = {
  riskCode: null,
  label: 'SPC outlook unavailable',
  fill: '#64748b',
  issue: null,
};

const POLL_MS = 10 * 60 * 1000;

/**
 * Highest categorical risk in the SPC Day 1 outlook.
 *
 * The fetch, its 10-minute poll and the cancellation it previously lacked come
 * from useRemoteData; this hook is now just the transform from outlook features
 * to the badge fields.
 */
export function useSPCDay1Summary(): SPCDay1Summary {
  const { data, error, isLoading, refresh } = useRemoteData<Day1Risk>({
    key: 'spc-day1-cat',
    refreshMs: POLL_MS,
    keepPreviousData: true,
    fetcher: async (signal) => {
      const res = await fetch('/api/weather/spc-outlook?day=1&type=cat', { signal });
      if (!res.ok) throw new Error('outlook');
      return toDay1Risk((await res.json()) as OutlookApi);
    },
  });

  const asyncRefresh = useCallback(async () => {
    refresh();
  }, [refresh]);

  const summary = error ? UNAVAILABLE : data;

  return {
    label: summary?.label ?? null,
    fill: summary?.fill ?? '#64748b',
    issue: summary?.issue ?? null,
    riskCode: summary?.riskCode ?? null,
    loading: isLoading,
    refresh: asyncRefresh,
  };
}

export function toDay1Risk(data: OutlookApi): Day1Risk {
  const risks = (data.features ?? [])
    .map((f) => f.properties)
    .filter((p) => p.LABEL in RISK_ORDER)
    .sort((a, b) => RISK_ORDER[a.LABEL] - RISK_ORDER[b.LABEL]);

  const highest = risks.at(-1);
  if (!highest) {
    return {
      riskCode: null,
      label: data.noRiskLabel ?? `No ${OUTLOOK_TYPE_LABELS.cat} risk in current outlook`,
      fill: '#22c55e',
      issue: null,
    };
  }

  return {
    riskCode: highest.LABEL,
    label: RISK_LABELS[highest.LABEL] ?? highest.LABEL2 ?? highest.LABEL,
    fill: (highest.fill as string) || '#f97316',
    issue: (highest.ISSUE as string) || (highest.VALID as string) || null,
  };
}
