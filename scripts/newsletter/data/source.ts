import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import type { ReportingWindow, CoverageAudit } from '@/lib/newsletter/coverage';

export type SourceAudit = CoverageAudit['sources'][number];

export interface Collected<T> { data: T | null; sources: SourceAudit[] }
interface SourceResult<T> { data: T | null; audit: SourceAudit }

export function inWindow(time: number, window: ReportingWindow): boolean {
  return Number.isFinite(time) && time >= Date.parse(window.start) && time < Date.parse(window.end);
}

export interface ParsedSource<T> {
  data: T | null;
  records: number;
  times: string[];
  covered: ReportingWindow[];
  reasons: string[];
  status?: SourceAudit['status'];
  expectedUnits?: number;
  observedUnits?: number;
  snapshot?: string;
}

export interface SourceRequest {
  id: string;
  label: string;
  url: string;
  requested: ReportingWindow;
  unit: string;
}

/** Fetch failures retain the source identity and requested interval; they never create observations. */
export async function collectSource<T>(
  source: SourceRequest,
  parse: (raw: unknown) => ParsedSource<T>,
  text = false,
  options: { maxRetries?: number; timeoutMs?: number } = {},
): Promise<SourceResult<T>> {
  const base = {
    ...source, retrievedAt: new Date().toISOString(), covered: [], records: 0,
    observationStart: null, observationEnd: null,
  };
  try {
    const response = await fetchWithTimeout(source.url, {
      timeoutMs: 20_000,
      maxRetries: 0,
      ...options,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 16bitweather-newsletter/1.0; +https://16bitweather.co)' },
    });
    base.retrievedAt = new Date().toISOString();
    if (!response.ok) return { data: null, audit: { ...base, usable: false, status: 'unavailable', reasons: [`HTTP ${response.status}`] } };
    const result = parse(text ? await response.text() : await response.json());
    const times = [...result.times].sort();
    return {
      data: result.data,
      audit: {
        ...base, covered: mergeIntervals(result.covered), records: result.records,
        observationStart: times[0] ?? null, observationEnd: times.at(-1) ?? null,
        usable: result.data !== null,
        status: result.status ?? (result.reasons.length ? 'partial' : 'complete'),
        reasons: result.reasons, expectedUnits: result.expectedUnits, observedUnits: result.observedUnits,
        snapshot: result.snapshot,
      },
    };
  } catch (error) {
    // Do not persist arbitrary error messages, request headers, or credentials.
    const malformed = error instanceof SyntaxError;
    return { data: null, audit: { ...base, usable: false, status: malformed ? 'malformed' : 'unavailable', reasons: [malformed ? 'Response schema or values could not be validated' : requestFailureReason(error)] } };
  }
}

function requestFailureReason(error: unknown): string {
  if (!(error instanceof Error)) return 'Request failed';
  const cause = error.cause;
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
  if (error.name === 'TimeoutError' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'ETIMEDOUT') return 'Connection timed out';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'DNS lookup failed';
  if (error.name === 'AbortError') return 'Request aborted';
  return 'Request failed or timed out';
}

function mergeIntervals(intervals: ReportingWindow[]): ReportingWindow[] {
  const result: ReportingWindow[] = [];
  for (const interval of [...intervals].sort((a, b) => a.start.localeCompare(b.start))) {
    const prior = result.at(-1);
    if (prior && interval.start <= prior.end) prior.end = prior.end > interval.end ? prior.end : interval.end;
    else result.push({ ...interval });
  }
  return result;
}

export function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SyntaxError('Expected object');
  return value as Record<string, unknown>;
}

export function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
