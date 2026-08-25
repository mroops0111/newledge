import type { Box, LayoutEdge, Point } from '@newledge/board-layout'
import { pathCrossesBox } from '@newledge/board-layout'
import { edgeStyle } from './boardStyle.js'

/** How far under a parent the shared bar runs, when there is room for it. */
const TRUNK = 26

export interface Kinship {
  readonly edges: ReadonlyMap<string, readonly Point[]>
}

/**
 * Where the relations that make a hierarchy run.
 * Siblings share one trunk rather than each taking its own way round,
 * which is what makes a family tree read as one relation with several ends,
 * rather than as several unrelated lines. Parts run the same way,
 * and the box round them comes from the layout,
 * which is the only thing that can keep them together.
 *
 * A trunk is worked out from where the cards are and from nothing else,
 * so it is only honest where the layout gathered the family in the first place.
 * Given one it never gathered,
 * the bar reaches across the board and the stems cross whatever stands between,
 * which is exactly what a router would have gone round.
 * A family whose trunk would run through a card is not drawn as one at all,
 * and its relations are routed like any other line.
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

    const kept = new Set([group.parentId, ...group.edgeIds.map(id => group.childOf.get(id)!)])
    const others = [...at].filter(([id]) => !kept.has(id)).map(([, box]) => box)
    const trunk = trunkFor(parent, children.map(child => child.box), others)

    // Drawn from the child towards the root,
    // so the end that says what the relation is lands from outside the root.
    // Drawn the other way it points back into the card and is covered by it.
    const runs = children.map(child => ({
      id: child.id,
      run: [
        { x: centre(child.box), y: leaving(child.box, trunk.bar) },
        { x: centre(child.box), y: trunk.bar },
        { x: centre(parent), y: trunk.bar },
        { x: centre(parent), y: trunk.root },
      ],
    }))

    // Checked against every card but the two each run joins, siblings included.
    // A stem drops from its own child to the bar,
    // and passes whatever is under it on the way,
    // and what is under it is most often the sibling,
    // the trunk was drawn to gather it with.
    const blocked = runs.some(one => runsThrough(one.run, [...at]
      .filter(([id]) => id !== group.parentId && id !== group.childOf.get(one.id))
      .map(([, box]) => box)))
    if (blocked)
      continue
    for (const one of runs)
      drawn.set(one.id, one.run)
  }

  return { edges: drawn }
}

interface Family {
  readonly parentId: string
  readonly edgeIds: string[]
  readonly childOf: Map<string, string>
}

/**
 * One family per root and relation, since a card can be a whole and a kind.
 * Which end is the root follows from the relation, not from how it was written.
 * A whole contains its parts, so a part-of runs from the root,
 * while a kind extends what it is a kind of, so an is-a runs towards it.
 *
 * Any relation that names a root makes a family, not only a hierarchy.
 * Eight claims about one concept are eight lines converging on it,
 * from wherever each claim happens to sit, which reads as a spray.
 * Gathered onto one bar they read as what they are,
 * and they cost the concept one place on its border rather than eight.
 */
function familiesIn(
  edges: readonly LayoutEdge[],
  at: ReadonlyMap<string, Box>,
): Map<string, Family> {
  const families = new Map<string, Family>()
  for (const edge of edges) {
    const style = edgeStyle(edge.type)
    if (style.rootAt === undefined || !at.has(edge.from) || !at.has(edge.to))
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
 * A layout is free to put children above their root as readily as below,
 * so the trunk goes to whichever side most of them are on,
 * rather than always downwards.
 * Sent the wrong way it runs straight through the root's own card,
 * and comes out the far side, which reads as a line that has been cut in two.
 *
 * The bar also has to clear every card it runs past,
 * its own family's and anyone else's,
 * since a card is drawn over the lines that reach it.
 * A family spread wide enough has a bar long enough to reach cards,
 * that have nothing to do with it,
 * and run through one it reads as two lines with a gap.
 */
function trunkFor(root: Box, children: readonly Box[], others: readonly Box[]): { bar: number, root: number } {
  const under = root.y + root.height
  const below = children.filter(child => middle(child) > middle(root))
  const reaches = {
    from: Math.min(centre(root), ...children.map(centre)),
    to: Math.max(centre(root), ...children.map(centre)),
  }

  if (below.length * 2 >= children.length) {
    const straddling = children.filter(child => child.y < under)
    const clear = Math.max(under, ...straddling.map(child => child.y + child.height))
    const highest = Math.min(...children.map(child => child.y))
    const wanted = straddling.length === 0 && highest - under > TRUNK * 2
      ? (under + highest) / 2
      : clear + TRUNK
    return { bar: lane(wanted, under, reaches, 1, [...children, ...others]), root: under }
  }

  const straddling = children.filter(child => child.y + child.height > root.y)
  const clear = Math.min(root.y, ...straddling.map(child => child.y))
  const lowest = Math.max(...children.map(child => child.y + child.height))
  const wanted = straddling.length === 0 && root.y - lowest > TRUNK * 2
    ? (root.y + lowest) / 2
    : clear - TRUNK
  return { bar: lane(wanted, root.y, reaches, -1, [...children, ...others]), root: root.y }
}

/**
 * The nearest height the bar can run at without passing through a card.
 * Only heights on the far side of the face it leaves the root by are taken,
 * since coming back past that face would send the root's own stem,
 * back through the root's card.
 * Nearer the wanted height is better whichever way it lies,
 * so a bar squeezed by a card goes to whichever side of it has more room.
 * Nothing free means the bar runs where it wanted to,
 * which is the best of a bad job on a board with no room left in it.
 */
function lane(
  wanted: number,
  beyond: number,
  reaches: { from: number, to: number },
  away: number,
  cards: readonly Box[],
): number {
  const inTheWay = cards.filter(card => card.x < reaches.to && card.x + card.width > reaches.from)
  const blocked = (y: number): boolean =>
    inTheWay.some(card => card.y <= y && y <= card.y + card.height)
  if (!blocked(wanted))
    return wanted

  const free = inTheWay
    .flatMap(card => [card.y - TRUNK, card.y + card.height + TRUNK])
    .filter(y => (y - beyond) * away > 0 && !blocked(y))
    .sort((one, other) => Math.abs(one - wanted) - Math.abs(other - wanted))
  return free[0] ?? wanted
}

function middle(box: Box): number {
  return box.y + box.height / 2
}

/** Whether any run of a trunk passes through one of the cards it must clear. */
function runsThrough(run: readonly Point[], others: readonly Box[]): boolean {
  return others.some(box => pathCrossesBox(run, box))
}

/** The side of a card the bar is on, which is the side a line leaves by. */
function leaving(child: Box, bar: number): number {
  return bar >= child.y + child.height ? child.y + child.height : child.y
}

/** Where a card sits across the board, which is what a trunk lines up on. */
function centre(box: Box): number {
  return box.x + box.width / 2
}
