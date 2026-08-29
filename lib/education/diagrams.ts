/**
 * The diagram registry.
 *
 * Guide markdown references diagrams by id and nothing else. A markdown file —
 * hand-written or model-drafted — cannot introduce a component, only name one
 * that already exists here. This is the containment `images.ts` and
 * `image-selection.ts` give the newsletter's images, applied to diagrams; see
 * planning/adr/0002.
 *
 * Unknown ids resolve to null and render nothing.
 */

import CloudAltitudePlot from '@/components/education/diagrams/cloud-altitude-plot'
import StormCrossSection from '@/components/education/diagrams/storm-cross-section'
import { parseAltitudeRange } from '@/lib/education/altitude'
import type { DiagramDefinition } from '@/lib/education/diagram-types'

const REGISTRY: Record<string, DiagramDefinition> = {
  'storm-cross-section': {
    id: 'storm-cross-section',
    caption:
      'Cross-section of a mature cumulonimbus. The updraft feeds the tower until the tropopause stops it and the anvil spreads downwind; the downdraft carries rain-cooled air to the surface, where it spreads out as a gust front.',
    Component: StormCrossSection,
  },
  'cloud-altitude-plot': {
    id: 'cloud-altitude-plot',
    caption:
      'Vertical extent against the standard cloud bands. Most genera sit inside one band; clouds of vertical development cross all three.',
    Component: CloudAltitudePlot,
    isRenderable: (context) =>
      Boolean(context.cloud && parseAltitudeRange(context.cloud.altitudeRange)),
  },
}

export function getDiagram(id: string): DiagramDefinition | null {
  return Object.prototype.hasOwnProperty.call(REGISTRY, id) ? REGISTRY[id] : null
}

export function isKnownDiagramId(id: string): boolean {
  return getDiagram(id) !== null
}

/** Every registered diagram id, for tests and tooling. */
export function getDiagramIds(): string[] {
  return Object.keys(REGISTRY)
}
