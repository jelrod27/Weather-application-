/**
 * Which registry diagrams apply to an Entry.
 *
 * Separate from `generate.ts` so `validate-guide.ts` can ask the same question
 * without pulling in the drafting chain and its Anthropic client. Both the
 * generator's gate and the post-write validator have to apply `isRenderable`,
 * or the validator is weaker than the gate it backstops.
 */

import type { DiagramContext } from '@/lib/education/diagram-types';
import { getDiagram, getDiagramIds } from '@/lib/education/diagrams';

// Re-exported rather than redefined: the pages that render Guides use the same
// function, so the generator cannot offer a diagram the page will not draw.
export { diagramContextFor } from '@/lib/education/diagram-context';

/**
 * Registry diagrams that can actually draw something for this Entry.
 *
 * Resolving an id is not the same as being able to draw: `storm-cross-section`
 * is registered for every cloud but only renders for one of vertical
 * development, and `GuideBody` returns null for the rest.
 */
export function offeredDiagramsFor(context: DiagramContext): { id: string; caption: string }[] {
  return getDiagramIds().flatMap((id) => {
    const definition = getDiagram(id);
    if (!definition) return [];
    if (definition.isRenderable && !definition.isRenderable(context)) return [];
    return [{ id, caption: definition.caption }];
  });
}

/** Diagram ids that would render nothing for this Entry, given what it declares. */
export function unrenderableDiagramIds(
  declaredIds: readonly string[],
  context: DiagramContext,
): string[] {
  const renderable = new Set(offeredDiagramsFor(context).map((d) => d.id));
  return declaredIds.filter((id) => !renderable.has(id));
}
