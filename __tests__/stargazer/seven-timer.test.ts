import { getSevenTimerAtTime, sevenTimerTimeToDate } from '@/lib/stargazer/seven-timer';
import type { SevenTimerResponse } from '@/lib/stargazer/types';

const now = new Date('2026-09-26T14:00:00Z');
const forecast: SevenTimerResponse = {
  product: 'astro', init: '2026092612', dataseries: [3, 6, 9].map(timepoint => ({
    timepoint, seeing: 2, transparency: 3, cloudcover: 1, lifted_index: 2,
    rh2m: 5, wind10m: { direction: 'N', speed: 1 }, temp2m: 18, prec_type: 'none',
  })),
};
beforeEach(() => jest.useFakeTimers({ now }));
afterEach(() => jest.useRealTimers());

it('uses a valid nearby three-hour reading, including the 90-minute boundary', () => {
  expect(getSevenTimerAtTime(forecast, new Date('2026-09-26T16:30:00Z'))?.seeing).toBe(2);
});
it('does not stretch the last sample or use a sample before coverage', () => {
  expect(getSevenTimerAtTime(forecast, new Date('2026-09-27T03:00:00Z'))).toBeNull();
  expect(getSevenTimerAtTime(forecast, new Date('2026-09-26T12:00:00Z'))).toBeNull();
});
it.each(['2026092511', '2026092615', '2026023012', 'bad'])('rejects stale, future or invalid initialization %s', init => {
  expect(getSevenTimerAtTime({ ...forecast, init }, new Date('2026-09-26T15:00:00Z'))).toBeNull();
});
it.each([0, 9, 2.5, NaN])('does not invent a seeing score for invalid scale %s', seeing => {
  const dataseries = forecast.dataseries.map(point => ({ ...point, seeing }));
  expect(getSevenTimerAtTime({ ...forecast, dataseries }, new Date('2026-09-26T15:00:00Z'))).toBeNull();
});
it('rejects duplicate or out-of-order offsets', () => {
  const dataseries = [forecast.dataseries[1], forecast.dataseries[0]];
  expect(getSevenTimerAtTime({ ...forecast, dataseries }, new Date('2026-09-26T15:00:00Z'))).toBeNull();
});
it('rejects normalized calendar dates and non-finite offsets', () => {
  expect(sevenTimerTimeToDate('2026023012', 3).getTime()).toBeNaN();
  expect(sevenTimerTimeToDate('2026092612', Infinity).getTime()).toBeNaN();
});
it('treats a malformed numeric initialization as unavailable, without throwing', () => {
  const malformed: SevenTimerResponse = JSON.parse(JSON.stringify({ ...forecast, init: 2026092612 }));
  expect(getSevenTimerAtTime(malformed, new Date('2026-09-26T15:00:00Z'))).toBeNull();
});
it.each(['2026-09-26T14:59:00Z', '2026-09-26T21:01:00Z'])('never extrapolates beyond sample coverage at %s', time => {
  expect(getSevenTimerAtTime(forecast, new Date(time))).toBeNull();
});
