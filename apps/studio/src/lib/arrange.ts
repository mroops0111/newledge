import type { Board, Card, Section } from '@newledge/board'
import type { LayoutEdge, LayoutNode, Placement } from '@newledge/board-layout'
import { edgeStyle, nodeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'
import { broodOf, isBrood, rootOf } from './brood.js'
import { boxOnGrid, onGrid } from './grid.js'
import { broughtNear, closedUp, groundsUnder, looseBoxes, shuffledSections } from './grounds.js'
import { cardExtent } from './measure.js'
import { columned, linedUp, settledInGrounds, tidied } from './tidying.js'
import { sectionOf } from './topic.js'

// A node nobody filed sits with whatever it is about,
// so a claim lands beside its concept and a source beside what it introduced.
const STANDS_IN_FOR = ['concerns', 'introduces', 'belongsTo']

/**
 * Where everything goes, which is all an arrangement decides.
 * Whose board it is and what it is called belong to the board,
 * not to laying it out.
 */
export interface Arrangement {
  readonly board: Pick<Board, 'cards' | 'sections'>
}

/**
 * How much of a section is kept clear for the name it carries.
 * The name is part of the section, not a label floating over the gap above it,
 * so the section has to be tall enough to hold it.
 *
 * Tall enough for the name a board is read at rather than for the name at rest.
 * A board zoomed out draws its type at a fraction of its size,
 * so a name that is to stay readable has to grow, and it grows into this.
 * Three grid steps, since what the layout leaves lands on a grid line anyway.
 */
export const SECTION_HEADER = 72

/**
 * Which relations put both their ends in one block, strongest first.
 * A whole with its parts, and then a concept with what is said about it.
 * Both are a thing and the things that hang off it,
 * and both read as one object rather than as several that happen to be related.
 * A card claimed by two of them goes with the first,
 * so being part of something beats being talked about,
 * which is the stronger claim on where a card belongs.
 *
 * A part keeps its own ground. It is a thing in its own right,
 * and a reader may file it under whatever topic they like,
 * so being filed somewhere beats being held by something. A claim does not.
 * It is evidence about a concept,
 * and has no business sitting under a topic away from what it is about,
 * so it follows the concept off its own ground.
 */
const BLOCKS: readonly { readonly type: string, readonly ownGround: boolean }[] = [
  { type: 'contains', ownGround: true },
  { type: 'concerns', ownGround: false },
]

/**
 * Which nodes an arrangement is of.
 * One question with two answers, rather than a filter on kinds,
 * which could only ever answer one of them.
 */
export type Chosen = (node: GraphNode) => boolean

/**
 * The nodes a board of these kinds opens on, which is how a board is seeded.
 * A board that has not said which kinds it holds,
 * takes whatever the drawing rules say is worth placing.
 */
export function ofKinds(holds: readonly string[] | undefined): Chosen {
  return node => (holds === undefined ? nodeStyle(node.type).placed : holds.includes(node.type))
}

/**
 * The nodes a board already holds, which is what laying one out again is of.
 *
 * A board is seeded from kinds once and is the reader's from then on.
 * Laying it out again from those kinds drops everything they have put on since,
 * and brings back everything they took off,
 * which is rearranging somebody else's board rather than theirs.
 */
export function alreadyOn(cards: readonly { readonly nodeId: string }[]): Chosen {
  const on = new Set(cards.map(card => card.nodeId))
  return node => on.has(node.id)
}

/**
 * What a board opens on before a reader has touched it.
 * Every chosen node is placed, filed under the topic it belongs to,
 * and a topic becomes the section rather than a card sitting among its members.
 * What is chosen is the caller's to say,
 * because a board being seeded and a board being laid out again,
 * are asking about different sets, and only the caller knows which.
 */
export async function firstArrangement(
  graph: { nodes: readonly GraphNode[], edges: readonly GraphEdge[] },
  placement: Placement,
  chosen: Chosen = ofKinds(undefined),
): Promise<Arrangement> {
  const topics = graph.nodes.filter(node => nodeStyle(node.type).ground)
  const placeable = graph.nodes.filter(node => chosen(node))
  const filedUnder = filing(graph, new Set(topics.map(topic => topic.id)))
  const named = new Map(topics.map(topic => [sectionOf(topic.id), topic.name]))

  const filedIn = (nodeId: string): string | undefined => {
    const [topicId] = [...(filedUnder.get(nodeId) ?? [])]
    return topicId === undefined ? undefined : sectionOf(topicId)
  }

  /**
   * A thing and what hangs off it, kept together as a block of their own.
   * The thing goes in with them rather than sitting outside,
   * which is what kept a parent a whole board away from what it contained.
   * A card filed under another topic stays where it was filed,
   * since the section is ground,
   * and a relation does not move a card off the ground it belongs to.
   *
   * A card joins the block the thing it hangs off is already in,
   * rather than starting one of its own around it,
   * so a concept that is itself part of something,
   * brings what is said about it along instead of being pulled out.
   */
  const partOf = new Map<string, string>()
  for (const block of BLOCKS) {
    const style = edgeStyle(block.type)
    for (const edge of graph.edges.filter(one => one.type === block.type)) {
      const [root, held] = style.rootAt === 'from'
        ? [edge.fromNodeId, edge.toNodeId]
        : [edge.toNodeId, edge.fromNodeId]
      if (partOf.has(held))
        continue
      const filed = filedIn(held)
      if (block.ownGround && filed !== undefined && filed !== filedIn(root))
        continue
      const seat = partOf.get(root) ?? broodOf(root)
      partOf.set(held, seat)
      partOf.set(root, seat)
    }
  }

  const nodes: LayoutNode[] = placeable.map((node) => {
    const seat = partOf.get(node.id) ?? filedIn(node.id)
    return {
      id: node.id,
      type: node.type,
      ...cardExtent(node),
      ...(seat === undefined ? {} : { groupId: seat }),
    }
  })

  // A brood is a whole and its parts,
  // which is a hierarchy however few it holds,
  // so its order comes from the relations inside it,
  // and not from how well its members happen to pack.
  const broods = [...new Set(partOf.values())].map((id) => {
    const seat = filedIn(rootOf(id))
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
    // The broods come first,
    // since a group has to be whole before the one holding it is built.
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

  const extents = new Map(nodes.map(node => [node.id, node]))
  const ordered = settledInGrounds(cards, extents, edges, sections, partOf)
  const columns = columned(ordered, extents, sections)
  const lined = linedUp(columns, extents, edges, sections)
  // Which ground a card stands on,
  // read from where it is rather than from what it was filed under.
  // A card the ontology filed nowhere still stands somewhere,
  // and a ground that moved without it would slide out from under it,
  // and leave every relation it had stretched.
  const standingOn = groundsUnder(lined, extents, sections)
  const loose = looseBoxes(lined, extents, standingOn)
  const shuffled = shuffledSections(sections, lined, edges, standingOn)
  const closed = closedUp(shuffled.sections, shuffled.cards, standingOn, loose)
  const near = broughtNear(closed.sections, closed.cards, extents, edges, standingOn, loose)
  return {
    board: {
      cards: near.cards.map(card => ({ ...card, x: onGrid(card.x), y: onGrid(card.y) })),
      sections: near.sections.map(section => ({ ...section, ...boxOnGrid(section) })),
    },
  }
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
