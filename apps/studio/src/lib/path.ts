export interface Point {
  readonly x: number
  readonly y: number
}

export interface Box extends Point {
  readonly width: number
  readonly height: number
}

/** How far a curve bows out from the straight line between two cards. */
const BOW = 0.11

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
 * A gentle arc between two points.
 * A straight line reads as a diagram and a whiteboard is not one, so an
 * association bows slightly, which also keeps two lines between the same
 * neighbours from lying on top of each other.
 */
export function curvePath(from: Point, to: Point): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const control = {
    x: (from.x + to.x) / 2 - dy * BOW,
    y: (from.y + to.y) / 2 + dx * BOW,
  }
  return `M ${from.x},${from.y} Q ${control.x},${control.y} ${to.x},${to.y}`
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

const CORNER = 10

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
