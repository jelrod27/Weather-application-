/** @jest-environment node */
import { sundaySourceErrors } from '../../scripts/newsletter/source-quality';
import { readySundayEvidence } from '../fixtures/newsletter/sunday-ready';
import type { CoverageAudit } from '@/lib/newsletter/coverage';

const window = { start: '2026-11-08T12:00:00.000Z', end: '2026-11-15T12:00:00.000Z' };
const base: CoverageAudit = { version: 1, cadence: 'sunday_rearview', generatedAt: '2026-11-16T01:00:00.000Z', window, sources: [] };

it('requires all six core U.S. city forecasts and both national discussions', () => {
  expect(sundaySourceErrors(base).join(' ')).toMatch(/0\/6.*city|city.*0\/6/i);
  expect(sundaySourceErrors(readySundayEvidence(base).coverage)).toEqual([]);
});

it.each(['missing city', 'truncated city', 'previous edition', 'missing national'])('holds a candidate with %s', fault => {
  const audit = readySundayEvidence(base).coverage;
  if (fault === 'missing city') audit.sources.shift();
  if (fault === 'truncated city') audit.sources[0].observedUnits = 6;
  if (fault === 'previous edition') audit.generatedAt = '2026-11-17T01:00:00.000Z';
  if (fault === 'missing national') audit.sources.pop();
  expect(sundaySourceErrors(audit).length).toBeGreaterThan(0);
});

it('allows bounded side-source gaps without treating them as missing core forecasts', () => {
  const audit = readySundayEvidence(base).coverage;
  audit.sources.push({ ...audit.sources[0], id: 'swpc-kp', label: 'Kp', status: 'partial', observedUnits: 6, reasons: ['One observation missing'] });
  expect(sundaySourceErrors(audit)).toEqual([]);
  expect(sundaySourceErrors({ ...base, cadence: 'wednesday_topic' })).toEqual([]);
});
