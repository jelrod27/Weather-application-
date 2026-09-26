import { getBeginnerTarget } from '@/lib/stargazer/beginner-targets';
import type { StargazerEquipment } from '@/lib/stargazer/context';
import type { BeginnerNight, ObservingHour, ObservingTarget } from '@/lib/stargazer/beginner-types';

const EQUIPMENT_LEVEL = { eyes: 0, binoculars: 1, telescope: 2 };

export function targetsForEquipment(targets: ObservingTarget[], equipment: StargazerEquipment): ObservingTarget[] {
  return targets.filter(target => {
    const metadata = getBeginnerTarget(target.id);
    return metadata && EQUIPMENT_LEVEL[metadata.minimumEquipment] <= EQUIPMENT_LEVEL[equipment];
  }).sort((a, b) => {
    const category = (id: string): number => id === 'Moon' ? 0 : getBeginnerTarget(id)?.kind === 'planet' ? 1 : 2;
    return category(a.id) - category(b.id) ||
      (category(a.id) === 1 ? a.magnitude - b.magnitude : 0) || b.minAltitude - a.minAltitude || a.id.localeCompare(b.id);
  }).slice(0, 3);
}

interface BeginnerSelection {
  hours: ObservingHour[];
  suggested: ObservingHour | null;
  selected: ObservingHour | null;
  targets: ObservingTarget[];
  replacedSelection: boolean;
}

/** Pure client selection over compact, server-computed positions. No astronomy bundle needed. */
export function selectBeginnerHour(night: BeginnerNight, equipment: StargazerEquipment, requested: number | null, now: number): BeginnerSelection {
  const hours = night.hours.filter(hour => hour.start >= now);
  const candidates = hours.filter(hour => hour.weather.issues.length === 0 && targetsForEquipment(hour.targets, equipment).length > 0);
  candidates.sort((a, b) => a.weather.cloudHigh! - b.weather.cloudHigh! || a.weather.precipitation! - b.weather.precipitation! || a.weather.wind! - b.weather.wind! || a.start - b.start);
  const suggested = candidates[0] ?? null;
  const requestedHour = hours.find(hour => hour.start === requested);
  const selected = requestedHour ?? suggested ?? hours[0] ?? null;
  return { hours, suggested, selected, targets: selected ? targetsForEquipment(selected.targets, equipment) : [],
    replacedSelection: requested !== null && !requestedHour };
}
