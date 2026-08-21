import { Handle, Position } from '@xyflow/react'
import type { GraphNode } from '../lib/graph.js'
import type { NodeForm } from '../lib/boardStyle.js'

export interface BoardCardData {
  readonly node: GraphNode
  readonly form: NodeForm
  readonly colour: string
  [key: string]: unknown
}

/** Where a source came from, which is the only part of a URL worth drawing. */
function domainOf(node: GraphNode): string | undefined {
  const uri = node.metadata?.sourceReferences?.[0]?.location?.uri
  if (uri === undefined)
    return undefined
  try {
    return new URL(uri).hostname.replace(/^www\./, '')
  }
  catch {
    return undefined
  }
}

/**
 * A node drawn as the kind of thing it is.
 * A term, an assertion, a link, and a heading are not the same object, so they
 * are not the same card, and a reader can tell them apart before reading a word.
 */
export function BoardCard({ data, selected }: {
  data: BoardCardData
  selected: boolean
}): React.JSX.Element {
  const { node, form, colour } = data
  const lift = selected ? 'shadow-lifted ring-1 ring-ink/25' : 'shadow-card'

  return (
    <div className={`rounded-card border border-line bg-surface ${lift}`}>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {body(node, form, colour)}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

function body(node: GraphNode, form: NodeForm, colour: string): React.JSX.Element {
  switch (form) {
    case 'concept': {
      return (
        <>
          <div className="rounded-t-card border-l-2 px-3.5 py-2.5" style={{ borderLeftColor: colour }}>
            <p className="truncate font-ui text-xs font-semibold text-ink">{node.name}</p>
          </div>
          {node.description !== undefined && (
            <div className="px-3.5 pb-3.5">
              <p className="line-clamp-6 font-reading text-[0.8125rem] leading-relaxed text-ink-muted">
                {node.description}
              </p>
            </div>
          )}
        </>
      )
    }
    // An assertion is a sentence, so it is set as one rather than being split
    // into a heading and a body that would only repeat each other. Clipping it
    // would destroy the thing itself, so the card is as tall as saying it takes.
    case 'claim': {
      return (
        <div className="border-l-2 px-3.5 py-3" style={{ borderLeftColor: colour }}>
          <p className="font-reading text-[0.8125rem] leading-relaxed text-ink">
            {node.name}
          </p>
        </div>
      )
    }
    // Provenance reads as a link, the way a link preview does anywhere else.
    // The thumbnail a preview usually carries needs a fetch per source,
    // so the row is kept for it and nothing is requested yet.
    case 'source': {
      const domain = domainOf(node)
      return (
        <div className="px-3 py-2.5">
          <p className="truncate font-ui text-[0.6875rem] uppercase tracking-wide" style={{ color: colour }}>
            {domain ?? 'source'}
          </p>
          <p className="mt-1 line-clamp-2 font-ui text-xs font-medium leading-snug text-ink">
            {node.name}
          </p>
        </div>
      )
    }
    // A topic is a section on this board, and a card only when a reader asks
    // for one, so it is drawn small enough to read as a heading.
    case 'topic': {
      return (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: colour }} />
          <p className="truncate font-ui text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {node.name}
          </p>
        </div>
      )
    }
    default: {
      const exhaustive: never = form
      throw new Error(`Unhandled node form: ${JSON.stringify(exhaustive)}`)
    }
  }
}
