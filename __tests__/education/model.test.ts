import { assertEffortForModel, EDUCATION_EFFORT, EDUCATION_MODEL } from '../../scripts/education/model';
import {
  buildMessagesRequestBody,
  callAnthropic,
  modelAcceptsSampling,
} from '../../scripts/newsletter/repetition';

const messages = [{ role: 'user' as const, content: 'x' }];

describe('the Guide pipeline model', () => {
  it('defaults to Opus 5, independently of the newsletter', () => {
    // Read at import; CI sets neither EDUCATION_MODEL nor NEWSLETTER_MODEL.
    expect(EDUCATION_MODEL).toBe('claude-opus-5');
  });

  it('defaults to medium effort', () => {
    // The first Opus 5 dry run spent its whole token ceiling thinking at the
    // model's default effort and never reached the prose.
    expect(EDUCATION_EFFORT).toBe('medium');
  });
});

describe('effort', () => {
  it('is sent as output_config only when a caller asks for it', () => {
    expect(buildMessagesRequestBody({ model: 'claude-opus-5', messages })).not.toHaveProperty('output_config');
    expect(buildMessagesRequestBody({ model: 'claude-opus-5', messages, effort: 'medium' }).output_config).toEqual({
      effort: 'medium',
    });
  });

  it('refuses xhigh for Sonnet 4.6, which the API does not accept', () => {
    expect(() => assertEffortForModel('claude-sonnet-4-6', 'xhigh')).toThrow(/xhigh/);
    expect(() => assertEffortForModel('claude-sonnet-4-6', 'max')).not.toThrow();
    expect(() => assertEffortForModel('claude-opus-5', 'xhigh')).not.toThrow();
  });
});

describe('callAnthropic timeout', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('still times out when headers arrive but the body never does', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    global.fetch = jest.fn((_url: unknown, init?: RequestInit) => {
      const signal = init?.signal;
      return Promise.resolve({
        ok: true,
        json: () =>
          new Promise((_resolve, reject) => {
            if (!signal) return;
            const abort = () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            };
            if (signal.aborted) abort();
            else signal.addEventListener('abort', abort, { once: true });
          }),
      });
    }) as unknown as typeof fetch;

    await expect(callAnthropic({ messages, timeoutMs: 40 })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('sampling parameters', () => {
  it('are withheld from models that reject them', () => {
    for (const model of ['claude-opus-5', 'claude-sonnet-5', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-fable-5-1']) {
      expect(modelAcceptsSampling(model)).toBe(false);
      expect(buildMessagesRequestBody({ model, messages, temperature: 0.7 })).not.toHaveProperty('temperature');
    }
  });

  it('are still sent to models that accept them', () => {
    expect(modelAcceptsSampling('claude-sonnet-4-6')).toBe(true);
    const body = buildMessagesRequestBody({ model: 'claude-sonnet-4-6', messages, temperature: 0.7 });
    expect(body.temperature).toBe(0.7);
  });

  it('keeps the system blocks and the token ceiling either way', () => {
    const body = buildMessagesRequestBody({
      model: 'claude-opus-5',
      messages,
      maxTokens: 16_000,
      systemBlocks: [{ type: 'text', text: 'spec' }],
    });
    expect(body.max_tokens).toBe(16_000);
    expect(body.system).toEqual([{ type: 'text', text: 'spec' }]);
    expect(body.model).toBe('claude-opus-5');
  });
});
