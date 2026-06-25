import type { ImageEntry } from './images';

export function proseOnly(content: string): string {
  return content.replace(/!\[[^\]]*\]\([^)]+\)\s*\n?\*[^*\n]+\*/g, '');
}

export function getNarrativeFitErrors(content: string, image: ImageEntry): string[] {
  const errors: string[] = [];
  const body = proseOnly(content).toLowerCase();
  const imageText = `${image.id} ${image.caption} ${image.topic_tags.join(' ')}`.toLowerCase();
  const hasSevereOrQuakeLead = /tornado|supercell|severe convective|spc storm|earthquake|seismic|aftershock|subduction/.test(body);
  const hasMeaningfulSpace = /geomagnetic storm|aurora|x-class|m-class|\bkp\s*[4-9]\b|kp index maxed at [4-9]/.test(body);

  if (hasSevereOrQuakeLead && !hasMeaningfulSpace && /solar|sun|sdo|aurora|corona|magnetogram/.test(imageText)) {
    errors.push(`Image "${image.id}" is solar/space imagery, but the post lead is severe or seismic.`);
  }

  if (!/drought|soil moisture|agricultur|crop|dryness/.test(body) && /drought|cracked soil|agricultur/.test(imageText)) {
    errors.push(`Image "${image.id}" is drought/agriculture imagery without a matching drought story.`);
  }

  if (!/supercomputer|forecast model|model guidance|numerical model|weather modeling/.test(body) && /supercomputer|cray-1/.test(imageText)) {
    errors.push(`Image "${image.id}" is modeling hardware without a matching modeling story.`);
  }

  if (!/hurricane|tropical|enso|sea surface|ocean current|pacific surface/.test(body) && /hurricane|enso|ocean current/.test(imageText)) {
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
