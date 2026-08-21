import type { Board, Card, Section } from '@newledge/board'
import type { LayoutEdge, LayoutNode, Placement } from '@newledge/board-layout'
import { nodeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'
import { cardExtent } from './measure.js'

const FIRST_BOARD = { id: 'board-1', name: 'My board' }

// A node nobody filed sits with whatever it is about, so a claim lands beside
// its concept and a source beside what it introduced.
const STANDS_IN_FOR = ['concerns', 'introduces', 'belongsTo']

export interface Arrangement {
  readonly board: Board
  /** Where each line runs, when the placement worked that out as it placed. */
  readonly routes: ReadonlyMap<string, readonly { x: number, y: number }[]>
}

/**
 * What a board opens on before a reader has touched it.
 * Every node the graph holds is placed, filed under the topic it belongs to,
 * and a topic becomes the section rather than a card sitting among its members.
 */
export async function firstArrangement(
  graph: { nodes: readonly GraphNode[], edges: readonly GraphEdge[] },
  placement: Placement,
): Promise<Arrangement> {
  const topics = graph.nodes.filter(node => nodeStyle(node.type).ground)
  const placeable = graph.nodes.filter(node => !nodeStyle(node.type).ground)
  const filedUnder = filing(graph, new Set(topics.map(topic => topic.id)))
  const named = new Map(topics.map(topic => [`topic-${topic.id}`, topic.name]))

  const nodes: LayoutNode[] = placeable.map((node) => {
    const [topicId] = [...(filedUnder.get(node.id) ?? [])]
    return {
      id: node.id,
      type: node.type,
      ...cardExtent(node),
      ...(topicId === undefined ? {} : { groupId: `topic-${topicId}` }),
    }
  })
  const edges: LayoutEdge[] = graph.edges.map(edge => ({
    id: edge.id,
    type: edge.type,
    from: edge.fromNodeId,
    to: edge.toNodeId,
  }))

  const placed = await placement.place({
    nodes,
    edges,
    groups: [...named.keys()].map(id => ({ id, inset: { width: 0, height: 24 } })),
  })

  const cards: Card[] = nodes.flatMap((node) => {
    const at = placed.nodes.get(node.id)
    return at === undefined ? [] : [{ nodeId: node.id, x: at.x, y: at.y }]
  })
  const sections: Section[] = [...placed.groups].map(([id, box]) => ({
    id,
    name: named.get(id) ?? id,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  }))

  return { board: { ...FIRST_BOARD, cards, sections }, routes: placed.edges ?? new Map() }
}

/**
 * Which topics each node is filed under.
 * A node with no filing of its own borrows the filing of what it speaks about,
 * so nothing lands far from the thing it exists to say something about.
 */
function filing(
  graph: { nodes: readonly GraphNode[], edges: readonly GraphEdge[] },
  topicIds: ReadonlySet<string>,
): Map<string, Set<string>> {
  const filed = new Map<string, Set<string>>()
  for (const edge of graph.edges) {
    if (edge.type !== 'belongsTo' || !topicIds.has(edge.toNodeId))
      continue
    const topics = filed.get(edge.fromNodeId) ?? new Set<string>()
    topics.add(edge.toNodeId)
    filed.set(edge.fromNodeId, topics)
  }

  for (const edge of graph.edges) {
    if (!STANDS_IN_FOR.includes(edge.type) || filed.has(edge.fromNodeId))
      continue
    const borrowed = filed.get(edge.toNodeId)
    if (borrowed !== undefined)
      filed.set(edge.fromNodeId, new Set(borrowed))
  }
  return filed
}
