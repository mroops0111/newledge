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
    // Filed elsewhere, a part stays where it was filed, since the ground wins.
    // Filed nowhere, there is nothing to lose by joining what holds it.
    const filed = sectionOf(edge.toNodeId)
    if (filed !== undefined && filed !== sectionOf(edge.fromNodeId))
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
      ...cardExtent(node, (hangsOff.get(node.id) ?? []).length),
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

  const cards: Card[] = tidied(
    nodes.flatMap((node) => {
      const at = placed.nodes.get(node.id)
      return at === undefined ? [] : [{ nodeId: node.id, x: at.x, y: at.y }]
    }),
    partOf,
    new Map(nodes.map(node => [node.id, node])),
  ).map(card => ({ ...card, x: onGrid(card.x), y: onGrid(card.y) }))
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

/**
 * How far apart siblings sit, which is the same for every pair of them.
 * The step from one to the next is put on the grid here rather than left to be
 * rounded later, since rounding each of them on its own turns one even row
 * into gaps that differ by a rounding.
 */
const SIBLING_GAP = 56

/**
 * Even out a family after the layout has placed it.
 * A layout spaces siblings by whatever its own placement worked out, so the
 * gaps come back uneven and the parent lands wherever its edges pulled it,
 * which reads as carelessness however sound the reasoning behind it. Siblings
 * on one row are spaced alike and the parent is centred over them.
 */
function tidied(
  cards: readonly Card[],
  partOf: ReadonlyMap<string, string>,
  extents: ReadonlyMap<string, LayoutNode>,
): Card[] {
  const at = new Map(cards.map(card => [card.nodeId, { ...card }]))

  for (const brood of new Set(partOf.values())) {
    const parentId = brood.slice(BROOD.length)
    const members = [...partOf].filter(([, id]) => id === brood).map(([member]) => member)
    const children = members.filter(member => member !== parentId)

    for (const row of rows(children, at)) {
      let left = onGrid(at.get(row[0]!)!.x)
      for (const childId of row) {
        at.get(childId)!.x = left
        left += onGrid((extents.get(childId)?.width ?? 0) + SIBLING_GAP)
      }
      const last = at.get(row[row.length - 1]!)!
      const span = { from: at.get(row[0]!)!.x, to: last.x + (extents.get(last.nodeId)?.width ?? 0) }
      const parent = at.get(parentId)
      if (parent !== undefined && row.length > 0)
        parent.x = (span.from + span.to) / 2 - (extents.get(parentId)?.width ?? 0) / 2
    }
  }
  return [...at.values()]
}

/** Siblings sharing a line, since a family too wide for one sits on several. */
function rows(children: readonly string[], at: ReadonlyMap<string, Card>): string[][] {
  const byRow = new Map<number, string[]>()
  for (const childId of children) {
    const card = at.get(childId)
    if (card === undefined)
      continue
    byRow.set(card.y, [...(byRow.get(card.y) ?? []), childId])
  }
  return [...byRow]
    .sort(([one], [other]) => one - other)
    .map(([, row]) => row.sort((one, other) => at.get(one)!.x - at.get(other)!.x))
}
