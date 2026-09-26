import { Body, Illumination } from 'astronomy-engine';
import catalog from '@/data/deep-sky-catalog.json';
import { bodyAltAz, catalogObjectAltAz } from '@/lib/stargazer/astronomy';
import { BEGINNER_TARGETS } from '@/lib/stargazer/beginner-targets';
import type { BeginnerTarget } from '@/lib/stargazer/beginner-targets';
import type { ObservingTarget } from '@/lib/stargazer/beginner-types';
import type { SkyPosition } from '@/lib/stargazer/direction';

interface TargetSample extends SkyPosition {
  sunAltitude: number;
  moonAltitude: number;
  moonIllumination: number;
  magnitude: number;
}
const BODIES: Record<string, Body | undefined> = { Moon: Body.Moon, Venus: Body.Venus, Mars: Body.Mars, Jupiter: Body.Jupiter, Saturn: Body.Saturn };

/** Conservative beginner gates at five samples; never a guarantee of visibility. */
export function qualifiesBeginnerTarget(target: BeginnerTarget, samples: TargetSample[]): boolean {
  if (samples.length !== 5) return false;
  return samples.every(sample => {
    if (!Object.values(sample).every(Number.isFinite)) return false;
    if (target.kind === 'deep-sky') return sample.sunAltitude <= -18 && sample.altitude >= 25 && !(sample.moonAltitude > 0 && sample.moonIllumination > 50);
    return sample.sunAltitude <= -6 && sample.altitude >= 15 &&
      (target.kind === 'moon' ? sample.moonIllumination >= 2 : sample.magnitude <= 2);
  });
}

/** Server-side compact geometry for a whole hour, sampled every 15 minutes including endpoints. */
export function getHourTargets(lat: number, lon: number, start: number): ObservingTarget[] {
  const times = Array.from({ length: 5 }, (_, index) => new Date(start + index * 15 * 60000));
  const sky = times.map(time => ({ sunAltitude: bodyAltAz(Body.Sun, lat, lon, time).altitude,
    moonAltitude: bodyAltAz(Body.Moon, lat, lon, time).altitude, moonIllumination: Illumination(Body.Moon, time).phase_fraction * 100 }));
  const targets: ObservingTarget[] = [];
  for (const target of BEGINNER_TARGETS) {
    const body = BODIES[target.id];
    const object = body ? undefined : catalog.find(entry => entry.id === target.id);
    if (!body && !object) continue;
    const samples = times.map((time, index): TargetSample => ({ ...sky[index],
      ...(body ? bodyAltAz(body, lat, lon, time) : catalogObjectAltAz(object!.ra, object!.dec, lat, lon, time)),
      magnitude: body ? Illumination(body, time).mag : object!.magnitude,
    }));
    if (qualifiesBeginnerTarget(target, samples)) targets.push({ id: target.id,
      minAltitude: Math.min(...samples.map(sample => sample.altitude)),
      altitude: samples[2].altitude, azimuth: samples[2].azimuth, magnitude: samples[2].magnitude });
  }
  return targets;
}
