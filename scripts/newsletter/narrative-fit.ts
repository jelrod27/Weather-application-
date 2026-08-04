import type { ImageEntry } from './images';
import { readLinkDestination } from './markdown-images';

/**
 * The draft with embedded image blocks (and the italic credit line that follows
 * one) removed, so fit rules judge the prose rather than the alt text and URL of
 * images already placed.
 *
 * Uses the shared balanced-paren reader: a `[^)]+` destination class cannot
 * cross a literal `)`, so a Wikimedia Special:FilePath URL left the whole image
 * block in the body and its keywords then skewed the verdict for every other
 * image checked against the same gate.
 */
export function proseOnly(content: string): string {
  let out = '';
  let cursor = 0;
  const startRx = /!\[[^\]]*\]\(/g;
  let match: RegExpExecArray | null;

  while ((match = startRx.exec(content)) !== null) {
    if (match.index < cursor) continue;

    const dest = readLinkDestination(content, match.index + match[0].length);
    if (dest === null) continue;

    out += content.slice(cursor, match.index);

    // Drop the `*credit*` line immediately after the image, when present.
    const credit = content.slice(dest.endIndex).match(/^[ \t]*\n?\*[^*\n]+\*/);
    cursor = dest.endIndex + (credit ? credit[0].length : 0);
    startRx.lastIndex = cursor;
  }

  return out + content.slice(cursor);
}

/**
 * The prose a fit decision is made against: image markdown and its credit line
 * removed, lowercased. Callers that check many images against one draft should
 * compute this once and use `narrativeFitErrorsForBody` — see image-selection.ts.
 */
export function narrativeBody(content: string): string {
  return proseOnly(content).toLowerCase();
}

export function getNarrativeFitErrors(content: string, image: ImageEntry): string[] {
  return narrativeFitErrorsForBody(narrativeBody(content), image);
}

/** Rule table. `body` must already be normalized by `narrativeBody`. */
export function narrativeFitErrorsForBody(body: string, image: ImageEntry): string[] {
  const errors: string[] = [];
  const imageText = `${image.id} ${image.caption} ${image.topic_tags.join(' ')}`.toLowerCase();
  const hasSevereOrQuakeLead = /tornado|supercell|severe convective|spc storm|earthquake|seismic|aftershock|subduction/.test(body);
  const hasMeaningfulSpace = /geomagnetic storm|aurora|x-class|m-class|\bkp\s*[4-9]\b|kp index maxed at [4-9]/.test(body);

  // \bsun\b (not bare `sun`) so this doesn't fire on "tsunami", "sunset", etc. —
  // a tsunami photo is seismic/marine imagery, not solar.
  if (hasSevereOrQuakeLead && !hasMeaningfulSpace && /solar|\bsun\b|sdo|aurora|corona|magnetogram/.test(imageText)) {
    errors.push(`Image "${image.id}" is solar/space imagery, but the post lead is severe or seismic.`);
  }

  if (!/drought|soil moisture|agricultur|crop|dryness/.test(body) && /drought|cracked soil|agricultur/.test(imageText)) {
    errors.push(`Image "${image.id}" is drought/agriculture imagery without a matching drought story.`);
  }

  if (!/supercomputer|forecast model|model guidance|numerical model|weather modeling/.test(body) && /supercomputer|cray-1/.test(imageText)) {
    errors.push(`Image "${image.id}" is modeling hardware without a matching modeling story.`);
  }

  // \benso\b (not bare `enso`) so this doesn't fire on "tensor" (e.g. a seismic
  // "moment tensor" solution) or "sensor".
  if (!/hurricane|tropical|\benso\b|sea surface|ocean current|pacific surface/.test(body) && /hurricane|\benso\b|ocean current/.test(imageText)) {
    errors.push(`Image "${image.id}" is tropical/ocean imagery without a matching tropical or ocean story.`);
  }

  if (!/\bpollen\b|allerg|aeroallergen|\bragweed\b|\bspore\b|\bplant/.test(body) && /\bpollen\b|aeroallergen|\bragweed\b|\bspore\b/.test(imageText)) {
    errors.push(`Image "${image.id}" is pollen/biometeorology imagery without a matching pollen or plant-health story.`);
  }

  if (!/\bmarine\b|\bcoast(?:al)?\b|\bocean\b|\bsurf(?:ing)?\b|\bshore\b|\brip current\b|\bsea state\b|\bbreaking wave\b/.test(body) && /\bbreaking wave\b|\bsurf(?:ing)?\b/.test(imageText)) {
    errors.push(`Image "${image.id}" is marine imagery without a matching marine or coastal story.`);
  }

  return errors;
}

export function passesNarrativeFit(content: string, image: ImageEntry): boolean {
  return getNarrativeFitErrors(content, image).length === 0;
}
