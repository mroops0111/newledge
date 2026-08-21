import { edgeStyle } from './boardStyle.js'
import type { GraphEdge } from './graph.js'

/**
 * The colours a family can be drawn in.
 * Low saturation, since this is worn by a card rather than shouted by it, and
 * kept clear of the green and red that agreement and conflict own. Which
 * colour a family gets means nothing, only that two families differ.
 */
export const FAMILY_COLOURS: readonly string[] = [
  'var(--kin-1)',
  'var(--kin-2)',
  'var(--kin-3)',
  'var(--kin-4)',
  'var(--kin-5)',
  'var(--kin-6)',
]

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
  const rootOf = new Map<string, string>()

  for (const edge of edges) {
    const kin = edgeStyle(edge.type).kin
    if (kin === 'curve')
      continue
    // A whole holds its parts and a kind extends what it is a kind of, so the
    // two are written in opposite directions and only one end is the root.
    const [root, member] = kin === 'brood'
      ? [edge.fromNodeId, edge.toNodeId]
      : [edge.toNodeId, edge.fromNodeId]
    rootOf.set(member, root)
    rootOf.set(root, root)
  }

  // Sorted, so the same graph wears the same colours every time it is opened.
  const roots = [...new Set(rootOf.values())].sort()
  const worn = new Map(roots.map((root, index) =>
    [root, FAMILY_COLOURS[index % FAMILY_COLOURS.length]!]))

  return new Map([...rootOf].map(([id, root]) => [id, worn.get(root)!]))
}
