'use client';

import { useCallback, useEffect, useState } from 'react';
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

export function useSPCDay1Summary(): SPCDay1Summary {
  const [label, setLabel] = useState<string | null>(null);
  const [fill, setFill] = useState('#64748b');
  const [issue, setIssue] = useState<string | null>(null);
  const [riskCode, setRiskCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/weather/spc-outlook?day=1&type=cat');
      if (!res.ok) throw new Error('outlook');
      const data = (await res.json()) as OutlookApi;
      const risks = (data.features ?? [])
        .map((f) => f.properties)
        .filter((p) => p.LABEL in RISK_ORDER)
        .sort((a, b) => RISK_ORDER[a.LABEL] - RISK_ORDER[b.LABEL]);
      const highest = risks.at(-1);
      if (highest) {
        setRiskCode(highest.LABEL);
        setLabel(RISK_LABELS[highest.LABEL] ?? highest.LABEL2 ?? highest.LABEL);
        setFill((highest.fill as string) || '#f97316');
        setIssue((highest.ISSUE as string) || (highest.VALID as string) || null);
      } else {
        setRiskCode(null);
        setLabel(data.noRiskLabel ?? `No ${OUTLOOK_TYPE_LABELS.cat} risk in current outlook`);
        setFill('#22c55e');
        setIssue(null);
      }
    } catch {
      setRiskCode(null);
      setLabel('SPC outlook unavailable');
      setFill('#64748b');
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { label, fill, issue, riskCode, loading, refresh };
}
