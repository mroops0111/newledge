import type { Box, LayoutEdge, Point } from '@newledge/board-layout'
import { edgeStyle } from './boardStyle.js'

/** How far under a parent the shared bar runs, when there is room for it. */
const TRUNK = 26

/** How far outside the parts a bracket sits. */
const BRACKET = 16

export interface Kinship {
  readonly edges: ReadonlyMap<string, readonly Point[]>
  /**
   * A box round what each card contains.
   * It is worked out from where the parts are now, so it follows a reader who
   * moves one and it survives a board being reopened. Keeping the parts
   * together in the first place is the layout's job, not this one's.
   */
  readonly broods: readonly (Box & { readonly id: string })[]
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
  const broods: (Box & { id: string })[] = []

  for (const [, group] of familiesIn(edges, at)) {
    const parent = at.get(group.parentId)!
    const children = group.edgeIds
      .map(id => ({ id, box: at.get(group.childOf.get(id)!)! }))
      .sort((one, other) => one.box.x - other.box.x)

    const highest = Math.min(...children.map(child => child.box.y))
    const bar = midpoint(parent.y + parent.height, highest)
    for (const child of children) {
      drawn.set(child.id, [
        { x: centre(parent), y: parent.y + parent.height },
        { x: centre(parent), y: bar },
        { x: centre(child.box), y: bar },
        { x: centre(child.box), y: child.box.y },
      ])
    }

    if (group.kin === 'brood')
      broods.push({ id: `brood-${group.parentId}`, ...enclosing(children.map(child => child.box)) })
  }

  return { edges: drawn, broods }
}

interface Family {
  readonly parentId: string
  readonly kin: 'family' | 'brood'
  readonly edgeIds: string[]
  readonly childOf: Map<string, string>
}

/** One family per parent and relation, since a card can be both a whole and a kind. */
function familiesIn(
  edges: readonly LayoutEdge[],
  at: ReadonlyMap<string, Box>,
): Map<string, Family> {
  const families = new Map<string, Family>()
  for (const edge of edges) {
    const kin = edgeStyle(edge.type).kin
    if (kin === 'curve' || !at.has(edge.from) || !at.has(edge.to))
      continue
    const key = `${edge.from}:${edge.type}`
    const family = families.get(key)
      ?? { parentId: edge.from, kin, edgeIds: [], childOf: new Map<string, string>() }
    family.edgeIds.push(edge.id)
    family.childOf.set(edge.id, edge.to)
    families.set(key, family)
  }
  return families
}

// A bar halfway between a parent and its nearest child, unless they sit so
// close that halfway would run through one of them.
function midpoint(below: number, above: number): number {
  return above - below > TRUNK * 2 ? (below + above) / 2 : below + TRUNK
}

function centre(box: Box): number {
  return box.x + box.width / 2
}

function enclosing(boxes: readonly Box[]): Box {
  const left = Math.min(...boxes.map(box => box.x)) - BRACKET
  const top = Math.min(...boxes.map(box => box.y)) - BRACKET
  return {
    x: left,
    y: top,
    width: Math.max(...boxes.map(box => box.x + box.width)) + BRACKET - left,
    height: Math.max(...boxes.map(box => box.y + box.height)) + BRACKET - top,
  }
}
