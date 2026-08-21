import type { Board, Card, Section } from '@newledge/board'
import { nodeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'

const CARD = { width: 240, height: 108 }
// Cards are spaced so a relation between two of them has somewhere to be
// drawn, since a line hidden under a card says nothing.
const GAP = 56
const PAD = 20
// A section's name is drawn above its ground, so a row leaves room for it.
const TITLE = 28
const COLUMNS = 3
const LOOSE_COLUMNS = 5
const ROW_WIDTH = 2600
const FIRST_BOARD = { id: 'board-1', name: 'My board' }

// A node nobody filed sits with whatever it is about,
// so a claim lands beside its concept and a source beside what it introduced.
const STANDS_IN_FOR = ['concerns', 'introduces', 'belongsTo']

// Within a section, kinds stay together, which is what makes a section readable
// rather than a bag. Anything the ontology adds sorts after what it knows.
const ORDER = ['Topic', 'Concept', 'Claim', 'Source']

/**
 * What a board opens on before a reader has touched it.
 * Every node the graph holds is placed, filed under the topic it belongs to,
 * and a topic becomes the section rather than a card sitting among its members.
 */
export function firstArrangement(graph: {
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
}): Board {
  const placeable = ordered(graph.nodes.filter(node => !nodeStyle(node.type).ground))
  const topics = ordered(graph.nodes.filter(node => nodeStyle(node.type).ground))
  const filedUnder = filing(graph, new Set(topics.map(topic => topic.id)))

  const sections: Section[] = []
  const cards: Card[] = []
  const cursor = { x: PAD, y: PAD + TITLE }
  let tallest = 0

  for (const topic of topics) {
    const held = placeable.filter(node => filedUnder.get(node.id)?.has(topic.id) === true)
    if (held.length === 0)
      continue

    const extent = extentFor(held.length)
    if (cursor.x > PAD && cursor.x + extent.width > ROW_WIDTH) {
      cursor.x = PAD
      cursor.y += tallest + GAP + TITLE
      tallest = 0
    }
    sections.push({ id: `topic-${topic.id}`, name: topic.name, x: cursor.x, y: cursor.y, ...extent })
    cards.push(...held.map((node, index) => ({
      nodeId: node.id,
      ...gridded(index, { x: cursor.x + PAD, y: cursor.y + PAD }, columnsFor(held.length)),
    })))
    cursor.x += extent.width + GAP
    tallest = Math.max(tallest, extent.height)
  }

  // Anything nobody filed sits out in the open rather than in a section named
  // for the absence, since where it belongs is the reader's call.
  const unfiled = placeable.filter(node => filedUnder.get(node.id) === undefined)
  const loose = { x: PAD, y: cursor.y + (tallest === 0 ? 0 : tallest + GAP * 2) }
  cards.push(...unfiled.map((node, index) => ({
    nodeId: node.id,
    ...gridded(index, loose, LOOSE_COLUMNS),
  })))

  return { ...FIRST_BOARD, cards, sections }
}

function ordered(nodes: readonly GraphNode[]): GraphNode[] {
  return [...nodes].sort((one, other) =>
    rankOf(one.type) - rankOf(other.type) || one.name.localeCompare(other.name))
}

function rankOf(type: string): number {
  const rank = ORDER.indexOf(type)
  return rank === -1 ? ORDER.length : rank
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

// A section holding one card is drawn one card wide,
// so its size reads as how much is in it rather than as room left over.
function columnsFor(count: number): number {
  return Math.min(COLUMNS, Math.max(count, 1))
}

function extentFor(count: number): { width: number, height: number } {
  const columns = columnsFor(count)
  const rows = Math.ceil(count / columns)
  return {
    width: PAD * 2 + columns * CARD.width + (columns - 1) * GAP,
    height: PAD * 2 + rows * CARD.height + (rows - 1) * GAP,
  }
}

function gridded(index: number, origin: { x: number, y: number }, columns: number): { x: number, y: number } {
  return {
    x: origin.x + (index % columns) * (CARD.width + GAP),
    y: origin.y + Math.floor(index / columns) * (CARD.height + GAP),
  }
}
