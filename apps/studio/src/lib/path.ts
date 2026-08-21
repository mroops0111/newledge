export interface Point {
  readonly x: number
  readonly y: number
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
