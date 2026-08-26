import type { Box, Point } from '@newledge/board-layout'
import { centreOf } from '@newledge/board-layout'

/**
 * How far out a curve reaches before it turns, as a share of the run.
 * A half puts both handles at the middle of the run,
 * which is the furthest either reaches without the curve doubling back.
 */
const REACH = 0.5

/** How far it reaches when the run is too short for a share of it to show. */
const LEAST_REACH = 30

/**
 * How far it reaches however long the run is.
 * With both ends facing the same way,
 * the curve keeps to the box its two ends make,
 * and crosses the straight run at the middle whatever it reaches,
 * so the reach is free to be generous.
 * Facing different ways it can swing past an end instead,
 * and this is what stops it from swinging far.
 */
const MOST_REACH = 220

/** The axis a line runs along as it leaves a card, set by the border. */
export type Facing = 'x' | 'y'

/**
 * Which way a line runs as it leaves a card at this point.
 * A point on the left or right border is left along x,
 * one on the top or bottom along y.
 * Read from whichever pair of borders the point is nearer,
 * since a point put on a border by an intersection sits on one pair exactly,
 * and somewhere between the other.
 */
export function facing(box: Box, at: Point): Facing {
  const sideways = Math.min(Math.abs(at.x - box.x), Math.abs(at.x - (box.x + box.width)))
  const upright = Math.min(Math.abs(at.y - box.y), Math.abs(at.y - (box.y + box.height)))
  return sideways <= upright ? 'x' : 'y'
}

/**
 * Where a line between two cards should leave and arrive.
 * A card is a rectangle, not a point,
 * so a line is anchored where the run between two centres crosses a border.
 * That is what keeps a line between a card and the one below it short,
 * instead of leaving the bottom of one and going round to the top of the other.
 */
export function borderRun(from: Box, to: Box): [Point, Point] {
  const start = centreOf(from)
  const end = centreOf(to)
  return [onBorder(from, start, end), onBorder(to, end, start)]
}

/**
 * An S between two points, leaving each card square on to its border.
 * A straight line reads as a diagram and a whiteboard is not one.
 * Bowed sideways instead,
 * a line leaves its card at whatever angle the two centres happen to sit at,
 * and the end it points with arrives across the corner, not into the card.
 * Leaving square on and turning in the middle is what a reader sees everywhere,
 * and it says which border a relation belongs to,
 * without anything having to be drawn there.
 */
export function curvePath(from: Point, to: Point, leaves?: Facing, arrives?: Facing): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const across: Facing = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
  const reach = (axis: Facing): number =>
    Math.min(Math.max(Math.abs(axis === 'x' ? dx : dy) * REACH, LEAST_REACH), MOST_REACH)

  const out = leaves ?? across
  const held = (at: Point, axis: Facing, way: number): Point => axis === 'x'
    ? { x: at.x + way * (Math.sign(dx) || 1) * reach('x'), y: at.y }
    : { x: at.x, y: at.y + way * (Math.sign(dy) || 1) * reach('y') }

  const first = held(from, out, 1)
  const second = held(to, arrives ?? across, -1)
  return `M ${from.x},${from.y} C ${first.x},${first.y} ${second.x},${second.y} ${to.x},${to.y}`
}

/** Where the run from a box's centre towards a point leaves the box. */
function onBorder(box: Box, from: Point, towards: Point): Point {
  const dx = towards.x - from.x
  const dy = towards.y - from.y
  if (dx === 0 && dy === 0)
    return from
  const reach = Math.min(
    dx === 0 ? Infinity : (box.width / 2) / Math.abs(dx),
    dy === 0 ? Infinity : (box.height / 2) / Math.abs(dy),
  )
  return { x: from.x + dx * reach, y: from.y + dy * reach }
}

/**
 * An SVG path through the points a router handed back. Corners turn square,
 * so an orthogonal route reads as a hierarchy rather than as a cable.
 * Rounded off, the same lines read as wiring,
 * and the two runs meeting at a corner stop looking like one run that turned.
 */
export function orthogonalPath(points: readonly Point[]): string {
  const [first, ...rest] = points
  if (first === undefined)
    return ''
  return rest.reduce(
    (path, point) => `${path} L ${point.x},${point.y}`,
    `M ${first.x},${first.y}`,
  )
}
