import type { Board, Card, Section } from '@newledge/board'
import type { LayoutEdge, LayoutNode, Placement } from '@newledge/board-layout'
import { orderedByPull, settledByPull } from '@newledge/board-layout'
import { edgeStyle, nodeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'
import { cardExtent } from './measure.js'
import { lineages } from './kinship.js'

/**
 * The grid the canvas draws, which the first arrangement lands on.
 * A layout answers in whatever coordinates suit it, and a board that opens
 * half a pixel off the grid can never be tidied by eye afterwards.
 */
const GRID = 24

function onGrid(value: number): number {
  return Math.round(value / GRID) * GRID
}

/**
 * A box on the grid, put there by both its edges rather than by one and a size.
 * Rounding a position and a size on their own moves the far edge by the two
 * roundings together, which on a section can close a gap the layout left.
 */
function boxOnGrid(box: { x: number, y: number, width: number, height: number }): typeof box {
  const [left, top] = [onGrid(box.x), onGrid(box.y)]
  return {
    x: left,
    y: top,
    width: onGrid(box.x + box.width) - left,
    height: onGrid(box.y + box.height) - top,
  }
}

// A node nobody filed sits with whatever it is about, so a claim lands beside
// its concept and a source beside what it introduced.
const STANDS_IN_FOR = ['concerns', 'introduces', 'belongsTo']

export interface Arrangement {
  /**
   * Where everything goes, which is all an arrangement decides. Whose board it
   * is and what it is called belong to the board, not to laying it out.
   */
  readonly board: Pick<Board, 'cards' | 'sections'>
  /** Where each line runs, when the placement worked that out as it placed. */
  readonly routes: ReadonlyMap<string, readonly { x: number, y: number }[]>
}

/**
 * How much of a section is kept clear for the name it carries.
 * The name is part of the section rather than a label floating over the gap
 * above it, so the section has to be tall enough to hold it.
 */
const SECTION_HEADER = 28

/**
 * Which relations put both their ends in one block, strongest first.
 * A whole with its parts, and then a concept with what is said about it. Both
 * are a thing and the things that hang off it, and both read as one object
 * rather than as several that happen to be related. A card claimed by two of
 * them goes with the first, so being part of something beats being talked
 * about, which is the stronger claim on where a card belongs.
 */
const BLOCKS: readonly string[] = ['contains', 'concerns']

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
 * Every node of a kind the board holds is placed, filed under the topic it
 * belongs to, and a topic becomes the section rather than a card sitting among
 * its members. A board that has not said which kinds it holds takes whatever
 * the drawing rules say is worth placing.
 */
export async function firstArrangement(
  graph: { nodes: readonly GraphNode[], edges: readonly GraphEdge[] },
  placement: Placement,
  holds?: readonly string[],
): Promise<Arrangement> {
  const topics = graph.nodes.filter(node => nodeStyle(node.type).ground)
  const placeable = graph.nodes.filter(node => (holds === undefined
    ? nodeStyle(node.type).placed
    : holds.includes(node.type)))
  const filedUnder = filing(graph, new Set(topics.map(topic => topic.id)))
  const named = new Map(topics.map(topic => [`topic-${topic.id}`, topic.name]))

  const sectionOf = (nodeId: string): string | undefined => {
    const [topicId] = [...(filedUnder.get(nodeId) ?? [])]
    return topicId === undefined ? undefined : `topic-${topicId}`
  }

  /**
   * A thing and what hangs off it, kept together as a block of their own.
   * The thing goes in with them rather than sitting outside, which is what
   * kept a parent a whole board away from what it contained. A card filed
   * under another topic stays where it was filed, since the section is ground
   * and a relation does not move a card off the ground it belongs to.
   *
   * A card joins the block the thing it hangs off is already in, rather than
   * starting one of its own around it, so a concept that is itself part of
   * something brings what is said about it along instead of being pulled out.
   */
  const partOf = new Map<string, string>()
  for (const type of BLOCKS) {
    const style = edgeStyle(type)
    for (const edge of graph.edges.filter(one => one.type === type)) {
      const [root, held] = style.rootAt === 'from'
        ? [edge.fromNodeId, edge.toNodeId]
        : [edge.toNodeId, edge.fromNodeId]
      if (partOf.has(held))
        continue
      // Filed elsewhere, a card stays where it was filed, since the ground
      // wins. Filed nowhere, there is nothing to lose by joining what holds it.
      const filed = sectionOf(held)
      if (filed !== undefined && filed !== sectionOf(root))
        continue
      const seat = partOf.get(root) ?? broodOf(root)
      partOf.set(held, seat)
      partOf.set(root, seat)
    }
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

  // A brood is a whole and its parts, which is a hierarchy however few it
  // holds, so its order comes from the relations inside it and not from how
  // well its members happen to pack.
  const broods = [...new Set(partOf.values())].map((id) => {
    const seat = sectionOf(id.slice(BROOD.length))
    return { id, ranked: true, ...(seat === undefined ? {} : { groupId: seat }) }
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
    groups: [...broods, ...[...named.keys()].map(id => ({ id, inset: { width: 0, height: SECTION_HEADER } }))],
  })

  const cards: Card[] = tidied(
    nodes.flatMap((node) => {
      const at = placed.nodes.get(node.id)
      return at === undefined ? [] : [{ nodeId: node.id, x: at.x, y: at.y }]
    }),
    partOf,
    new Map(nodes.map(node => [node.id, node])),
    edges,
  )
  const sections: Section[] = [...placed.groups]
    .filter(([id]) => !isBrood(id))
    .map(([id, box]) => ({ id, name: named.get(id) ?? id, ...box }))

  const shuffled = shuffledSections(sections, cards, edges, sectionOf)
  return {
    board: {
      cards: shuffled.cards.map(card => ({ ...card, x: onGrid(card.x), y: onGrid(card.y) })),
      sections: shuffled.sections.map(section => ({ ...section, ...boxOnGrid(section) })),
    },
    routes: placed.edges ?? new Map(),
  }
}

/**
 * How far apart two sections' tops may be and still be read as one row.
 * A packing lines a row up on its tallest member, so the rest of the row can
 * sit a little below without having left it.
 */
const SAME_ROW = 40

/**
 * Move whole sections along their rows so what relates sits nearer.
 *
 * A packing places a section by how well it fills a space, which says nothing
 * about what the section is about. Two sections that talk to each other can
 * end up at opposite ends of the board, and a relation that far apart is too
 * long to be worth drawing, so the board loses it. Where a section sits in its
 * row is free, in exactly the way the order of siblings in a family is free,
 * so it is spent the same way.
 *
 * A card goes wherever the section holding it went, since a section is ground
 * and moving it is moving everything standing on it.
 */
function shuffledSections(
  sections: readonly Section[],
  cards: readonly Card[],
  edges: readonly LayoutEdge[],
  sectionOf: (nodeId: string) => string | undefined,
): { sections: Section[], cards: Card[] } {
  const between: LayoutEdge[] = edges.flatMap((edge) => {
    const from = sectionOf(edge.from)
    const to = sectionOf(edge.to)
    return from === undefined || to === undefined || from === to
      ? []
      : [{ ...edge, from, to }]
  })
  if (between.length === 0)
    return { sections: [...sections], cards: [...cards] }

  const was = new Map(sections.map(section => [section.id, section]))
  const now = settledByPull(inRows(sections), between, was)
  const moved = new Map([...now]
    .map(([id, box]) => [id, box.x - was.get(id)!.x] as const)
    .filter(([, by]) => by !== 0))

  return {
    sections: sections.map(section => ({ ...section, x: now.get(section.id)?.x ?? section.x })),
    cards: cards.map((card) => {
      const by = moved.get(sectionOf(card.nodeId) ?? '')
      return by === undefined ? card : { ...card, x: card.x + by }
    }),
  }
}

/** The rows a packing left the sections in, each read from left to right. */
function inRows(sections: readonly Section[]): string[][] {
  const rows: Section[][] = []
  for (const section of [...sections].sort((one, other) => one.y - other.y)) {
    const row = rows[rows.length - 1]
    if (row === undefined || section.y - row[0]!.y > SAME_ROW)
      rows.push([section])
    else row.push(section)
  }
  return rows.map(row => row
    .sort((one, other) => one.x - other.x)
    .map(section => section.id))
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
  edges: readonly LayoutEdge[],
): Card[] {
  const at = new Map(cards.map(card => [card.nodeId, { ...card }]))
  const boxes = new Map(cards.flatMap((card) => {
    const size = extents.get(card.nodeId)
    return size === undefined ? [] : [[card.nodeId, { ...card, width: size.width, height: size.height }] as const]
  }))

  for (const brood of new Set(partOf.values())) {
    const parentId = brood.slice(BROOD.length)
    const members = [...partOf].filter(([, id]) => id === brood).map(([member]) => member)
    const children = members.filter(member => member !== parentId)

    for (const row of rows(children, at)) {
      // Which sibling is drawn leftmost says nothing about it, so the order is
      // spent on putting each of them nearest whatever pulls on it.
      const pulled = orderedByPull(row, edges, boxes)
      let left = onGrid(at.get(row[0]!)!.x)
      for (const childId of pulled) {
        at.get(childId)!.x = left
        left += onGrid((extents.get(childId)?.width ?? 0) + SIBLING_GAP)
      }
      const last = at.get(pulled[pulled.length - 1]!)!
      const span = { from: at.get(pulled[0]!)!.x, to: last.x + (extents.get(last.nodeId)?.width ?? 0) }
      const parent = at.get(parentId)
      if (parent !== undefined && pulled.length > 0)
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
