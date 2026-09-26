import { getStargazerFreshness } from '@/lib/stargazer/freshness';
const received = Date.parse('2026-09-26T20:00:00Z');
it('expires the client-held response without resetting its receipt time', () => {
  expect(getStargazerFreshness(null, received, received + 30 * 60000).stale).toBe(false);
  expect(getStargazerFreshness(null, received, received + 30 * 60000 + 1).stale).toBe(true);
});
it('uses known provider response age without treating assembly time as model time', () => {
  expect(getStargazerFreshness('2026-09-26T19:00:00Z', received, received)).toMatchObject({ stale: true, source: 'provider' });
  expect(getStargazerFreshness(null, received, received)).toMatchObject({ stale: false, source: 'page', time: received });
});
it('requires refresh when receipt time is unknown or in the future', () => {
  expect(getStargazerFreshness(null, null, received).stale).toBe(true);
  expect(getStargazerFreshness(null, received + 1, received).stale).toBe(true);
});
