/**
 * What a diagram is allowed to know about the Entry rendering it.
 *
 * One definition, shared by the pages that render Guides and by
 * `scripts/education/` when it decides which diagrams to offer a draft and
 * whether a declared diagram would draw anything. Those two have to agree: if a
 * page hardcodes a context the generator does not, `validate-guide` passes a
 * Guide whose figure the page then silently drops — the failure the validator
 * exists to catch.
 */

import { getCloudBySlug, type EducationEntryKind } from '@/lib/education/entries'
import type { DiagramContext } from '@/lib/education/diagram-types'

export function diagramContextFor(kind: EducationEntryKind, slug: string): DiagramContext {
  if (kind === 'cloud') {
    const cloud = getCloudBySlug(slug)
    return cloud ? { cloud } : {}
  }
  // No diagram draws a weather system or a phenomenon yet. When one does, add
  // its field to DiagramContext and populate it here — not at a call site.
  return {}
}
