import {
  buildFactCorrection,
  formatFactCheck,
  unexaminedNumericClaims,
  verifyAgainstSources,
  type FactCheckClaim,
} from '../../scripts/education/fact-check';
import type { GroundedSource } from '../../scripts/education/grounding';

const sources: GroundedSource[] = [
  {
    entry: { id: 'spc-faq', label: 'SPC FAQ', url: 'https://www.spc.noaa.gov/faq/', tags: ['severe'] },
    text: 'A thunderstorm is classified as severe when it produces hail one inch in diameter or larger, winds gusting to 58 mph or higher, or a tornado.',
  },
  {
    entry: {
      id: 'jetstream-clouds',
      label: 'JetStream Clouds',
      url: 'https://www.noaa.gov/jetstream/clouds',
      tags: ['clouds'],
    },
    text: 'High clouds form above 20,000 feet and are composed almost entirely of ice crystals because of the very cold temperatures at that altitude.',
  },
];

function claim(partial: Partial<FactCheckClaim>): FactCheckClaim {
  return {
    text: 'a claim',
    verdict: 'supported',
    hasNumber: false,
    hasAttribution: false,
    ...partial,
  }
}

describe('verifyAgainstSources', () => {
  // The judge is not trusted. "Supported" only survives if the span it quotes
  // is actually in the source text.
  it('keeps a claim whose quote really appears in the cited source', () => {
    const [checked] = verifyAgainstSources(
      [claim({ sourceId: 'spc-faq', quote: 'winds gusting to 58 mph or higher' })],
      sources,
    );
    expect(checked.verdict).toBe('supported');
    expect(checked.quoteNotFound).toBeUndefined();
  });

  it('downgrades a claim whose quote is nowhere in the sources', () => {
    // A fabricated justification has to fail mechanically, not persuasively.
    const [checked] = verifyAgainstSources(
      [claim({ sourceId: 'spc-faq', quote: 'winds gusting to 45 mph or higher' })],
      sources,
    );
    expect(checked.verdict).toBe('unsupported');
    expect(checked.quoteNotFound).toBe(true);
  });

  it('downgrades a quote too short to mean anything', () => {
    const [checked] = verifyAgainstSources([claim({ sourceId: 'spc-faq', quote: 'a' })], sources);
    expect(checked.verdict).toBe('unsupported');
  });

  it('matches across whitespace and smart quotes', () => {
    const [checked] = verifyAgainstSources(
      [claim({ sourceId: 'spc-faq', quote: 'hail   one inch in\n  diameter or larger' })],
      sources,
    );
    expect(checked.verdict).toBe('supported');
  });

  it('keeps a grounded claim but records the wrong source id', () => {
    // The prose is fine; the judge filed the evidence under the wrong page.
    const [checked] = verifyAgainstSources(
      [claim({ sourceId: 'spc-faq', quote: 'composed almost entirely of ice crystals' })],
      sources,
    );
    expect(checked.verdict).toBe('supported');
    expect(checked.misattributed).toBe('jetstream-clouds');
  });

  it('leaves an already-unsupported claim alone', () => {
    const [checked] = verifyAgainstSources([claim({ verdict: 'unsupported' })], sources);
    expect(checked.verdict).toBe('unsupported');
    expect(checked.quoteNotFound).toBeUndefined();
  });
});

describe('formatFactCheck', () => {
  it('says plainly when nothing needs checking', () => {
    const report = formatFactCheck({
      claims: [claim({}), claim({})],
      unsupported: [],
      highRisk: [],
      quoteFailures: [],
    });
    expect(report).toMatch(/2 of 2 checkable claims/);
    expect(report).toMatch(/Nothing unsupported/);
  });

  it('lists unsupported claims as a checklist and tags the risky ones', () => {
    const risky = claim({
      text: 'Gusts reach 58 mph before a warning is issued',
      verdict: 'unsupported',
      hasNumber: true,
      hasAttribution: true,
    });
    const report = formatFactCheck({
      claims: [claim({}), risky],
      unsupported: [risky],
      highRisk: [risky],
      quoteFailures: [],
    });
    expect(report).toMatch(/- \[ \] Gusts reach 58 mph/);
    expect(report).toMatch(/number, attribution/);
  });

  it('reports fabricated quotes separately from ordinary unsupported claims', () => {
    const fabricated = claim({ verdict: 'unsupported', quoteNotFound: true });
    const report = formatFactCheck({
      claims: [fabricated],
      unsupported: [fabricated],
      highRisk: [],
      quoteFailures: [fabricated],
    });
    expect(report).toMatch(/quote that is not in the source/);
  });
});

describe('buildFactCorrection', () => {
  it('names each unsupported claim and refuses a swapped-in number', () => {
    const correction = buildFactCorrection([
      claim({ text: 'Hail must exceed 2 inches', verdict: 'unsupported', hasNumber: true }),
    ]);
    expect(correction).toMatch(/Hail must exceed 2 inches/);
    expect(correction).toMatch(/Do not replace a number with a different invented number/);
  });
});

describe('unexaminedNumericClaims', () => {
  // A judge that silently skips a number would otherwise leave it certified by
  // omission, which is the fail-open this whole gate exists to avoid.
  it('flags a sentence whose figure no claim mentions', () => {
    const body = 'The tower reaches 60,000 feet before the tropopause stops it.';
    const out = unexaminedNumericClaims(body, [
      { text: 'Storms need moisture', verdict: 'supported', hasNumber: false, hasAttribution: false },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].verdict).toBe('unsupported');
    expect(out[0].hasNumber).toBe(true);
    expect(out[0].unexamined).toBe(true);
    expect(out[0].text).toMatch(/60,000 feet/);
  });

  it('accepts a figure the judge examined, across comma formatting', () => {
    const body = 'The tower reaches 60,000 feet.';
    const out = unexaminedNumericClaims(body, [
      { text: 'Tops reach 60000 feet', verdict: 'supported', hasNumber: true, hasAttribution: false },
    ]);
    expect(out).toEqual([]);
  });

  it('ignores prose with no figures at all', () => {
    expect(unexaminedNumericClaims('Cirrus is made of ice rather than water.', [])).toEqual([]);
  });

  it('marks an unexamined sentence naming an agency as an attribution too', () => {
    const out = unexaminedNumericClaims('The National Weather Service uses 58 mph.', []);
    expect(out[0].hasAttribution).toBe(true);
  });
});

describe('formatFactCheck counts misattributed claims honestly', () => {
  it('does not describe a wrong-source quote as support from the cited source', () => {
    const ok = claim({});
    const wrongSource = claim({ misattributed: 'jetstream-clouds', sourceId: 'spc-faq' });
    const report = formatFactCheck({
      claims: [ok, wrongSource],
      unsupported: [],
      highRisk: [],
      quoteFailures: [],
    });
    expect(report).toMatch(/1 of 2 checkable claims/);
    expect(report).toMatch(/cited to the wrong source/);
  });
});
