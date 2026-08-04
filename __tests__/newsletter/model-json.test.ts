import {
  parseModelJson,
  parseModelJsonArray,
  parseModelJsonObject,
  stripFence,
} from '../../scripts/newsletter/model-json';

/**
 * Three call sites used to carry their own fence-stripper with three different
 * levels of robustness, so prose-prefixed JSON parsed at one and silently
 * returned nothing at the others. These assert the tolerance every caller now
 * shares.
 */
describe('stripFence', () => {
  it('strips a ```json fence', () => {
    expect(stripFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips an unlabelled fence', () => {
    expect(stripFence('```\n[1,2]\n```')).toBe('[1,2]');
  });

  it('recovers an object when the model prefixes prose', () => {
    expect(stripFence('Sure — here you go:\n{"a":1}')).toBe('{"a":1}');
  });

  it('recovers an array when the model prefixes prose', () => {
    expect(stripFence('Here are the phrases: ["one","two"] — hope that helps.')).toBe(
      '["one","two"]',
    );
  });

  it('returns the trimmed input when there is no JSON block', () => {
    expect(stripFence('  no json here  ')).toBe('no json here');
  });
});

describe('parseModelJson', () => {
  it('returns null for unparseable output', () => {
    expect(parseModelJson('not json at all')).toBeNull();
  });

  it('parses fenced output', () => {
    expect(parseModelJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
});

describe('parseModelJsonObject', () => {
  it('parses prose-prefixed JSON — the case the divergent parsers dropped', () => {
    expect(parseModelJsonObject('Here is the angle:\n{"angle":"cold snap"}')).toEqual({
      angle: 'cold snap',
    });
  });

  it('returns an empty object for an array payload', () => {
    expect(parseModelJsonObject('[1,2,3]')).toEqual({});
  });

  it('returns an empty object for unparseable output', () => {
    expect(parseModelJsonObject('¯\\_(ツ)_/¯')).toEqual({});
  });
});

describe('parseModelJsonArray', () => {
  it('keeps trimmed non-empty strings only', () => {
    expect(parseModelJsonArray('["  one ", "", 2, null, "two"]')).toEqual(['one', 'two']);
  });

  it('returns an empty array for an object payload', () => {
    expect(parseModelJsonArray('{"a":1}')).toEqual([]);
  });

  it('parses prose-prefixed arrays', () => {
    expect(parseModelJsonArray('Phrases:\n["storm track","dryline"]')).toEqual([
      'storm track',
      'dryline',
    ]);
  });
});
