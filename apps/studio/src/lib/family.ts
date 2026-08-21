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

    const bar = barFor(parent, children.map(child => child.box))
    for (const child of children) {
      // Drawn from the child towards the root, so the end that says what the
      // relation is lands on the root from outside it. Drawn the other way it
      // would point back into the card and be covered by it.
      drawn.set(child.id, [
        { x: centre(child.box), y: leaving(child.box, bar) },
        { x: centre(child.box), y: bar },
        { x: centre(parent), y: bar },
        { x: centre(parent), y: parent.y + parent.height },
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
    const kin = edgeStyle(edge.type).kin
    if (kin === 'curve' || !at.has(edge.from) || !at.has(edge.to))
      continue
    const [parentId, childId] = kin === 'brood' ? [edge.from, edge.to] : [edge.to, edge.from]
    const key = `${parentId}:${edge.type}`
    const family = families.get(key)
      ?? { parentId, kin, edgeIds: [], childOf: new Map<string, string>() }
    family.edgeIds.push(edge.id)
    family.childOf.set(edge.id, childId)
    families.set(key, family)
  }
  return families
}

/**
 * Where the bar every sibling shares runs.
 * It has to clear every card in the family, since a card is drawn over the
 * lines that reach it and a bar crossing one would take the run that leads to
 * it out of sight. When every child sits below the parent there is room for
 * the bar between them, and otherwise it goes under whichever of them reaches
 * lowest.
 */
function barFor(parent: Box, children: readonly Box[]): number {
  const under = parent.y + parent.height
  const beside = children.filter(child => child.y < under)
  if (beside.length === 0) {
    const highest = Math.min(...children.map(child => child.y))
    return highest - under > TRUNK * 2 ? (under + highest) / 2 : under + TRUNK
  }
  return Math.max(under, ...beside.map(child => child.y + child.height)) + TRUNK
}

/** The side of a card the bar is on, which is the side a line leaves by. */
function leaving(child: Box, bar: number): number {
  return bar >= child.y + child.height ? child.y + child.height : child.y
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
