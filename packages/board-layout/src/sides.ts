import { centreOf } from './geometry.js'
import type { Box, Point } from './ports.js'

/**
 * How many places a line may meet a card on each of its sides.
 * A line has to meet a card somewhere a reader can see it meets it,
 * which means square on to a border,
 * and not wherever the run between two centres happens to cross one.
 * Three to a side is enough for any card on a board,
 * and few enough that a reader reads them as places rather than as a scatter.
 */
const PORTS_A_SIDE = 3

/**
 * Ending where another line already ends costs this much.
 * Enough that a line takes the next place along,
 * rather than land on top of another line's end.
 * Little enough that it shares one,
 * rather than go the long way round to avoid it. Far below what a turn costs,
 * since two ends meeting at one place is a smaller thing to read past,
 * than a turn is.
 */
const PORT_TAKEN_COST = 140

/** A place a line may meet a card, and the point off it that it waits at. */
export interface Port {
  readonly off: Point
  readonly on: Point
  readonly facing: 'x' | 'y'
}

/** Where a point is, as a key, so two lines can tell they want one place. */
export function keyOf(point: Point): string {
  return `${point.x},${point.y}`
}

/**
 * What a place costs a line beyond the run itself. Nothing,
 * unless every place on its side is taken and it has to share one.
 */
export function priceOf(port: Port, taken: ReadonlySet<string>): number {
  return taken.has(keyOf(port.on)) ? PORT_TAKEN_COST : 0
}

/** Every place a line may take on a card, less the ones already taken. */
export function portsOf(box: Box, clearance: number, taken: ReadonlySet<string>): Port[] {
  return sidesOf(box, clearance).flatMap(side => offeredBy(side, taken))
}

/**
 * The place on the side facing something,
 * which is its middle unless that is taken. Which side is settled first,
 * by whichever way the other thing mostly lies,
 * so a line leaves by the face a reader would expect it to.
 * Then the cheapest place on that side, and among places that cost the same,
 * the one nearest what the line is reaching for.
 * That keeps two lines off the same side from crossing on their way out.
 */
export function facingPort(box: Box, towards: Point, clearance: number, taken: ReadonlySet<string>): Port {
  const reach = (port: Port): number => Math.hypot(port.on.x - towards.x, port.on.y - towards.y)
  return placesFacing(box, towards, clearance, taken)
    .sort((one, other) =>
      priceOf(one, taken) - priceOf(other, taken) || reach(one) - reach(other))[0]!
}

/**
 * What the side of a card facing something offers a line reaching for it.
 * Which side is settled by whichever way the other thing mostly lies,
 * so a line leaves by the face a reader would expect it to.
 * What that side then offers is the middle until the middle is taken,
 * so a line never enters off the middle for want of a reason.
 */
export function placesFacing(
  box: Box,
  towards: Point,
  clearance: number,
  taken: ReadonlySet<string>,
): Port[] {
  const middle = centreOf(box)
  const sideways = Math.abs(towards.x - middle.x) >= Math.abs(towards.y - middle.y)
  const border = sideways
    ? (towards.x >= middle.x ? box.x + box.width : box.x)
    : (towards.y >= middle.y ? box.y + box.height : box.y)
  const side = sidesOf(box, clearance)
    .find(places => places.some(port => (sideways ? port.on.x === border : port.on.y === border)))
  return side === undefined ? [] : offeredBy(side, taken)
}

/** How far a place sits from the middle of the card it is on. */
export function offMiddle(box: Box, port: Port): number {
  const middle = centreOf(box)
  return port.facing === 'y' ? Math.abs(port.on.x - middle.x) : Math.abs(port.on.y - middle.y)
}

/**
 * Whether the two cards already offer a place each that a straight run joins.
 * Card widths divide four ways by the grid,
 * so a layout that put two cards in line put their places in line as well,
 * and a line between them needs no bend and no nudge.
 * Read from the cards alone, before any line has been drawn,
 * so it can settle which line has the better claim on a place they both want.
 */
export function alignedPlaces(one: Box, other: Box): boolean {
  const upright = Math.abs(centreOf(other).y - centreOf(one).y)
    >= Math.abs(centreOf(other).x - centreOf(one).x)
  const along = (box: Box, place: number): number => (upright
    ? box.x + box.width * (place + 1) / (PORTS_A_SIDE + 1)
    : box.y + box.height * (place + 1) / (PORTS_A_SIDE + 1))
  const places = Array.from({ length: PORTS_A_SIDE }, (_unused, place) => place)
  return places.some(mine => places.some(theirs => along(one, mine) === along(other, theirs)))
}

/**
 * Where a line waits just off each side of a card,
 * and the points on the border it steps in at. Three places to a side,
 * evenly spaced, the middle one first.
 *
 * A line meets a card square on to a border,
 * rather than wherever the run between two centres happens to cross one.
 * Several lines reaching the same side are told apart,
 * by taking different places on it.
 */
function sidesOf(box: Box, clearance: number): Port[][] {
  const along = (span: number, place: number): number => span * (place + 1) / (PORTS_A_SIDE + 1)
  const middle = (PORTS_A_SIDE - 1) / 2
  const middleFirst = Array.from({ length: PORTS_A_SIDE }, (_unused, place) => place)
    .sort((one, other) => Math.abs(one - middle) - Math.abs(other - middle))

  const upright = (border: number, away: number): Port[] =>
    middleFirst.map((place) => {
      const x = box.x + along(box.width, place)
      return { off: { x, y: border + away * clearance }, on: { x, y: border }, facing: 'y' }
    })
  const sideways = (border: number, away: number): Port[] =>
    middleFirst.map((place) => {
      const y = box.y + along(box.height, place)
      return { off: { x: border + away * clearance, y }, on: { x: border, y }, facing: 'x' }
    })

  return [
    upright(box.y, -1),
    upright(box.y + box.height, 1),
    sideways(box.x, -1),
    sideways(box.x + box.width, 1),
  ]
}

/**
 * What a side offers a line, which is its middle until that is taken.
 * The other two are there to tell lines apart and for nothing else,
 * so they are not offered while the middle is free. Offered alongside it,
 * a line coming down on top of one took it,
 * rather than pay the two turns it costs to reach the middle.
 * A card with one line on a side then had it enter a quarter of the way along,
 * for no reason a reader could see.
 */
function offeredBy(side: readonly Port[], taken: ReadonlySet<string>): Port[] {
  const [middle, ...rest] = side
  if (middle === undefined)
    return []
  if (!taken.has(keyOf(middle.on)))
    return [middle]
  const free = rest.filter(port => !taken.has(keyOf(port.on)))
  return free.length > 0 ? free : [...side]
}
