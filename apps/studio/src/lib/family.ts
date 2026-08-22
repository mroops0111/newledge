import type { Box, LayoutEdge, Point } from '@newledge/board-layout'
import { edgeStyle } from './boardStyle.js'

/** How far under a parent the shared bar runs, when there is room for it. */
const TRUNK = 26

export interface Kinship {
  readonly edges: ReadonlyMap<string, readonly Point[]>
}

/**
 * Where the relations that make a hierarchy run.
 * Siblings share one trunk rather than each taking its own way round, which is
 * what makes a family tree read as one relation with several ends instead of
 * as several unrelated lines. Parts run the same way, and the box round them
 * comes from the layout, which is the only thing that can keep them together.
 */
export function kinship(
  edges: readonly LayoutEdge[],
  at: ReadonlyMap<string, Box>,
): Kinship {
  const drawn = new Map<string, readonly Point[]>()

  for (const [, group] of familiesIn(edges, at)) {
    const parent = at.get(group.parentId)!
    const children = group.edgeIds
      .map(id => ({ id, box: at.get(group.childOf.get(id)!)! }))
      .sort((one, other) => one.box.x - other.box.x)

    const trunk = trunkFor(parent, children.map(child => child.box))
    for (const child of children) {
      // Drawn from the child towards the root, so the end that says what the
      // relation is lands on the root from outside it. Drawn the other way it
      // would point back into the card and be covered by it.
      drawn.set(child.id, [
        { x: centre(child.box), y: leaving(child.box, trunk.bar) },
        { x: centre(child.box), y: trunk.bar },
        { x: centre(parent), y: trunk.bar },
        { x: centre(parent), y: trunk.root },
      ])
    }
  }

  return { edges: drawn }
}

interface Family {
  readonly parentId: string
  readonly edgeIds: string[]
  readonly childOf: Map<string, string>
}

/**
 * One family per root and relation, since a card can be both a whole and a kind.
 * Which end is the root follows from the relation, not from how it was written.
 * A whole contains its parts, so a part-of runs from the root, while a kind
 * extends what it is a kind of, so an is-a runs towards it.
 */
function familiesIn(
  edges: readonly LayoutEdge[],
  at: ReadonlyMap<string, Box>,
): Map<string, Family> {
  const families = new Map<string, Family>()
  for (const edge of edges) {
    const style = edgeStyle(edge.type)
    if (style.kin !== 'tree' || !at.has(edge.from) || !at.has(edge.to))
      continue
    const [parentId, childId] = style.rootAt === 'from' ? [edge.from, edge.to] : [edge.to, edge.from]
    const key = `${parentId}:${edge.type}`
    const family = families.get(key)
      ?? { parentId, edgeIds: [], childOf: new Map<string, string>() }
    family.edgeIds.push(edge.id)
    family.childOf.set(edge.id, childId)
    families.set(key, family)
  }
  return families
}

/**
 * Where the bar every sibling shares runs, and which face of the root it meets.
 * A layout is free to put children above their root as readily as below, so
 * the trunk goes to whichever side most of them are on rather than always
 * downwards. Sent the wrong way it runs straight through the root's own card
 * and comes out the far side, which reads as a line that has been cut in two.
 *
 * The bar also has to clear every card in the family, since a card is drawn
 * over the lines that reach it.
 */
function trunkFor(root: Box, children: readonly Box[]): { bar: number, root: number } {
  const under = root.y + root.height
  const below = children.filter(child => middle(child) > middle(root))

  if (below.length * 2 >= children.length) {
    const straddling = children.filter(child => child.y < under)
    const clear = Math.max(under, ...straddling.map(child => child.y + child.height))
    const highest = Math.min(...children.map(child => child.y))
    return {
      bar: straddling.length === 0 && highest - under > TRUNK * 2
        ? (under + highest) / 2
        : clear + TRUNK,
      root: under,
    }
  }

  const straddling = children.filter(child => child.y + child.height > root.y)
  const clear = Math.min(root.y, ...straddling.map(child => child.y))
  const lowest = Math.max(...children.map(child => child.y + child.height))
  return {
    bar: straddling.length === 0 && root.y - lowest > TRUNK * 2
      ? (root.y + lowest) / 2
      : clear - TRUNK,
    root: root.y,
  }
}

function middle(box: Box): number {
  return box.y + box.height / 2
}

/** The side of a card the bar is on, which is the side a line leaves by. */
function leaving(child: Box, bar: number): number {
  return bar >= child.y + child.height ? child.y + child.height : child.y
}

function centre(box: Box): number {
  return box.x + box.width / 2
}
