import { toDay1Risk } from '@/hooks/use-spc-day1-summary';

/**
 * This transform used to be interleaved with the fetch inside the hook, so it
 * was only reachable by rendering. Pulling the fetch behind useRemoteData left
 * it a pure function testable in microseconds.
 */
const feature = (props: Record<string, unknown>) => ({ properties: props }) as never;

describe('toDay1Risk', () => {
  it('picks the highest categorical risk present', () => {
    const risk = toDay1Risk({
      features: [
        feature({ LABEL: 'MRGL', LABEL2: 'Marginal Risk', fill: '#00ff00', ISSUE: 'i1' }),
        feature({ LABEL: 'ENH', LABEL2: 'Enhanced Risk', fill: '#ff9900', ISSUE: 'i2' }),
        feature({ LABEL: 'SLGT', LABEL2: 'Slight Risk', fill: '#ffff00', ISSUE: 'i3' }),
      ],
    } as never);

    expect(risk.riskCode).toBe('ENH');
    expect(risk.fill).toBe('#ff9900');
    expect(risk.issue).toBe('i2');
  });

  it('ignores features whose label is not a known risk level', () => {
    const risk = toDay1Risk({
      features: [
        feature({ LABEL: 'TSTM', LABEL2: 'Thunderstorm', fill: '#c1e9c1' }),
        feature({ LABEL: 'NOT_A_RISK', fill: '#000' }),
      ],
    } as never);

    expect(risk.riskCode).toBe('TSTM');
  });

  it('falls back to the API no-risk label when nothing qualifies', () => {
    const risk = toDay1Risk({ features: [], noRiskLabel: 'Quiet today' } as never);
    expect(risk.riskCode).toBeNull();
    expect(risk.label).toBe('Quiet today');
    expect(risk.fill).toBe('#22c55e');
  });

  it('synthesizes a no-risk label when the API omits one', () => {
    const risk = toDay1Risk({ features: [] } as never);
    expect(risk.label).toMatch(/No .* risk in current outlook/);
  });

  it('tolerates a payload with no features array at all', () => {
    const risk = toDay1Risk({} as never);
    expect(risk.riskCode).toBeNull();
  });
});
