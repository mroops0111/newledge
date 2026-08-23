import { Handle, Position } from '@xyflow/react'
import type { GraphNode } from '../lib/graph.js'
import type { NodeForm } from '../lib/boardStyle.js'
import type { Said } from '../lib/kinship.js'

export interface BoardCardData {
  readonly node: GraphNode
  readonly form: NodeForm
  readonly colour: string
  /**
   * What this card says about itself, so nothing has to be traced.
   * What it hangs off and what the board could not draw between it and
   * somewhere else are the same kind of statement, so they are one list.
   */
  readonly says?: readonly Said[]
  /**
   * The kind of thing this card is, when a board holds more than one.
   * A board of one kind says it on every card and so says nothing, and the
   * word is only worth the line it takes where there is something to tell it
   * apart from.
   */
  readonly kind?: string
  [key: string]: unknown
}

/**
 * What kind of thing a card is, said in a word.
 * Said in a colour instead, it would be the third thing colour means on this
 * board, after which family a card belongs to and whether a relation agrees or
 * conflicts, and a reader would have to know which of the three a given patch
 * of colour was speaking. The word needs nothing known in advance.
 */
function named(kind: string | undefined): React.JSX.Element | null {
  if (kind === undefined)
    return null
  return (
    <p className="mb-1">
      <span className="rounded-full bg-raised px-1.5 py-px font-ui text-[0.5625rem] font-semibold uppercase tracking-wider text-ink-subtle">
        {kind}
      </span>
    </p>
  )
}

/**
 * One line per way a card has of saying something about itself.
 * A relation the board drew is worn in the colour of the family it belongs to,
 * and one it could not draw has no family and no mark, so it is set quieter
 * without being set anywhere else.
 */
function lines(says: readonly Said[]): React.JSX.Element[] {
  return says.map(one => (
    <li
      key={`${one.phrase}-${one.colour ?? ''}`}
      className={`truncate py-px font-ui text-[0.6875rem] leading-tight ${one.colour === undefined ? 'text-ink-subtle' : ''}`}
      {...(one.colour === undefined ? {} : { style: { color: one.colour } })}
    >
      {`${one.glyph === undefined ? '' : `${one.glyph}\u00A0`}${one.phrase} ${one.names.join(', ')}`}
    </li>
  ))
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
  const { node, form, colour, says, kind } = data
  const lift = selected ? 'shadow-lifted ring-1 ring-ink/25' : 'shadow-card'

  // The family colour runs the whole height of the card rather than beside its
  // heading, since a board is looked at before it is read and two pixels of
  // colour against a heading is not something a reader sees from across one.
  return (
    <div
      className={`overflow-hidden rounded-card border border-line border-l-[5px] bg-surface ${lift}`}
      style={{ borderLeftColor: colour }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {body(node, form, colour, says ?? [], kind)}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

function body(
  node: GraphNode,
  form: NodeForm,
  colour: string,
  says: readonly Said[],
  kind: string | undefined,
): React.JSX.Element {
  switch (form) {
    case 'concept': {
      return (
        <>
          <div className="px-3.5 pt-2.5">
            {named(kind)}
            <p className="truncate font-ui text-xs font-semibold text-ink">{node.name}</p>
            {says.length === 0 ? <div className="pb-2.5" /> : <ul className="pb-2 pt-1">{lines(says)}</ul>}
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
        <div className="px-3.5 py-3">
          {named(kind)}
          <p className="font-reading text-[0.8125rem] leading-relaxed text-ink">
            {node.name}
          </p>
          {says.length > 0 && <ul className="pt-1.5">{lines(says)}</ul>}
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
          {named(kind)}
          <p className="truncate font-ui text-[0.6875rem] uppercase tracking-wide text-ink-subtle">
            {domain ?? 'a source'}
          </p>
          <p className="mt-1 line-clamp-2 font-ui text-xs font-medium leading-snug text-ink">
            {node.name}
          </p>
          {says.length > 0 && <ul className="pt-1.5">{lines(says)}</ul>}
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
