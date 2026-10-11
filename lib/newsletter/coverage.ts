import { z } from 'zod';

export const DAY_MS = 86_400_000;
const timestamp = z.string().datetime();
const intervalSchema = z.object({ start: timestamp, end: timestamp }).refine(
  value => value.start < value.end, 'Interval must have positive duration',
);
const sourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  retrievedAt: timestamp,
  requested: intervalSchema,
  covered: z.array(intervalSchema),
  status: z.enum(['complete', 'partial', 'unavailable', 'malformed', 'stale', 'unsupported']),
  usable: z.boolean(),
  records: z.number().int().nonnegative(),
  observationStart: timestamp.nullable(),
  observationEnd: timestamp.nullable(),
  expectedUnits: z.number().int().positive().optional(),
  observedUnits: z.number().int().nonnegative().optional(),
  unit: z.string().min(1),
  reasons: z.array(z.string().min(1)),
}).superRefine((source, ctx) => {
  const start = Date.parse(source.requested.start);
  const end = Date.parse(source.requested.end);
  const covered = [...source.covered].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  let through = start;
  for (const interval of covered) {
    if (Date.parse(interval.start) < start || Date.parse(interval.end) > end) {
      ctx.addIssue({ code: 'custom', message: 'Covered intervals must stay inside the requested window' });
    }
    if (Date.parse(interval.start) <= through) through = Math.max(through, Date.parse(interval.end));
  }
  if (source.status === 'complete' && (!source.usable || source.reasons.length || !source.covered.length ||
      through < end || (source.expectedUnits !== undefined && source.observedUnits !== source.expectedUnits))) {
    ctx.addIssue({ code: 'custom', message: 'Complete source must have usable, gap-free coverage' });
  }
  if (source.status !== 'complete' && !source.reasons.length) ctx.addIssue({ code: 'custom', message: 'Incomplete source must explain its gaps' });
});

export const coverageAuditSchema = z.object({
  version: z.literal(1),
  cadence: z.enum(['sunday_rearview', 'wednesday_topic']),
  generatedAt: timestamp,
  window: intervalSchema,
  sources: z.array(sourceSchema).min(1),
}).superRefine((audit, ctx) => {
  if (new Set(audit.sources.map(s => s.id)).size !== audit.sources.length) {
    ctx.addIssue({ code: 'custom', message: 'Source identifiers must be unique' });
  }
});

export interface ReportingWindow { start: string; end: string }
export type CoverageAudit = z.infer<typeof coverageAuditSchema>;
export type CoverageOutcome = 'complete' | 'partial' | 'fatal';

/** Seven completed SPC report days, each 12:00 UTC to the next 12:00 UTC. End exclusive. */
export function reportingWindow(now = new Date(), days = 7): ReportingWindow {
  const end = new Date(now);
  end.setUTCHours(12, 0, 0, 0);
  if (end > now) end.setUTCDate(end.getUTCDate() - 1);
  return { start: new Date(end.getTime() - days * DAY_MS).toISOString(), end: end.toISOString() };
}

export function coverageOutcome(audit: CoverageAudit): CoverageOutcome {
  if (!audit.sources.some(s => s.usable)) return 'fatal';
  return audit.sources.every(s => s.status === 'complete') ? 'complete' : 'partial';
}

/** Deterministic disclosure is retained verbatim through review and promotion. */
export function coverageDisclosure(audit: CoverageAudit): string {
  const lines = [
    '## Source coverage',
    '',
    `Reporting interval: ${audit.window.start} to ${audit.window.end} (end exclusive).`,
    'Counts and peaks describe only the observations and intervals listed below. Missing data is unknown, never zero. Forecasts are point forecasts for the named cities.',
    '',
  ];
  for (const source of audit.sources) {
    const bounds = source.observationStart ? ` Observations: ${source.observationStart} to ${source.observationEnd}.` : '';
    const units = source.expectedUnits ? ` ${source.observedUnits ?? 0}/${source.expectedUnits} ${source.unit}.` : '';
    lines.push(`- [${source.label}](${source.url}): **${source.status}**.${units}${bounds} Requested: ${source.requested.start} to ${source.requested.end}. Checked: ${source.retrievedAt}.${source.reasons.length ? ` ${source.reasons.join('; ')}.` : ''}`);
  }
  return lines.join('\n');
}
