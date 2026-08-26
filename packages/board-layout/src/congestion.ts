import type { Point } from './ports.js'

/**
 * Running where another line already runs costs this much a unit.
 * Two lines lying on top of each other read as one,
 * and the one underneath is lost entirely.
 * Priced by the length shared rather than as a flat charge,
 * so a line crosses another without hesitating,
 * and only avoids keeping it company. Kept well under what a bend costs,
 * so a route does not stagger about to dodge a short overlap.
 */
const COMPANY_COST = 1.6

/**
 * How busy each corridor already is, and what joining one costs.
 *
 * Counted by the whole line a run sits on,
 * rather than by the stretch of it used, which is coarse and cheap.
 * That is enough to send the next line one corridor over,
 * instead of straight down the same one. Lines are routed one after another,
 * so this grows as the board fills,
 * and every route is priced against the ones already drawn.
 */
export class Congestion {
  private readonly corridors = new Map<string, number>()

  /** Remember where a route ran, so the ones after it can keep off. */
  remember(route: readonly Point[]): void {
    for (let step = 1; step < route.length; step += 1) {
      const corridor = corridorOf(route[step - 1]!, route[step]!)
      if (corridor !== undefined)
        this.corridors.set(corridor, (this.corridors.get(corridor) ?? 0) + 1)
    }
  }

  /** What a step costs beyond its length, for the company it would keep. */
  costOf(from: Point, to: Point): number {
    const corridor = corridorOf(from, to)
    if (corridor === undefined)
      return 0
    const busy = this.corridors.get(corridor) ?? 0
    return COMPANY_COST * busy * (Math.abs(to.x - from.x) + Math.abs(to.y - from.y))
  }
}

/** The corridor a run lies in, which is the whole line it sits on. */
function corridorOf(from: Point, to: Point): string | undefined {
  if (from.x === to.x)
    return `x${from.x}`
  if (from.y === to.y)
    return `y${from.y}`
  return undefined
}
