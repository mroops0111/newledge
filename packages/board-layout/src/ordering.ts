import type { Box, LayoutEdge } from './ports.js'

export interface Pull {
  /**
   * Whether the things being ordered pull on one another as well.
   *
   * Off by default, since a set being ordered all at once out of nothing has
   * no positions worth pulling towards, only the arbitrary ones it arrived
   * with. On when they already sit somewhere and this is one pass of several,
   * which is what lets a set that relates mostly to itself settle at all.
   */
  readonly feelEachOther?: boolean
}

/**
 * Order things whose order carries no meaning by where what they relate to sits.
 *
 * This is the barycentre heuristic, which is what a layered layout uses to
 * reduce crossings between one layer and the next. Give each thing the average
 * position of what it is attached to, then sort by that. It is the standard
 * answer to this exact question, it needs nothing tuned, and it gives the same
 * answer every time.
 *
 * Siblings in a family are interchangeable, because which of them is drawn
 * leftmost says nothing about them. So their order is free, and spending it on
 * putting each of them nearest what it relates to costs the board nothing and
 * shortens every relation that leaves the family.
 *
 * Anything nothing pulls on is given the position it already has, which is the
 * conventional treatment and means a board does not rearrange itself around
 * cards that have no reason to move.
 */
export function orderedByPull(
  interchangeable: readonly string[],
  edges: readonly LayoutEdge[],
  at: ReadonlyMap<string, Box>,
  pull: Pull = {},
): string[] {
  const within = new Set(interchangeable)
  const pulls = new Map<string, number[]>()

  for (const edge of edges) {
    for (const [near, far] of [[edge.from, edge.to], [edge.to, edge.from]] as const) {
      if (!within.has(near) || (within.has(far) && pull.feelEachOther !== true))
        continue
      const other = at.get(far)
      if (other !== undefined)
        pulls.set(near, [...(pulls.get(near) ?? []), other.x + other.width / 2])
    }
  }

  const arrived = new Map(interchangeable.map((id, index) => [id, index]))
  const barycentre = new Map(interchangeable.map(id => [id, barycentreOf(id, pulls, at)]))

  return [...interchangeable].sort((one, other) =>
    barycentre.get(one)! - barycentre.get(other)! || arrived.get(one)! - arrived.get(other)!)
}

function barycentreOf(
  id: string,
  pulls: ReadonlyMap<string, readonly number[]>,
  at: ReadonlyMap<string, Box>,
): number {
  const felt = pulls.get(id) ?? []
  if (felt.length === 0) {
    const here = at.get(id)
    return here === undefined ? 0 : here.x + here.width / 2
  }
  return felt.reduce((sum, pulled) => sum + pulled, 0) / felt.length
}
