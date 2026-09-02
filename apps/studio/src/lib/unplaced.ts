import type { Board } from '@newledge/board'
import { cardable, nodeStyle } from './boardStyle.js'
import type { GraphNode } from './graph.js'
import { worded } from './naming.js'

/** One node a reader could drag onto the board, as the panel says it. */
export interface Offer {
  readonly id: string
  readonly name: string
  readonly kind: string
}

/** The offers of one kind, under the name of that kind. */
export interface Gathered {
  readonly kind: string
  readonly offers: readonly Offer[]
}

/** The kinds a card is ever drawn for, in the order a board bands them. */
export function placeable(nodes: readonly GraphNode[]): readonly string[] {
  const kinds = nodes
    .map(node => node.type)
    .filter(cardable)
  return [...new Set(kinds)].sort((one, other) =>
    nodeStyle(one).band - nodeStyle(other).band || one.localeCompare(other))
}

/**
 * What this board does not hold yet, in the order a reader reads a list in.
 *
 * Already narrowed rather than listed whole,
 * by what the board holds, by what is worth placing at all,
 * and by whatever the reader typed,
 * since every unplaced node at once reads as noise,
 * the moment a graph is larger than a demo.
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
    .filter(node => cardable(node.type))
    .filter(node => kind === undefined || node.type === kind)
    // The name a reader would search by is the one on the card,
    // which is what the node carries, or its id read as words when it has none.
    .map(node => ({ id: node.id, name: node.name || worded(node.id), kind: node.type }))
    .filter(offer => wanted === '' || offer.name.toLowerCase().includes(wanted))
    .sort((one, other) => one.name.localeCompare(other.name))
}

/**
 * The offers gathered under the kind each one is.
 *
 * Said once over a group rather than after every name.
 * A kind repeated down a list is a word a reader reads seven times,
 * to learn one thing, and on a long title it lands mid-sentence,
 * where it reads as part of the title rather than as a note about it.
 *
 * Kinds come in the order a board bands them,
 * so what a board is mostly about is what a reader reaches first.
 *
 * A kind with nothing left is kept rather than dropped.
 * A heading that quietly disappears once a board holds every one of its kind,
 * leaves a reader asking where that kind went,
 * and the answer, that they already have all of it, is worth a line.
 */
export function byKind(offers: readonly Offer[], kinds: readonly string[]): readonly Gathered[] {
  return kinds.map(kind => ({ kind, offers: offers.filter(offer => offer.kind === kind) }))
}
