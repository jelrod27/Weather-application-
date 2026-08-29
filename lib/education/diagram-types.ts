/**
 * Shared types for the education diagram registry.
 *
 * Split from `diagrams.ts` so diagram components can import the context type
 * without the registry importing them back.
 */

import type { ComponentType } from 'react'
import type { CloudData } from '@/data/cloud-types'

/** Everything a diagram is allowed to know about the Guide rendering it. */
export interface DiagramContext {
  cloud?: CloudData
}

export interface DiagramDefinition {
  id: string
  /** Rendered as the figure caption beneath the diagram. */
  caption: string
  Component: ComponentType<{ context: DiagramContext }>
  /**
   * Whether this diagram can draw anything for the given context. Resolving an
   * id is not the same as being able to render it — a component that returns
   * null would otherwise leave its <figure> and caption stranded on the page.
   */
  isRenderable?: (context: DiagramContext) => boolean
}
