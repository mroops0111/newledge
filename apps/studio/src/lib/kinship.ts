import { edgeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'

/** What a card hangs off, said on the card so it need not be traced. */
export interface Lineage {
  readonly parentId: string
  readonly type: string
}

/**
 * Which relation a card names first when it names more than one.
 * Being part of something is a stronger claim about where a card belongs than
 * being a kind of something, so it leads, and the rest follow in the order the
 * ontology declares them.
 */
const NAMED_FIRST = ['contains', 'extends', 'instantiates']

/**
 * What each card hangs off, and how, all of it.
 * A card can be part of one thing and a kind of another, and naming only the
 * first leaves the second with nowhere to be said at all. A colour says which
 * family a card is in but not which card it answers to, and a line says that
 * only to a reader willing to follow it, so the card carries the answer too.
 */
export function lineages(edges: readonly GraphEdge[]): Map<string, Lineage[]> {
  const held = new Map<string, Lineage[]>()
  for (const edge of edges) {
    const style = edgeStyle(edge.type)
    if (style.kin !== 'tree')
      continue
    const [parentId, child] = style.rootAt === 'from'
      ? [edge.fromNodeId, edge.toNodeId]
      : [edge.toNodeId, edge.fromNodeId]
    held.set(child, [...(held.get(child) ?? []), { parentId, type: edge.type }])
  }

  for (const [child, all] of held) {
    held.set(child, [...all].sort((one, other) =>
      rankOf(one.type) - rankOf(other.type) || one.parentId.localeCompare(other.parentId)))
  }
  return held
}

function rankOf(type: string): number {
  const rank = NAMED_FIRST.indexOf(type)
  return rank === -1 ? NAMED_FIRST.length : rank
}

/** How a lineage is written on a card, in the vocabulary its line already uses. */
export function lineageLabel(lineage: Lineage, byId: ReadonlyMap<string, GraphNode>): string {
  const name = byId.get(lineage.parentId)?.name ?? lineage.parentId
  return lineage.type === 'contains' ? `Part of ${name}` : `Kind of ${name}`
}

/**
 * What a card wears when it belongs to nothing.
 * Neutral rather than a colour, so a colour always means membership and never
 * has to be told apart from a card that simply has no family.
 */
export const NO_FAMILY = 'kin-none'

/**
 * The colours a family can be drawn in.
 * Which colour a family gets means nothing, only that two families differ.
 * Kept clear of the green and red that agreement and conflict own.
 */
export const FAMILY_COLOURS: readonly string[] = [
  'kin-1',
  'kin-2',
  'kin-3',
  'kin-4',
  'kin-5',
  'kin-6',
]

/** Every colour a card or a line can be drawn in for belonging to something. */
export const KINSHIP_KEYS: readonly string[] = [...FAMILY_COLOURS, NO_FAMILY]

/** A key names a colour rather than being one, so a marker can be cut for it. */
export function kinColour(key: string): string {
  return `var(--${key})`
}

/**
 * Which family each card belongs to, and what colour that family wears.
 * A whiteboard is looked at rather than read, so belonging is said in colour
 * and in where a card sits, not in a line a reader has to trace or a sentence
 * they have to read off the card.
 *
 * A card in no family gets nothing, so the colour means membership rather than
 * decorating every card equally.
 */
export function familyColours(edges: readonly GraphEdge[]): Map<string, string> {
  return worthWearing(edges).byNode
}

/**
 * What the family led by each card wears.
 * A relation belongs to the family its parent leads, not to the one its child
 * leads, and a middle card leads one of its own, so asking the child gives the
 * wrong answer for the line that reaches it.
 */
export function familyOfRoot(edges: readonly GraphEdge[]): Map<string, string> {
  return worthWearing(edges).byRoot
}

function worthWearing(edges: readonly GraphEdge[]): {
  byNode: Map<string, string>
  byRoot: Map<string, string>
} {
  // Taken from the same choice a card writes on itself, since a card wearing
  // one family and naming another says two things and settles neither.
  const rootOf = new Map<string, string>()
  for (const [child, all] of lineages(edges)) {
    for (const lineage of all)
      rootOf.set(lineage.parentId, lineage.parentId)
    rootOf.set(child, all[0]!.parentId)
  }

  // A colour worn by one card alone announces a group that is not there.
  const wearers = new Map<string, number>()
  for (const root of rootOf.values())
    wearers.set(root, (wearers.get(root) ?? 0) + 1)

  // Sorted, so the same graph wears the same colours every time it is opened.
  const roots = [...wearers].filter(([, count]) => count > 1).map(([root]) => root).sort()
  const worn = new Map(roots.map((root, index) =>
    [root, FAMILY_COLOURS[index % FAMILY_COLOURS.length]!]))

  return {
    byNode: new Map([...rootOf]
      .filter(([, root]) => worn.has(root))
      .map(([id, root]) => [id, worn.get(root)!])),
    byRoot: worn,
  }
}
