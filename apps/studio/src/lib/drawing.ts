import type { Board } from '@newledge/board'
import { edgeStyle, nodeStyle } from './boardStyle.js'
import type { EdgeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'

export interface DrawnEdge {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type: string
  readonly label?: string
  readonly style: EdgeStyle
}

/**
 * Which relations the board draws, out of every relation the graph holds.
 * A relation the arrangement already says is only drawn while one of its ends
 * is selected, so asking about one card is what brings its structure out,
 * and the board is not a wall of lines the rest of the time.
 */
export function drawnEdges(
  edges: readonly GraphEdge[],
  onBoard: ReadonlySet<string>,
  selected: ReadonlySet<string>,
): DrawnEdge[] {
  return edges
    .filter(edge => onBoard.has(edge.fromNodeId) && onBoard.has(edge.toNodeId))
    .flatMap((edge) => {
      const style = edgeStyle(edge.type)
      const asked = selected.has(edge.fromNodeId) || selected.has(edge.toNodeId)
      if (style.shown === 'onSelect' && !asked)
        return []
      return [{
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        type: style.routing === 'step' ? 'smoothstep' : 'default',
        // The line already says what kind of relation it is, so the verb is
        // spelled out only when a reader has asked about one of its ends.
        ...(asked ? { label: edge.type } : {}),
        style,
      }]
    })
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
      : [{ nodeId: card.nodeId, node, x: card.x, y: card.y, width: nodeStyle(node.type).width }]
  })
}
