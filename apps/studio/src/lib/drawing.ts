import type { Board } from '@newledge/board'
import { edgeStyle, nodeStyle } from './boardStyle.js'
import type { EdgeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'

export interface DrawnEdge {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly label?: string
  readonly style: EdgeStyle
}

/** Where a relation's end attaches, which is a card or a ground. */
export type EndpointOf = (nodeId: string) => string | undefined

/** Whether a relation between two cards can be drawn without making a mess. */
export type Drawable = (edgeId: string) => boolean

/**
 * A relation a card names in words because the board could not draw it.
 * Which end of it the card is matters, since a relation reads one way from one
 * end and the other way from the other.
 */
export interface Note {
  readonly edgeId: string
  readonly type: string
  /** The card at the other end, which is the one the note names. */
  readonly otherId: string
  readonly end: 'from' | 'to'
}

export interface DrawnRelations {
  readonly lines: readonly DrawnEdge[]
  /** What each card says about the relations that could not be drawn. */
  readonly notes: ReadonlyMap<string, readonly Note[]>
}

/**
 * Which relations the board draws, and between what.
 * An end attaches to the card it names, or to a ground when the node it names
 * is that ground, since a topic is a section and a section is a thing a
 * relation can honestly run between.
 *
 * A relation that cannot be drawn without a line long enough to be lost is
 * left undrawn, and what it says is not thrown away. The cards at its two ends
 * name each other in words instead. A line summarising several of them between
 * two grounds said only that something was there, which a reader could not act
 * on, while the words say which card and how.
 *
 * A child already names what it hangs off, whatever the board managed to draw,
 * so only the other end of a hierarchy has anything left to say.
 */
export function drawnRelations(
  edges: readonly GraphEdge[],
  endpointOf: EndpointOf,
  groundOf: EndpointOf,
  drawable: Drawable,
  selected: ReadonlySet<string>,
): DrawnRelations {
  const lines: DrawnEdge[] = []
  const notes = new Map<string, Note[]>()
  const noted = (nodeId: string, note: Note): void => {
    // Only a card can carry a note, and a node the board never drew has
    // nowhere to put one.
    if (endpointOf(nodeId) === nodeId)
      notes.set(nodeId, [...(notes.get(nodeId) ?? []), note])
  }

  for (const edge of edges) {
    const style = edgeStyle(edge.type)
    const [source, target] = [endpointOf(edge.fromNodeId), endpointOf(edge.toNodeId)]
    if (source === undefined || target === undefined)
      continue
    // A relation whose one end stands on its other says only where a card
    // already is, which the board said by putting it there.
    if (source === target
      || groundOf(edge.fromNodeId) === target
      || groundOf(edge.toNodeId) === source) {
      continue
    }

    if (drawable(edge.id)) {
      const asked = selected.has(edge.fromNodeId) || selected.has(edge.toNodeId)
      lines.push({
        id: edge.id,
        source,
        target,
        // The line already says what kind of relation it is, so the verb is
        // spelled out only when a reader has asked about one of its ends.
        ...(asked ? { label: edge.type } : {}),
        style,
      })
      continue
    }

    const ends = [
      { on: edge.fromNodeId, other: edge.toNodeId, end: 'from' as const },
      { on: edge.toNodeId, other: edge.fromNodeId, end: 'to' as const },
    ]
    for (const side of style.kin === 'tree'
      ? ends.filter(one => one.end === style.rootAt)
      : ends) {
      noted(side.on, { edgeId: edge.id, type: edge.type, otherId: side.other, end: side.end })
    }
  }

  return { lines, notes }
}

export interface DrawnCard {
  readonly nodeId: string
  readonly node: GraphNode
  readonly x: number
  readonly y: number
  readonly width: number
}

/**
 * The cards a board can actually draw.
 * A card names a node, so one naming a node the graph no longer holds simply
 * stops being drawn rather than leaving a hole a reader has to clear up.
 */
export function drawnCards(board: Board, byId: ReadonlyMap<string, GraphNode>): DrawnCard[] {
  return board.cards.flatMap((card) => {
    const node = byId.get(card.nodeId)
    return node === undefined
      ? []
      : [{ nodeId: card.nodeId, node, x: card.x, y: card.y, width: nodeStyle(node.type).cardWidth }]
  })
}
