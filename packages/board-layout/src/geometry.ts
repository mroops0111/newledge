import type { Box, Point } from './ports.js'

export function centreOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Whether two boxes take up any of the same ground. */
export function boxesOverlap(one: Box, other: Box): boolean {
  return one.x < other.x + other.width && one.x + one.width > other.x
    && one.y < other.y + other.height && one.y + one.height > other.y
}

/** Whether the first box holds the second whole. */
export function boxHolds(outer: Box, inner: Box): boolean {
  return inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height
}

/** Whether a straight run between two points passes through a box. */
export function crossesBox(from: Point, to: Point, box: Box): boolean {
  return Math.min(from.x, to.x) < box.x + box.width
    && Math.max(from.x, to.x) > box.x
    && Math.min(from.y, to.y) < box.y + box.height
    && Math.max(from.y, to.y) > box.y
}

/** Whether any run of a path passes through a box. */
export function pathCrossesBox(path: readonly Point[], box: Box): boolean {
  for (let step = 1; step < path.length; step += 1) {
    if (crossesBox(path[step - 1]!, path[step]!, box))
      return true
  }
  return false
}
