/**
 * Renders Guide markdown with registered diagrams placed inside the prose.
 *
 * Server component. Diagrams resolve through the registry, so a diagram id the
 * markdown names but nobody registered renders nothing rather than throwing
 * (planning/adr/0002).
 */

import { Fragment } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import type { GuideDiagram } from '@/lib/education/content'
import type { DiagramContext } from '@/lib/education/diagram-types'
import { getDiagram } from '@/lib/education/diagrams'
import { buildGuideSegments } from '@/lib/education/guide-layout'

function GuideFigure({ id, context }: { id: string; context: DiagramContext }) {
  const diagram = getDiagram(id)
  if (!diagram) return null
  // Resolving an id is not the same as being able to draw: a diagram that would
  // render nothing must not leave its caption stranded.
  if (diagram.isRenderable && !diagram.isRenderable(context)) return null

  const { Component, caption } = diagram
  return (
    <figure className="guide-figure">
      <Component context={context} />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

interface GuideBodyProps {
  body: string
  diagrams: GuideDiagram[]
  context: DiagramContext
}

export default function GuideBody({ body, diagrams, context }: GuideBodyProps) {
  const segments = buildGuideSegments(body, diagrams)

  return (
    <div className="guide-prose">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.markdown ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {segment.markdown}
            </ReactMarkdown>
          ) : null}
          {segment.diagramId ? <GuideFigure id={segment.diagramId} context={context} /> : null}
        </Fragment>
      ))}
    </div>
  )
}
