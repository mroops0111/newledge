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
  /**
   * The cards whose relations this one line stands for.
   * A reader picking one of them has to see the line that carries what they
   * picked, and the line is not any of the relations it stands for, so it
   * cannot be found by asking for those.
   */
  readonly standsFor?: readonly string[]
}

/**
 * What a line between two grounds looks like, whatever it stands for.
 * Heavier than a relation between two cards, because it carries several, and
 * not the faintest thing on the board for the same reason. It carries no end,
 * since the relations it stands for run in both directions.
 */
/**
 * What a line between two grounds looks like, whatever it stands for.
 * Heavier than a relation between two cards, because it carries several, and
 * dashed because it is a summary rather than a relation anyone asserted. It
 * carries no end, since what it stands for runs both ways. Straight, because
 * it is a tie between two grounds and not an association between two things,
 * and because bowed over the short gap between two grounds a heavy dashed line
 * reads as a stray mark rather than as a connector.
 */
export const BETWEEN_GROUNDS: EdgeStyle = {
  shapes: 'drawn',
  kin: 'straight',
  tone: 'structure',
  strokeWidth: 3.5,
  dash: '10 6',
  marker: 'none',
  onBoard: true,
}

/** Where a relation's end attaches, which is a card or a ground. */
export type EndpointOf = (nodeId: string) => string | undefined

/** Whether a relation between two cards can be drawn without making a mess. */
export type Drawable = (edgeId: string) => boolean

export interface DrawnRelations {
  readonly lines: readonly DrawnEdge[]
  /** One line per pair of grounds, for the relations that could not be drawn. */
  readonly summaries: readonly DrawnEdge[]
}

/**
 * Which relations the board draws, and between what.
 * An end attaches to the card it names, or to a ground when the node it names
 * is that ground, since a topic is a section and a section is a thing a
 * relation can honestly run between.
 *
 * A relation that cannot be drawn without a line long enough to be lost is
 * left undrawn, and what it says is not thrown away. It joins one line between
 * the two grounds, which says in words how many relations it stands for and
 * why none of them is drawn, and the card names it too.
 */
export function drawnRelations(
  edges: readonly GraphEdge[],
  endpointOf: EndpointOf,
  groundOf: EndpointOf,
  drawable: Drawable,
  selected: ReadonlySet<string>,
): DrawnRelations {
  const lines: DrawnEdge[] = []
  const crossing = new Map<string, {
    source: string
    target: string
    ends: Set<string>
    relations: number
  }>()

  for (const edge of edges) {
    if (!edgeStyle(edge.type).onBoard)
      continue
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
        style: edgeStyle(edge.type),
      })
      continue
    }

    const [from, to] = [groundOf(edge.fromNodeId), groundOf(edge.toNodeId)]
    if (from === undefined || to === undefined || from === to)
      continue
    const [one, other] = [from, to].sort() as [string, string]
    const pair = crossing.get(`${one}|${other}`)
      ?? { source: one, target: other, ends: new Set<string>(), relations: 0 }
    pair.ends.add(edge.fromNodeId).add(edge.toNodeId)
    pair.relations += 1
    crossing.set(`${one}|${other}`, pair)
  }

  return {
    lines,
    summaries: [...crossing].map(([id, pair]) => ({
      id: `between-${id}`,
      source: pair.source,
      target: pair.target,
      // Always said, and said in full. This is the one line whose shape does
      // not carry what it is, every other line says its kind by the end it
      // points with, and a reader who cannot tell what a line means cannot
      // use it. What it counts is relations, not the cards they run between.
      label: pair.relations === 1
        ? '1 relation, too far to draw'
        : `${pair.relations} relations, too far to draw`,
      style: BETWEEN_GROUNDS,
      standsFor: [...pair.ends],
    })),
  }
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
