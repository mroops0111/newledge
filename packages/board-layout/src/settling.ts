import { orderedByPull } from './ordering.js'
import type { Box, LayoutEdge } from './ports.js'

/**
 * How many times the rows are gone over before the sweep gives up.
 * Each row is put in its best order given where everything else stands,
 * so a sweep can only shorten what the last one left,
 * and the run stops early once a whole sweep changes nothing.
 * The count is only a backstop.
 */
const SWEEPS = 8

/**
 * How many in a row can have every order tried. Seven is 5040 orders,
 * which is nothing to measure.
 * A board is not expected to hold rows longer than that,
 * and one that does is ordered by the estimate instead,
 * rather than making the reader wait.
 */
const TRIED_EXHAUSTIVELY = 7

/**
 * Shuffle things along the rows they already sit in until relations shorten.
 *
 * A packing places things by how well they fill a space,
 * which says nothing about what they are about,
 * so two that relate can end up at opposite ends.
 * Where something sits in its row is free,
 * in the way the order of siblings in a family is free,
 * and it is spent the same way, on putting what relates near its relation.
 *
 * One row at a time is put in its best order,
 * given where every other row currently stands,
 * and the rows are gone over until none of them wants to change.
 * This is coordinate descent,
 * so every step shortens the total and the run has to end.
 * The rows are gone over in alternating directions,
 * so a change made at one end of the board has a pass to reach the other.
 * Nothing is tuned and nothing is random,
 * so a board opens the same way every time.
 *
 * A row keeps the ground it stood on.
 * Its members are dealt back out between the same two ends,
 * so the packing keeps its shape and only the order changes.
 */
export function settledByPull(
  rows: readonly (readonly string[])[],
  edges: readonly LayoutEdge[],
  at: ReadonlyMap<string, Box>,
  sweeps = SWEEPS,
): Map<string, Box> {
  const settled = new Map(at)

  for (let sweep = 0; sweep < sweeps; sweep += 1) {
    let moved = false
    for (const row of sweep % 2 === 0 ? rows : [...rows].reverse())
      moved = shortest(row, edges, settled) || moved
    if (!moved)
      break
  }
  return settled
}

/**
 * Put one row in the order that leaves its relations shortest,
 * and say whether that was the order it was already in.
 */
function shortest(row: readonly string[], edges: readonly LayoutEdge[], at: Map<string, Box>): boolean {
  const standing = row.filter(id => at.has(id))
  if (standing.length < 2)
    return false

  const reaching = edges.filter(edge => standing.includes(edge.from) || standing.includes(edge.to))
  if (reaching.length === 0)
    return false

  const was = [...standing].sort((one, other) => at.get(one)!.x - at.get(other)!.x)
  let bestOrder = was
  let shortestReach = Number.POSITIVE_INFINITY

  // Ties keep the order the row came in,
  // since a board should not shuffle itself around for nothing,
  // so the order it had is measured first.
  for (const order of standing.length > TRIED_EXHAUSTIVELY
    ? [was, orderedByPull(was, edges, at, { feelEachOther: true })]
    : orders(was)) {
    const trial = new Map(at)
    dealtOut(order, trial)
    const reach = spread(reaching, trial)
    if (reach < shortestReach) {
      shortestReach = reach
      bestOrder = order
    }
  }

  dealtOut(bestOrder, at)
  return bestOrder.some((id, index) => id !== was[index])
}

/** Every order the row could be put in, the one it is in already first. */
function* orders(row: readonly string[]): Generator<string[]> {
  if (row.length <= 1) {
    yield [...row]
    return
  }
  for (const [index, head] of row.entries()) {
    for (const rest of orders([...row.slice(0, index), ...row.slice(index + 1)]))
      yield [head, ...rest]
  }
}

/**
 * Deal a row's members back out between the ends the row already had.
 * The gap comes out the same between every pair,
 * since the row has a length to fill,
 * and no reason to prefer one member of it to another.
 */
function dealtOut(order: readonly string[], at: Map<string, Box>): void {
  const boxes = order.flatMap(id => at.get(id) ?? [])
  const from = Math.min(...boxes.map(box => box.x))
  const to = Math.max(...boxes.map(box => box.x + box.width))
  const taken = boxes.reduce((sum, box) => sum + box.width, 0)
  const gap = Math.max(0, (to - from - taken) / (boxes.length - 1))

  let left = from
  for (const id of order) {
    const box = at.get(id)!
    at.set(id, { ...box, x: left })
    left += box.width + gap
  }
}

/** How far the given relations have to reach, all told. */
function spread(edges: readonly LayoutEdge[], at: ReadonlyMap<string, Box>): number {
  let reach = 0
  for (const edge of edges) {
    const from = at.get(edge.from)
    const to = at.get(edge.to)
    if (from === undefined || to === undefined || edge.from === edge.to)
      continue
    reach += Math.abs(centre(from) - centre(to))
  }
  return reach
}

function centre(box: Box): number {
  return box.x + box.width / 2
}
