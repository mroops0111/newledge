import type { Point } from '@newledge/board-layout'

/** How far a line may run before a reader loses it. */
const FAR = 1600

/** How far it may wander, counted against the direct run between its ends. */
const WANDERS = 2.5

/**
 * How many times a line may turn and still be worth following. Out, across,
 * and in is a shape a reader takes in at once.
 * A third turn means the line doubled back on itself somewhere,
 * and from then on following it is work rather than looking.
 * What it had to say is said on the card instead,
 * which costs a line of words and no confusion.
 */
const TURNS = 2

/**
 * How much worse a line already drawn may get before it stops being drawn.
 * What a card says about the relations the board could not draw sits on it,
 * so it makes the card taller, which moves every route past it,
 * which changes what the board can draw. Judged on one threshold,
 * two relations on the real board flipped in and out of it for ever,
 * and the board never stood still.
 * A relation has to get this much worse than the threshold to be given up,
 * and that much better than it to be taken back,
 * so the two answers cannot chase each other.
 */
const SETTLES = 1.25

/**
 * Whether a reader could follow this line from one end to the other.
 *
 * Not whether it crosses a section,
 * which is a fact about filing rather than about what a reader can follow.
 * A line that wanders far enough is lost whether or not it stays on one ground,
 * and a short line across two grounds is perfectly readable.
 *
 * A line already drawn is held to a looser measure than one not,
 * so the board settles instead of chasing its own answer.
 * A route nobody has worked out yet is taken on trust,
 * since the board has to draw something,
 * before it can find out what that something costs.
 */
export function worthFollowing(route: readonly Point[] | undefined, alreadyDrawn: boolean): boolean {
  if (route === undefined || route.length < 2)
    return true

  const shape = shapeOf(route)
  const slack = alreadyDrawn ? SETTLES : 1
  return shape.turns <= (alreadyDrawn ? TURNS + 1 : TURNS)
    && shape.run <= FAR * slack
    && shape.run <= shape.direct * WANDERS * slack
}

/** How long a route is, how far it had to go, and how often it turned. */
function shapeOf(route: readonly Point[]): { run: number, direct: number, turns: number } {
  const [start, end] = [route[0]!, route[route.length - 1]!]
  let run = 0
  let turns = 0
  for (let step = 1; step < route.length; step += 1) {
    const [before, here] = [route[step - 1]!, route[step]!]
    run += Math.abs(here.x - before.x) + Math.abs(here.y - before.y)
    const after = route[step + 1]
    if (after === undefined)
      continue
    const straight = (before.x === here.x && here.x === after.x)
      || (before.y === here.y && here.y === after.y)
    if (!straight)
      turns += 1
  }
  return { run, direct: Math.hypot(end.x - start.x, end.y - start.y), turns }
}
