import { Handle, Position, useStore } from '@xyflow/react'
import { useRef } from 'react'
import type { GraphNode } from '../lib/graph.js'
import type { NodeForm } from '../lib/boardStyle.js'
import { growthAt, READABLE, READABLE_AGAIN } from '../lib/boardStyle.js'
import type { Said } from '../lib/kinship.js'
import { KindBadge } from './KindBadge.js'

export interface BoardCardData {
  readonly node: GraphNode
  readonly form: NodeForm
  readonly colour: string
  /**
   * What this card says about itself, so nothing has to be traced.
   * What a card hangs off, and what the board could not draw for it,
   * are the same kind of statement, so they are one list.
   */
  readonly says?: readonly Said[]
  /**
   * The kind of thing this card is, when a board holds more than one.
   * A board of one kind says it on every card and so says nothing.
   * The word earns its line only where there is another kind to tell it from.
   */
  readonly kind?: string
  [key: string]: unknown
}

const FAR = READABLE
const NEAR = READABLE_AGAIN

/** How wide the band of family colour down a card's edge is drawn. */
const FAMILY_BAND = 5

/**
 * Whether the board is far enough out that a card should only name itself.
 * A reader decides where to stop by looking at the answer,
 * so it is held until the board is well clear of the line,
 * rather than flipped the moment it is crossed.
 */
function useFar(zoom: number): boolean {
  const was = useRef(zoom < FAR)
  was.current = was.current ? zoom < NEAR : zoom < FAR
  return was.current
}

/**
 * A card seen from too far to read, which is a card saying only what it is.
 * The name is drawn at the size the board is not, by undoing the canvas scale,
 * so it stays the same on the screen however far out a reader goes.
 * It keeps the role every other title has, since it is the same title.
 */
function nameOnly(node: GraphNode, growth: number): React.JSX.Element {
  // The name is laid out narrow and then blown back up,
  // so the breaks it is given are the ones it is read at,
  // rather than the ones the card's own width would have given.
  return (
    <div className="flex h-full items-center justify-center overflow-hidden px-4">
      <p
        className="line-clamp-4 text-center font-ui text-title font-semibold text-ink"
        style={{ width: `${100 / growth}%`, transform: `scale(${growth})` }}
      >
        {node.name}
      </p>
    </div>
  )
}

/**
 * The kind, said only where a board holds more than one.
 * A board of one kind says it on every card and so says nothing.
 */
function named(kind: string | undefined): React.JSX.Element | null {
  return kind === undefined ? null : <p className="mb-1"><KindBadge kind={kind} /></p>
}

/**
 * One line per way a card has of saying something about itself.
 * A relation the board drew is worn in the colour of the family it belongs to,
 * and one it could not draw has no family and no mark,
 * so it is set quieter without being set anywhere else.
 */
function lines(says: readonly Said[]): React.JSX.Element[] {
  return says.map(one => (
    <li
      key={`${one.phrase}-${one.colour ?? ''}`}
      className={`truncate py-0.5 font-ui text-label ${one.colour === undefined ? 'text-ink-subtle' : ''}`}
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
 * A node drawn as the kind of thing it is. A term, an assertion, a link,
 * and a heading are not the same object, so they are not the same card,
 * and are told apart before a word is read.
 */
export function BoardCard({ data, selected }: {
  data: BoardCardData
  selected: boolean
}): React.JSX.Element {
  const { node, form, colour, says, kind } = data
  const lift = selected ? 'shadow-lifted ring-1 ring-ink/25' : 'shadow-card'
  const zoom = useStore(state => state.transform[2])
  const far = useFar(zoom)
  const growth = growthAt(zoom)

  // The family colour runs a card's whole height, not just beside its heading,
  // since two pixels of colour by a heading is not seen from across a board.
  //
  // A colour is judged by area rather than read,
  // and a band a pixel or so wide is a colour nobody can name,
  // so the band holds its width as the board goes out.
  // It is what says which family a card is in from too far to read one.
  return (
    <div
      className={`h-full overflow-hidden rounded-card border border-line bg-surface ${lift}`}
      style={{ borderLeftColor: colour, borderLeftWidth: FAMILY_BAND * growth }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {far ? nameOnly(node, growth) : body(node, form, colour, says ?? [], kind)}
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
          <div className="px-5 pt-4">
            {named(kind)}
            <p className="truncate font-ui text-title font-semibold text-ink">{node.name}</p>
            {says.length === 0 ? <div className="pb-3" /> : <ul className="pb-2.5 pt-1.5">{lines(says)}</ul>}
          </div>
          {node.description !== undefined && (
            <div className="px-5 pb-5">
              <p className="line-clamp-5 font-reading text-prose text-ink-muted">
                {node.description}
              </p>
            </div>
          )}
        </>
      )
    }
    // An assertion is a sentence, so it is set as one,
    // not as a heading and a body that repeat each other.
    // Clipping it would destroy the thing itself,
    // so a card is as tall as saying it takes.
    case 'claim': {
      return (
        <div className="px-5 py-4">
          {named(kind)}
          <p className="font-reading text-prose text-ink">
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
        <div className="px-5 py-4">
          {named(kind)}
          <p className="truncate font-ui text-label uppercase text-ink-subtle">
            {domain ?? 'a source'}
          </p>
          <p className="mt-2 line-clamp-3 font-ui text-title font-medium text-ink">
            {node.name}
          </p>
          {says.length > 0 && <ul className="pt-1.5">{lines(says)}</ul>}
        </div>
      )
    }
    // A topic is a section here, and a card only when asked for,
    // so it is drawn small enough to read as a heading.
    case 'topic': {
      return (
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colour }} />
          <p className="truncate font-ui text-title font-semibold text-ink-muted">
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
