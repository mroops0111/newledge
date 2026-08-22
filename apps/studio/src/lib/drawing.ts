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
  /** How many relations this one line stands for, when it stands for several. */
  readonly standsFor?: number
}

/** What a line between two sections looks like, whatever it stands for. */
export const BETWEEN_SECTIONS: EdgeStyle = {
  shapes: 'drawn',
  kin: 'curve',
  tone: 'quiet',
  strokeWidth: 2,
  marker: 'none',
  onBoard: true,
}

export interface DrawnRelations {
  /** Drawn from one card to another, because both are on the same ground. */
  readonly withinSections: readonly DrawnEdge[]
  /** One line for every pair of sections that any relation crosses between. */
  readonly betweenSections: readonly DrawnEdge[]
}

/**
 * Which relations the board draws, and at what level.
 * A relation whose ends sit on the same ground is drawn between those two
 * cards. One that crosses from one ground to another is drawn between the two
 * grounds instead, and every relation crossing the same pair becomes that one
 * line, since a card cannot be next to everything it relates to and a board
 * covered in lines that cross it says less than a board with a few that do
 * not. The card still names what it is related to.
 */
export function drawnRelations(
  edges: readonly GraphEdge[],
  onBoard: ReadonlySet<string>,
  groundOf: (nodeId: string) => string | undefined,
  selected: ReadonlySet<string>,
): DrawnRelations {
  const withinSections: DrawnEdge[] = []
  const crossing = new Map<string, { source: string, target: string, count: number }>()

  for (const edge of edges) {
    const style = edgeStyle(edge.type)
    if (!style.onBoard || !onBoard.has(edge.fromNodeId) || !onBoard.has(edge.toNodeId))
      continue

    const [from, to] = [groundOf(edge.fromNodeId), groundOf(edge.toNodeId)]
    if (from === to) {
      const asked = selected.has(edge.fromNodeId) || selected.has(edge.toNodeId)
      withinSections.push({
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        // The line already says what kind of relation it is, so the verb is
        // spelled out only when a reader has asked about one of its ends.
        ...(asked ? { label: edge.type } : {}),
        style,
      })
      continue
    }
    if (from === undefined || to === undefined)
      continue

    const [one, other] = [from, to].sort() as [string, string]
    const pair = crossing.get(`${one}|${other}`)
      ?? { source: one, target: other, count: 0 }
    pair.count += 1
    crossing.set(`${one}|${other}`, pair)
  }

  return {
    withinSections,
    betweenSections: [...crossing].map(([id, pair]) => ({
      id: `between-${id}`,
      source: pair.source,
      target: pair.target,
      ...(selected.has(pair.source) || selected.has(pair.target)
        ? { label: `${pair.count}` }
        : {}),
      style: BETWEEN_SECTIONS,
      standsFor: pair.count,
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
