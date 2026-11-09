/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { collectSundayEvidence } from '../../scripts/newsletter/data/sunday-evidence';
import { pickImagesForContent } from '../../scripts/newsletter/content-match';
import { callAnthropic, judgeSimilarity } from '../../scripts/newsletter/repetition';
import { runSunday } from '../../scripts/newsletter/sunday';
import { publishPost } from '../../scripts/newsletter/publish';
import { validateGeneratedPost } from '../../scripts/newsletter/validate-post';
import type { SundayEvidence } from '../../scripts/newsletter/data/sunday-evidence';

jest.mock('../../scripts/newsletter/data/sunday-evidence', () => ({ ...jest.requireActual('../../scripts/newsletter/data/sunday-evidence'), collectSundayEvidence: jest.fn() }));
jest.mock('../../scripts/newsletter/state', () => ({ ...jest.requireActual('../../scripts/newsletter/state'), loadHistory: jest.fn(() => []) }));
jest.mock('../../scripts/newsletter/content-match', () => ({ ...jest.requireActual('../../scripts/newsletter/content-match'), pickImagesForContent: jest.fn(async () => []) }));
jest.mock('../../scripts/newsletter/repetition', () => ({
  ...jest.requireActual('../../scripts/newsletter/repetition'), callAnthropic: jest.fn(),
  judgeSimilarity: jest.fn(async () => ({ max: 0, worstMatch: null, triggerPhrases: [] })), extractKeyPhrases: jest.fn(async () => []),
}));

const window = { start: '2026-11-01T12:00:00.000Z', end: '2026-11-08T12:00:00.000Z' };
const evidence: SundayEvidence = {
  warnings: null, spcSummary: null, spaceSummary: null, quakeSummary: null, forecast: null, national: null,
  coverage: { version: 1, cadence: 'sunday_rearview', generatedAt: '2026-11-08T17:40:00.000Z', window, sources: [
    { id: 'swpc-kp', label: 'Kp', url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', requested: window,
      covered: [window], retrievedAt: window.end, usable: true, status: 'complete', records: 1, observationStart: window.start,
      observationEnd: window.start, unit: 'observations', reasons: [] },
    { id: 'forecast', label: 'Forecast', url: 'https://api.open-meteo.com/v1/forecast', requested: window,
      covered: [], retrievedAt: window.end, usable: false, status: 'unavailable', records: 0, observationStart: null,
      observationEnd: null, unit: 'forecast days', reasons: ['Unavailable'] },
  ] },
};
const invalid = '## Rearview\n\nA compact set of storm reports was recorded.\n\n## Roadmap\n\nRain arrives Wednesday into Thursday (November 12–13).';
const valid = invalid.replace('Wednesday into Thursday', 'Thursday into Friday');

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(collectSundayEvidence).mockResolvedValue(evidence);
  jest.mocked(judgeSimilarity).mockResolvedValue({ max: 0, worstMatch: null, triggerPhrases: [] });
});

it('fails closed before image selection when temporal contradictions exhaust the generation budget', async () => {
  jest.mocked(callAnthropic).mockResolvedValue(invalid);
  await expect(runSunday()).rejects.toThrow(/temporal/i);
  expect(callAnthropic).toHaveBeenCalledTimes(3);
  expect(pickImagesForContent).not.toHaveBeenCalled();
});

it('feeds a concrete calendar correction into the next generation attempt', async () => {
  jest.mocked(callAnthropic).mockResolvedValueOnce(invalid).mockResolvedValue(valid);
  const result = await runSunday();
  expect(result.draft).toContain('Thursday into Friday');
  expect(result.retries).toBe(1);
  expect(callAnthropic).toHaveBeenNthCalledWith(2, expect.objectContaining({ messages: [expect.objectContaining({ content: expect.stringMatching(/expected Thursday–Friday/) })] }));
});

it('rechecks a similarity rewrite instead of allowing it to reintroduce a contradiction', async () => {
  jest.mocked(callAnthropic).mockResolvedValueOnce(valid).mockResolvedValue(invalid);
  jest.mocked(judgeSimilarity).mockResolvedValueOnce({ max: 0.9, worstMatch: null, triggerPhrases: [] });
  await expect(runSunday()).rejects.toThrow(/temporal/i);
  expect(pickImagesForContent).not.toHaveBeenCalled();
});

it('rejects a contradictory edited post even with a freshly valid publication receipt', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-temporal-gate-'));
  try {
    const result = await publishPost({
      cadence: 'sunday_rearview', body: invalid, openerHash: 'test', keyPhrases: [], similarityMax: 0,
      similarityJudge: 'test', modelUsed: 'test', images: [], imageAudit: [], spotlight: null,
      retries: 0, wordCount: 30, closerUsed: 'test',
    }, { coverage: evidence.coverage, root });
    expect(validateGeneratedPost(result.filePath, { publication: true, root }).errors.join(' ')).toMatch(/expected Thursday–Friday/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
