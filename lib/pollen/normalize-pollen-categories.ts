export type PollenCategoryGroup = 'tree' | 'grass' | 'weed';

const DEFAULT_LABEL: Record<PollenCategoryGroup, string> = {
  tree: 'Tree',
  grass: 'Grass',
  weed: 'Weed',
};

/** Ensure each pollen group has at least one row when upstream succeeded. */
export function normalizePollenCategories(
  tree: Record<string, string>,
  grass: Record<string, string>,
  weed: Record<string, string>,
): {
  tree: Record<string, string>;
  grass: Record<string, string>;
  weed: Record<string, string>;
} {
  return {
    tree: tree && Object.keys(tree).length > 0 ? tree : { [DEFAULT_LABEL.tree]: 'None' },
    grass: grass && Object.keys(grass).length > 0 ? grass : { [DEFAULT_LABEL.grass]: 'None' },
    weed: weed && Object.keys(weed).length > 0 ? weed : { [DEFAULT_LABEL.weed]: 'None' },
  };
}
