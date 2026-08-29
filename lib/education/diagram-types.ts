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
}
