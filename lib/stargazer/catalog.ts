import { getBeginnerTarget } from '@/lib/stargazer/beginner-targets';
import type { DeepSkyObject } from '@/lib/stargazer/types';
import type { StargazerEquipment } from '@/lib/stargazer/context';

export type CatalogEntry = Pick<DeepSkyObject, 'id' | 'name' | 'altNames' | 'type' | 'constellation' | 'magnitude' | 'bestMonths' | 'nakedEyeVisible' | 'binocularTarget' | 'telescopeMinAperture'>;
export type CatalogEquipment = StargazerEquipment | 'all';

export function matchesCatalogFilters(object: CatalogEntry, query: string, type: string, equipment: CatalogEquipment): boolean {
  const search = query.trim().toLocaleLowerCase('en');
  if (search && ![object.id, object.name, ...object.altNames].some(value => value.toLocaleLowerCase('en').includes(search))) return false;
  if (type !== 'all' && object.type !== type) return false;
  if (equipment === 'all') return true;
  const reviewed = getBeginnerTarget(object.id);
  if (reviewed) {
    const rank = { eyes: 0, binoculars: 1, telescope: 2 };
    return rank[equipment] >= rank[reviewed.minimumEquipment];
  }
  if (equipment === 'eyes') return object.nakedEyeVisible === true;
  if (equipment === 'binoculars') return object.binocularTarget === true || object.nakedEyeVisible === true;
  return Boolean(object.telescopeMinAperture?.trim()) || object.binocularTarget === true || object.nakedEyeVisible === true;
}

export function formatType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Renders an observing window. Sorting alone is not enough: a winter target
 * carries months like [11, 12, 1, 2], which sorts to [1, 2, 11, 12] and would
 * read as "Jan-Dec", the opposite of the truth. A single gap in the sorted run
 * means the window wraps through December, so long as the months either side
 * of it account for the whole set.
 */
export function formatBestMonths(months: number[]): string {
  if (months.length === 0 || months.length === 12) return 'year-round';
  const sorted = [...months].sort((a, b) => a - b);
  if (sorted.length === 1) return MONTH_NAMES[sorted[0] - 1];

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > 1) gaps.push(i);
  }

  if (gaps.length === 0) {
    return `${MONTH_NAMES[sorted[0] - 1]}–${MONTH_NAMES[sorted[sorted.length - 1] - 1]}`;
  }

  if (gaps.length === 1) {
    const start = sorted[gaps[0]];
    const end = sorted[gaps[0] - 1];
    const span = ((end - start + 12) % 12) + 1;
    if (span === sorted.length) {
      return `${MONTH_NAMES[start - 1]}–${MONTH_NAMES[end - 1]}`;
    }
  }

  // Two or more separate windows: name the months rather than invent a range.
  return sorted.map((month) => MONTH_NAMES[month - 1]).join(', ');
}

export function groupByType(objects: CatalogEntry[]): Array<{ type: string; objects: CatalogEntry[] }> {
  const groups = new Map<string, CatalogEntry[]>();
  for (const obj of objects) {
    const list = groups.get(obj.type) ?? [];
    list.push(obj);
    groups.set(obj.type, list);
  }
  return [...groups.entries()]
    .map(([type, list]) => ({ type, objects: list.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })) }))
    .sort((a, b) => b.objects.length - a.objects.length || a.type.localeCompare(b.type));
}



