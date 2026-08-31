import type { Board } from '@newledge/board'
import { nodeStyle } from './boardStyle.js'
import type { GraphNode } from './graph.js'
import { worded } from './naming.js'

/**
 * What a reader may still put on a board, narrowed rather than listed whole.
 *
 * The panel this feeds replaced one that offered every unplaced node at once,
 * with no grouping, which read as noise the moment a graph outgrew a demo.
 * So what comes out of here is already cut down,
 * by what the board holds, by what is worth placing at all,
 * and by whatever the reader typed.
 */

/** One node a reader could drag onto the board, as the panel says it. */
export interface Offer {
  readonly id: string
  readonly name: string
  readonly kind: string
}

/**
 * The kinds a card is ever drawn for.
 *
 * A claim is drawn on the card of the concept it concerns,
 * and a topic is drawn as the section rather than as a card in one,
 * so neither is a thing a reader can place and neither is offered.
 */
export function placeable(nodes: readonly GraphNode[]): readonly string[] {
  const kinds = nodes
    .map(node => node.type)
    .filter(type => nodeStyle(type).placed && !nodeStyle(type).ground)
  return [...new Set(kinds)].sort((one, other) =>
    nodeStyle(one).band - nodeStyle(other).band || one.localeCompare(other))
}

/**
 * What this board does not hold yet, in the order a reader reads a list in.
 *
 * A node already placed is left out rather than shown as taken,
 * because a list of things that will do nothing when dragged,
 * is a list a reader learns to distrust.
 *
 * Matching is on the name a reader would search by,
 * which is the name they see on a card rather than the id underneath it.
 */
export function unplaced(
  nodes: readonly GraphNode[],
  board: Board,
  { kind, like }: { kind?: string, like?: string } = {},
): readonly Offer[] {
  const on = new Set(board.cards.map(card => card.nodeId))
  const wanted = (like ?? '').trim().toLowerCase()

  return nodes
    .filter(node => !on.has(node.id))
    .filter(node => nodeStyle(node.type).placed && !nodeStyle(node.type).ground)
    .filter(node => kind === undefined || node.type === kind)
    // The name a reader would search by is the one on the card,
    // which is what the node carries, or its id read as words when it has none.
    .map(node => ({ id: node.id, name: node.name || worded(node.id), kind: node.type }))
    .filter(offer => wanted === '' || offer.name.toLowerCase().includes(wanted))
    .sort((one, other) => one.name.localeCompare(other.name))
}
