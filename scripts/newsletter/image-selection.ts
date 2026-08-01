/**
 * The narrative-fit gate, as a selection predicate.
 *
 * Image selection and image validation used to be separate code paths, so
 * selection could emit an image the publish-time validator would reject and
 * kill the cron. Every fix added another `passesNarrativeFit` call at another
 * call site — seven of them across four modules — rather than moving the rule.
 *
 * A gate is built once per draft and is the only thing selection may pick
 * through. Because `filter` and `filterPlacements` return only accepted
 * images, a caller that goes through the gate cannot produce a pick the
 * validator rejects; the validator uses the same gate to report why.
 */

import type { ImageEntry } from './images';
import { narrativeBody, narrativeFitErrorsForBody } from './narrative-fit';

/** A chosen image plus the verbatim draft snippet it is anchored after. */
export interface ImagePlacement {
  image: ImageEntry;
  /** Verbatim short snippet (3-8 words) from the draft, after which the image is inserted. */
  insertAfter: string;
}

export interface DraftImageGate {
  /** Why this image does not fit the draft. Empty when it fits. */
  errorsFor(image: ImageEntry): string[];
  accepts(image: ImageEntry): boolean;
  /** The subset of `images` that fits, in the order given. */
  filter(images: ImageEntry[]): ImageEntry[];
  /** The subset of `placements` whose image fits, anchors preserved. */
  filterPlacements(placements: ImagePlacement[]): ImagePlacement[];
  /** First fitting image, or null. Skips ids in `exclude`. */
  firstFitting(images: Iterable<ImageEntry>, exclude?: ReadonlySet<string>): ImageEntry | null;
}

/**
 * Builds the gate for one draft. The prose normalization runs once here rather
 * than once per image per call site.
 */
export function imageGateFor(draft: string): DraftImageGate {
  const body = narrativeBody(draft);
  const verdicts = new Map<string, string[]>();

  const errorsFor = (image: ImageEntry): string[] => {
    const cached = verdicts.get(image.id);
    if (cached) return cached;
    const errors = narrativeFitErrorsForBody(body, image);
    verdicts.set(image.id, errors);
    return errors;
  };

  const accepts = (image: ImageEntry): boolean => errorsFor(image).length === 0;

  return {
    errorsFor,
    accepts,
    filter: (images) => images.filter(accepts),
    filterPlacements: (placements) => placements.filter((p) => accepts(p.image)),
    firstFitting: (images, exclude) => {
      for (const image of images) {
        if (exclude?.has(image.id)) continue;
        if (accepts(image)) return image;
      }
      return null;
    },
  };
}
