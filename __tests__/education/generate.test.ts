/**
 * The retry loop, with the model calls mocked. What matters is not what the
 * model says but what the loop does with it: a failure has to go back as an
 * edit of the previous draft, the fact check has to run on every draft that
 * clears the prose gates, and the budget has to end the run.
 */

import { draftBody, finalizeGuide } from '../../scripts/education/draft';
import { factCheck, type FactCheckClaim, type FactCheckResult } from '../../scripts/education/fact-check';
import { checkBody } from '../../scripts/education/gates';
import { generateGuide, MAX_RETRIES, UnsupportedClaimError } from '../../scripts/education/generate';
import { groundOn, type GroundedSource } from '../../scripts/education/grounding';
import { resolveTarget } from '../../scripts/education/queue';
import { getSourceById } from '../../scripts/education/sources';

jest.mock('../../scripts/education/draft', () => ({
  draftBody: jest.fn(),
  finalizeGuide: jest.fn(),
}));
jest.mock('../../scripts/education/fact-check', () => ({
  ...jest.requireActual('../../scripts/education/fact-check'),
  factCheck: jest.fn(),
}));
jest.mock('../../scripts/education/grounding', () => ({
  ...jest.requireActual('../../scripts/education/grounding'),
  groundOn: jest.fn(),
}));

const draftBodyMock = draftBody as jest.MockedFunction<typeof draftBody>;
const finalizeGuideMock = finalizeGuide as jest.MockedFunction<typeof finalizeGuide>;
const factCheckMock = factCheck as jest.MockedFunction<typeof factCheck>;
const groundOnMock = groundOn as jest.MockedFunction<typeof groundOn>;

const SENTENCES = [
  'Air that sinks warms as it descends, and warming air holds its moisture as vapour rather than cloud.',
  'That is why the sky under a high is so often clear, and why the same sinking air can hold haze near the ground in winter when the surface is cold.',
  'The barometer rises ahead of the centre and falls behind it, and the wind turns clockwise around the centre in the Northern Hemisphere.',
  'Nothing about this depends on the season; what changes is the ground the air settles onto.',
];

function section(title: string, sentences: number): string {
  const lines: string[] = [];
  for (let i = 0; i < sentences; i++) lines.push(SENTENCES[i % SENTENCES.length]);
  return `## ${title}\n\n${lines.join(' ')}`;
}

/** A body that clears every prose gate, so the loop's behaviour is what is under test. */
const GOOD_BODY = [
  'A high is a place where air comes down.',
  section('What it actually is', 10),
  section('How it forms', 10),
  section('How to recognise one', 10),
  section('What it means for the person under it', 10),
].join('\n\n');

const REVISED_BODY = GOOD_BODY.replace('in the Northern Hemisphere', 'in the northern hemisphere');
const SHORT_BODY = '## Too short\n\nOne line is not a Guide.';

const SOURCE_IDS = ['glossary-anticyclone', 'jetstream-atmosphere-air-pressure', 'jetstream-synoptic-origin-of-wind'];
const SOURCES: GroundedSource[] = SOURCE_IDS.map((id) => ({
  entry: getSourceById(id)!,
  text: 'Sinking air warms and dries, which is why fair weather follows a high.',
}));

function clean(): FactCheckResult {
  return { claims: [], unsupported: [], highRisk: [], quoteFailures: [] };
}

function withHighRisk(text: string): FactCheckResult {
  const claim: FactCheckClaim = { text, verdict: 'unsupported', hasNumber: true, hasAttribution: false };
  return { claims: [claim], unsupported: [claim], highRisk: [claim], quoteFailures: [] };
}

const entry = resolveTarget('anticyclones', 'weather-system');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  groundOnMock.mockResolvedValue(SOURCES);
  finalizeGuideMock.mockResolvedValue({
    summary:
      'How high pressure clears the sky in summer, traps haze in winter, and what the barometer says before either happens.',
    sourceIds: SOURCE_IDS,
    diagrams: [],
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('generateGuide', () => {
  it('uses a fixture that really does clear the prose gates', () => {
    expect(checkBody(GOOD_BODY)).toEqual([]);
    expect(checkBody(REVISED_BODY)).toEqual([]);
    expect(checkBody(SHORT_BODY)).not.toEqual([]);
  });

  it('sends an unsupported number back as an edit of the previous draft', async () => {
    draftBodyMock.mockResolvedValueOnce(GOOD_BODY).mockResolvedValueOnce(REVISED_BODY);
    factCheckMock
      .mockResolvedValueOnce(withHighRisk('Winds reach 40 mph for 36 hours'))
      .mockResolvedValueOnce(clean());

    const result = await generateGuide(entry, { model: 'test-model' });

    expect(draftBodyMock).toHaveBeenCalledTimes(2);
    const first = draftBodyMock.mock.calls[0][0];
    const second = draftBodyMock.mock.calls[1][0];
    expect(first.previousBody).toBeNull();
    expect(first.correction).toBeNull();
    expect(second.previousBody).toBe(GOOD_BODY);
    expect(second.correction).toMatch(/Winds reach 40 mph for 36 hours/);
    expect(result.body).toBe(REVISED_BODY);
    expect(result.retries).toBe(1);
    expect(result.modelUsed).toBe('test-model');
  });

  it('sends a prose-gate failure back as an edit too, and fact-checks only drafts that clear the gates', async () => {
    draftBodyMock.mockResolvedValueOnce(SHORT_BODY).mockResolvedValueOnce(GOOD_BODY);
    factCheckMock.mockResolvedValue(clean());

    const result = await generateGuide(entry, { model: 'test-model' });

    expect(factCheckMock).toHaveBeenCalledTimes(1);
    expect(factCheckMock.mock.calls[0][0].body).toBe(GOOD_BODY);
    expect(draftBodyMock.mock.calls[1][0].previousBody).toBe(SHORT_BODY);
    expect(draftBodyMock.mock.calls[1][0].correction).toMatch(/words/);
    expect(result.retries).toBe(1);
  });

  it('stops after the retry budget and names the claim that survived', async () => {
    draftBodyMock.mockResolvedValue(GOOD_BODY);
    factCheckMock.mockResolvedValue(withHighRisk('The ridge sits at 500 mb'));

    await expect(generateGuide(entry, { model: 'test-model' })).rejects.toThrow(UnsupportedClaimError);
    await expect(generateGuide(entry, { model: 'test-model' })).rejects.toThrow(/The ridge sits at 500 mb/);

    // Two runs above; each drafts and judges once per attempt.
    expect(draftBodyMock).toHaveBeenCalledTimes(2 * (MAX_RETRIES + 1));
    expect(factCheckMock).toHaveBeenCalledTimes(2 * (MAX_RETRIES + 1));
    expect(finalizeGuideMock).not.toHaveBeenCalled();
  });

  it('offers the sources it grounded on, pins included, to the drafting call', async () => {
    draftBodyMock.mockResolvedValue(GOOD_BODY);
    factCheckMock.mockResolvedValue(clean());

    await generateGuide(entry, { model: 'test-model' });

    const offered = groundOnMock.mock.calls[0][0].map((source) => source.id);
    // Both anticyclone pins ride ahead of the ranked candidates.
    expect(offered.slice(0, 2)).toEqual(['jetstream-synoptic-origin-of-wind', 'glossary-inversion']);
    expect(offered).toHaveLength(12);
  });
});
