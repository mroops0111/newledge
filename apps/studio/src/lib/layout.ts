import dagre from '@dagrejs/dagre'
import type { GraphEdge, GraphNode } from './graph.js'

export interface Placement {
  readonly x: number
  readonly y: number
}

const NODE_WIDTH = 240
const NODE_HEIGHT = 96

/**
 * Place nodes that have never been placed, and leave the rest where they are.
 * A board is where a reader arranges what they understand,
 * so a position they chose is never recomputed.
 * An arrival only has to start somewhere sensible rather than heaped at the origin.
 */
export function placeArrivals(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  placed: ReadonlyMap<string, Placement>,
): ReadonlyMap<string, Placement> {
  const arrivals = nodes.filter(node => !placed.has(node.id))
  if (arrivals.length === 0)
    return placed

  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 64 })
  graph.setDefaultEdgeLabel(() => ({}))
  for (const node of nodes)
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const edge of edges)
    graph.setEdge(edge.fromNodeId, edge.toNodeId)
  dagre.layout(graph)

  const next = new Map(placed)
  for (const node of arrivals) {
    const laid = graph.node(node.id) as { x?: number, y?: number } | undefined
    next.set(node.id, {
      x: (laid?.x ?? 0) - NODE_WIDTH / 2,
      y: (laid?.y ?? 0) - NODE_HEIGHT / 2,
    })
  }
  return next
}
