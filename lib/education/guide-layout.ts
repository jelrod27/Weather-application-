/**
 * Placing diagrams inside Guide prose.
 *
 * A Guide's frontmatter names a diagram and a short verbatim snippet from the
 * body; the diagram is rendered after the block containing that snippet. The
 * match is whitespace-normalised because markdown is hard-wrapped, so an
 * anchor phrase routinely straddles a line break.
 *
 * An anchor that matches nothing drops its diagram rather than guessing a
 * position — a diagram in the wrong place is worse than no diagram.
 */

import type { GuideDiagram } from '@/lib/education/content'

export interface GuideSegment {
  /** Markdown for this run of blocks. */
  markdown: string
  /** Diagram to render after this segment, if any. */
  diagramId: string | null
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function buildGuideSegments(body: string, diagrams: GuideDiagram[]): GuideSegment[] {
  const blocks = body.trim().split(/\n{2,}/)
  if (blocks.length === 0) return []

  const normalizedBlocks = blocks.map(normalize)

  // Block index -> diagram ids to render after it, in frontmatter order.
  const placements = new Map<number, string[]>()
  for (const diagram of diagrams) {
    const needle = normalize(diagram.insertAfter)
    if (!needle) continue
    const index = normalizedBlocks.findIndex((block) => block.includes(needle))
    if (index === -1) continue
    const existing = placements.get(index)
    if (existing) existing.push(diagram.id)
    else placements.set(index, [diagram.id])
  }

  const segments: GuideSegment[] = []
  let pending: string[] = []

  blocks.forEach((block, index) => {
    pending.push(block)
    const ids = placements.get(index)
    if (!ids) return
    ids.forEach((id, position) => {
      segments.push({
        // Only the first diagram at a given anchor closes the prose run; any
        // others follow it back to back.
        markdown: position === 0 ? pending.join('\n\n') : '',
        diagramId: id,
      })
      pending = []
    })
  })

  if (pending.length > 0) {
    segments.push({ markdown: pending.join('\n\n'), diagramId: null })
  }

  return segments
}
