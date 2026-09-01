import { EDUCATION_MODEL } from '../../scripts/education/model';
import { buildMessagesRequestBody, modelAcceptsSampling } from '../../scripts/newsletter/repetition';

const messages = [{ role: 'user' as const, content: 'x' }];

describe('the Guide pipeline model', () => {
  it('defaults to Opus 5, independently of the newsletter', () => {
    // Read at import; CI sets neither EDUCATION_MODEL nor NEWSLETTER_MODEL.
    expect(EDUCATION_MODEL).toBe('claude-opus-5');
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
