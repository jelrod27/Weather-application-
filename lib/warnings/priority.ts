interface WarningImportance {
  event: string;
  severity: string;
  urgency: string;
}

const SEVERITY_ORDER: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };
const URGENCY_ORDER: Record<string, number> = { Immediate: 0, Expected: 1, Future: 2 };

function eventRank(event: string): number {
  const name = event.trim().toLowerCase();
  if (name === 'tornado warning') return 0;
  if (name === 'flash flood warning') return 1;
  if (name === 'severe thunderstorm warning') return 2;
  return 3;
}

/** Shared NWS tiers; callers choose their own time and location tie-breaks. */
export function compareWarningImportance(a: WarningImportance, b: WarningImportance): number {
  return eventRank(a.event) - eventRank(b.event) ||
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
    (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9);
}
