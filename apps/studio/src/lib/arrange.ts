import type { Board, Card, Section } from '@newledge/board'
import type { LayoutEdge, LayoutNode, Placement } from '@newledge/board-layout'
import { nodeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'
import { cardExtent } from './measure.js'
import { lineages } from './kinship.js'

const FIRST_BOARD = { id: 'board-1', name: 'My board' }

/**
 * The grid the canvas draws, which the first arrangement lands on.
 * A layout answers in whatever coordinates suit it, and a board that opens
 * half a pixel off the grid can never be tidied by eye afterwards.
 */
const GRID = 24

function onGrid(value: number): number {
  return Math.round(value / GRID) * GRID
}

// A node nobody filed sits with whatever it is about, so a claim lands beside
// its concept and a source beside what it introduced.
const STANDS_IN_FOR = ['concerns', 'introduces', 'belongsTo']

export interface Arrangement {
  readonly board: Board
  /** Where each line runs, when the placement worked that out as it placed. */
  readonly routes: ReadonlyMap<string, readonly { x: number, y: number }[]>
}

const BROOD = 'brood-'

/** The id a card's parts are kept together under. */
export function broodOf(nodeId: string): string {
  return `${BROOD}${nodeId}`
}

export function isBrood(groupId: string): boolean {
  return groupId.startsWith(BROOD)
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
  const placeable = graph.nodes.filter(node => nodeStyle(node.type).placed)
  const filedUnder = filing(graph, new Set(topics.map(topic => topic.id)))
  const named = new Map(topics.map(topic => [`topic-${topic.id}`, topic.name]))

  const sectionOf = (nodeId: string): string | undefined => {
    const [topicId] = [...(filedUnder.get(nodeId) ?? [])]
    return topicId === undefined ? undefined : `topic-${topicId}`
  }

  /**
   * A whole and its parts, kept together as a group of their own.
   * The whole goes in with them rather than sitting outside, which is what
   * kept a parent a whole board away from what it contained. A part filed
   * under another topic stays where it was filed, since the section is ground
   * and a relation does not move a card off the ground it belongs to.
   */
  const partOf = new Map<string, string>()
  for (const edge of graph.edges) {
    if (edge.type !== 'contains' || partOf.has(edge.toNodeId))
      continue
    if (sectionOf(edge.toNodeId) !== sectionOf(edge.fromNodeId))
      continue
    partOf.set(edge.toNodeId, broodOf(edge.fromNodeId))
    partOf.set(edge.fromNodeId, broodOf(edge.fromNodeId))
  }

  const hangsOff = lineages(graph.edges)
  const nodes: LayoutNode[] = placeable.map((node) => {
    const seat = partOf.get(node.id) ?? sectionOf(node.id)
    return {
      id: node.id,
      type: node.type,
      ...cardExtent(node, hangsOff.has(node.id)),
      ...(seat === undefined ? {} : { groupId: seat }),
    }
  })

  const broods = [...new Set(partOf.values())].map((id) => {
    const seat = sectionOf(id.slice(BROOD.length))
    return { id, ...(seat === undefined ? {} : { groupId: seat }) }
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
    // The broods come first, since a group has to be whole before the one
    // holding it can be built round it.
    groups: [...broods, ...[...named.keys()].map(id => ({ id, inset: { width: 0, height: 24 } }))],
  })

  const cards: Card[] = nodes.flatMap((node) => {
    const at = placed.nodes.get(node.id)
    return at === undefined ? [] : [{ nodeId: node.id, x: onGrid(at.x), y: onGrid(at.y) }]
  })
  const sections: Section[] = [...placed.groups]
    .filter(([id]) => !isBrood(id))
    .map(([id, box]) => ({
      id,
      name: named.get(id) ?? id,
      x: onGrid(box.x),
      y: onGrid(box.y),
      width: onGrid(box.width),
      height: onGrid(box.height),
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
