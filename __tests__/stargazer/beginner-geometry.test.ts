import { qualifiesBeginnerTarget, getHourTargets } from '@/lib/stargazer/beginner-geometry';
import { getBeginnerTarget } from '@/lib/stargazer/beginner-targets';
const sample = { altitude: 30, azimuth: 90, sunAltitude: -20, moonAltitude: -10, moonIllumination: 30, magnitude: 0 };
const samples = () => Array.from({ length: 5 }, () => ({ ...sample }));
it('rejects a target that falls below the height threshold at an intermediate sample', () => {
  const readings = samples();
  readings[1].altitude = 14.9;
  expect(qualifiesBeginnerTarget(getBeginnerTarget('Jupiter')!, readings)).toBe(false);
  readings[1].altitude = 15;
  expect(qualifiesBeginnerTarget(getBeginnerTarget('Jupiter')!, readings)).toBe(true);
});
it('requires civil twilight, a bright-enough planet, and a Moon at least 2% illuminated', () => {
  expect(qualifiesBeginnerTarget(getBeginnerTarget('Venus')!, samples().map(value => ({ ...value, sunAltitude: -5.9 })))).toBe(false);
  expect(qualifiesBeginnerTarget(getBeginnerTarget('Mars')!, samples().map(value => ({ ...value, magnitude: 2.1 })))).toBe(false);
  expect(qualifiesBeginnerTarget(getBeginnerTarget('Moon')!, samples().map(value => ({ ...value, moonIllumination: 1.9 })))).toBe(false);
  expect(qualifiesBeginnerTarget(getBeginnerTarget('Moon')!, samples().map(value => ({ ...value, moonIllumination: 2 })))).toBe(true);
});
it('requires deep darkness, height and no bright Moon above the horizon for faint targets', () => {
  const object = getBeginnerTarget('M31')!;
  expect(qualifiesBeginnerTarget(object, samples())).toBe(true);
  for (const changes of [{ sunAltitude: -17.9 }, { altitude: 24.9 }, { moonAltitude: 0.1, moonIllumination: 50.1 }]) {
    const readings = samples(); readings[3] = { ...readings[3], ...changes };
    expect(qualifiesBeginnerTarget(object, readings)).toBe(false);
  }
  expect(qualifiesBeginnerTarget(object, samples().map(value => ({ ...value, moonAltitude: 10, moonIllumination: 50 })))).toBe(true);
});
it('can offer the full Moon while suppressing faint targets on a real bright night', () => {
  const targets = getHourTargets(40.7128, -74.006, Date.parse('2026-09-27T01:00:00Z'));
  expect(targets.map(target => target.id)).toContain('Moon');
  expect(targets.some(target => getBeginnerTarget(target.id)?.kind === 'deep-sky')).toBe(false);
});
it('offers no targets during polar daylight and can find southern targets in a dark sky', () => {
  expect(getHourTargets(89, 0, Date.parse('2026-06-21T12:00:00Z'))).toEqual([]);
  const targets = getHourTargets(-33.87, 151.21, Date.parse('2026-04-18T12:00:00Z'));
  expect(targets.map(target => target.id)).toContain('NGC5139');
});

it('uses geometric solar altitude for twilight at a short summer darkness boundary', () => {
  // Sun center stays below -18° for these five samples. Refraction would incorrectly
  // shift it above -18° and reject the entire hour; M13 clears the other gates.
  expect(getHourTargets(48.1, 0, Date.parse('2026-06-20T23:30:00Z')).map(target => target.id)).toContain('M13');
});
