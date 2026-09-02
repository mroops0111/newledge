import dagre from '@dagrejs/dagre'
import { nodeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'

/** The room something takes up, in the coordinates a layout works in. */
export interface Rectangle {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Where one node sits, which is all this layout decides about it. */
export interface Spot {
  readonly x: number
  readonly y: number
}

/**
 * How big a card is taken to be while it is being placed.
 * The height is the taller case,
 * a card carrying a description as well as a name,
 * so a line going round one has room even where the card renders short.
 */
const NODE_WIDTH = 200
const NODE_HEIGHT = 92

/**
 * How far apart the layout stands things.
 * The rank gap is wide enough for a verb to sit in it,
 * without touching the cards on either side,
 * since a line is labelled where a reader has asked about it.
 * The sibling gap is what makes a rank read as a row rather than a wall.
 */
const RANK_GAP = 110
const SIBLING_GAP = 64
const EDGE_GAP = 24

/**
 * Which way round a relation is ranked.
 *
 * The ontology writes containment from the container to what it holds,
 * and filing the other way, from the thing filed to the topic it sits under.
 * Ranking both as written puts a topic below everything standing on it,
 * which is the one arrangement a container must never be drawn in.
 *
 * So filing alone is turned round,
 * and every other relation ranks as the graph declares it.
 * Turning the rest round as well flattens the whole survey onto three ranks,
 * because most of what a graph holds answers to a source,
 * and a source is then above all of it.
 */
export function ranked(
  edge: GraphEdge,
  typeOf: (nodeId: string) => string | undefined,
): readonly [string, string] {
  const under = typeOf(edge.toNodeId)
  return under !== undefined && nodeStyle(under).ground
    ? [edge.toNodeId, edge.fromNodeId]
    : [edge.fromNodeId, edge.toNodeId]
}

/**
 * Where every node goes, worked out fresh from what is on the canvas.
 *
 * A survey is arranged by the machine rather than by a reader,
 * so there is nothing of theirs to preserve across a change,
 * and keeping old positions preserves an arrangement of a graph,
 * that is no longer the one being shown.
 * Asking for another kind re-reads the whole shape,
 * which is what a reader asking for it wanted to see.
 */
export function laidOut(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): ReadonlyMap<string, Spot> {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', ranksep: RANK_GAP, nodesep: SIBLING_GAP, edgesep: EDGE_GAP })
  graph.setDefaultEdgeLabel(() => ({}))
  const kind = new Map(nodes.map(node => [node.id, node.type]))
  const typeOf = (nodeId: string): string | undefined => kind.get(nodeId)

  for (const node of nodes)
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const edge of edges) {
    const ends = ranked(edge, typeOf)
    // A layout throws on a relation reaching a node it was never given.
    if (graph.node(ends[0]) && graph.node(ends[1]))
      graph.setEdge(ends[0], ends[1])
  }
  dagre.layout(graph)

  return new Map(nodes.map((node) => {
    const laid = graph.node(node.id) as { x?: number, y?: number } | undefined
    return [node.id, {
      x: (laid?.x ?? 0) - NODE_WIDTH / 2,
      y: (laid?.y ?? 0) - NODE_HEIGHT / 2,
    }]
  }))
}

/**
 * One arrangement, named by what it holds and measured by the room it takes.
 *
 * The two travel together because anything framing an arrangement needs both,
 * and because a name that has drifted from the room it was measured over,
 * frames the wrong thing without ever looking wrong.
 */
export interface Arrangement {
  /** What it holds, said so that two arrangements can be told apart. */
  readonly of: string
  /** The room it takes up, in the coordinates the layout works in. */
  readonly over: Rectangle
}

/**
 * What was arranged and the room it takes, or nothing when nothing was.
 *
 * The room is worked out from the placement rather than from the canvas,
 * since the canvas knows a card's size only once it has drawn it,
 * and anything framing a fresh arrangement is asking before that.
 * The sizes here are the ones the placement itself worked with,
 * so this is the room the layout asked for rather than a guess at it.
 */
export function arrangementOf(placed: ReadonlyMap<string, Spot>): Arrangement | undefined {
  const spots = [...placed.values()]
  if (spots.length === 0)
    return undefined
  const left = Math.min(...spots.map(spot => spot.x))
  const top = Math.min(...spots.map(spot => spot.y))
  return {
    of: [...placed.keys()].sort().join('|'),
    over: {
      x: left,
      y: top,
      width: Math.max(...spots.map(spot => spot.x + NODE_WIDTH)) - left,
      height: Math.max(...spots.map(spot => spot.y + NODE_HEIGHT)) - top,
    },
  }
}
