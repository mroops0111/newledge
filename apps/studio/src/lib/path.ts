export interface Point {
  readonly x: number
  readonly y: number
}

export interface Box extends Point {
  readonly width: number
  readonly height: number
}

/**
 * How far out a curve reaches before it turns, as a share of the run.
 * A half puts both handles at the middle of the run, which is the furthest
 * either can reach without the curve doubling back on itself.
 */
const REACH = 0.5

/** How far it reaches when the run is too short for a share of it to show. */
const LEAST_REACH = 30

/**
 * How far it reaches however long the run is.
 * With both ends facing the same way the curve keeps to the box its two ends
 * make and crosses the straight run at the middle whatever it reaches, so the
 * reach is free to be generous. Facing different ways it can swing past an end
 * instead, and this is what stops it from swinging far.
 */
const MOST_REACH = 220

/** The axis a line runs along as it leaves a card, set by the border it left by. */
export type Facing = 'x' | 'y'

/**
 * Which way a line runs as it leaves a card at this point.
 * A point on the left or right border is left along x, one on the top or
 * bottom along y. Read from whichever pair of borders the point is nearer,
 * since a point put on a border by an intersection sits exactly on one pair
 * and somewhere between the other.
 */
export function facing(box: Box, at: Point): Facing {
  const sideways = Math.min(Math.abs(at.x - box.x), Math.abs(at.x - (box.x + box.width)))
  const upright = Math.min(Math.abs(at.y - box.y), Math.abs(at.y - (box.y + box.height)))
  return sideways <= upright ? 'x' : 'y'
}

/**
 * Where a line between two cards should leave and arrive.
 * A card is a rectangle, not a point, so a line is anchored where the run
 * between the two centres crosses each border. That is what keeps a line
 * between a card and the one below it short, instead of leaving the bottom of
 * one and travelling round to the top of the other.
 */
export function borderRun(from: Box, to: Box): [Point, Point] {
  const start = centreOf(from)
  const end = centreOf(to)
  return [onBorder(from, start, end), onBorder(to, end, start)]
}

/**
 * An S between two points, leaving each card square on to the border it crosses.
 * A straight line reads as a diagram and a whiteboard is not one. Bowed
 * sideways instead, a line leaves its card at whatever angle the two centres
 * happen to sit at, and the end it points with arrives across the corner
 * rather than into the card. Leaving square on and turning in the middle is
 * what a reader has seen everywhere else, and it says which border a relation
 * belongs to without anything having to be drawn there.
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

export function centreOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
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
 * How far back from a corner a route starts turning.
 * A rounded corner cuts inside the turn by under a third of this, so kept to
 * the clearance a route was given it cannot cut into whatever the route went
 * round. That is also as round as a corner can honestly be drawn, and a board
 * of nearly square corners reads as a circuit diagram rather than as something
 * drawn by hand.
 */
const CORNER = 20

/**
 * An SVG path through the points a router handed back.
 * Corners are rounded rather than square, which is what keeps an orthogonal
 * route reading as a drawn line instead of as a circuit diagram.
 */
export function orthogonalPath(points: readonly Point[], radius = CORNER): string {
  const [first, ...rest] = points
  if (first === undefined)
    return ''
  if (rest.length === 0)
    return `M ${first.x},${first.y}`

  let path = `M ${first.x},${first.y}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = points[index - 1]!
    const corner = points[index]!
    const after = points[index + 1]!
    const into = towards(corner, before, radius)
    const outOf = towards(corner, after, radius)
    path += ` L ${into.x},${into.y} Q ${corner.x},${corner.y} ${outOf.x},${outOf.y}`
  }
  const last = points[points.length - 1]!
  return `${path} L ${last.x},${last.y}`
}

/** A point short of the corner, so the curve has room without overshooting. */
function towards(corner: Point, neighbour: Point, radius: number): Point {
  const dx = neighbour.x - corner.x
  const dy = neighbour.y - corner.y
  const length = Math.hypot(dx, dy)
  if (length === 0)
    return corner
  const reach = Math.min(radius, length / 2)
  return { x: corner.x + (dx / length) * reach, y: corner.y + (dy / length) * reach }
}
