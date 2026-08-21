import type { Board, Card, Section } from '@newledge/board'
import type { GraphEdge, GraphNode } from './graph.js'

const CARD = { width: 240, height: 104 }
const GAP = 24
const PAD = 20
// A section's name is drawn above its ground, so a row leaves room for it.
const TITLE = 28
const COLUMNS = 2
const LOOSE_COLUMNS = 4
const ROW_WIDTH = 2200
const FIRST_BOARD = { id: 'board-1', name: 'My board' }

/**
 * What a board opens on before a reader has touched it.
 * Concepts are what a reader thinks with, so those are laid out, and the claims
 * and sources behind them are left for a reader to pull in when they want the
 * evidence. Everything here is a starting point a reader is expected to redraw.
 */
export function firstArrangement(graph: {
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
}): Board {
  const concepts = byName(graph.nodes.filter(node => node.type === 'Concept'))
  const topics = byName(graph.nodes.filter(node => node.type === 'Topic'))
  const filedUnder = filing(graph.edges, new Set(concepts.map(concept => concept.id)))

  const sections: Section[] = []
  const cards: Card[] = []
  const cursor = { x: PAD, y: PAD + TITLE }
  let tallest = 0

  for (const topic of topics) {
    const held = concepts.filter(concept => filedUnder.get(concept.id)?.has(topic.id) === true)
    if (held.length === 0)
      continue

    const extent = extentFor(held.length)
    if (cursor.x > PAD && cursor.x + extent.width > ROW_WIDTH) {
      cursor.x = PAD
      cursor.y += tallest + GAP + TITLE
      tallest = 0
    }
    sections.push({ id: `topic-${topic.id}`, name: topic.name, x: cursor.x, y: cursor.y, ...extent })
    cards.push(...held.map((concept, index) => ({
      nodeId: concept.id,
      ...gridded(index, { x: cursor.x + PAD, y: cursor.y + PAD }, columnsFor(held.length)),
    })))
    cursor.x += extent.width + GAP
    tallest = Math.max(tallest, extent.height)
  }

  // A concept nobody has filed sits out in the open rather than in a section
  // named for the absence, since where it belongs is the reader's call.
  const unfiled = concepts.filter(concept => filedUnder.get(concept.id) === undefined)
  const loose = { x: PAD, y: cursor.y + (tallest === 0 ? 0 : tallest + GAP * 2) }
  cards.push(...unfiled.map((concept, index) => ({
    nodeId: concept.id,
    ...gridded(index, loose, LOOSE_COLUMNS),
  })))

  return { ...FIRST_BOARD, cards, sections }
}

function byName(nodes: readonly GraphNode[]): GraphNode[] {
  return [...nodes].sort((one, other) => one.name.localeCompare(other.name))
}

/**
 * Which topics each concept is filed under,
 * dropping edges to nodes that are not being laid out.
 */
function filing(edges: readonly GraphEdge[], conceptIds: ReadonlySet<string>): Map<string, Set<string>> {
  const filed = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (edge.type !== 'belongsTo' || !conceptIds.has(edge.fromNodeId))
      continue
    const topics = filed.get(edge.fromNodeId) ?? new Set<string>()
    topics.add(edge.toNodeId)
    filed.set(edge.fromNodeId, topics)
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
