import type { Box, Obstacle, Point, Routed, Routing, RoutingRequest } from './ports.js'

/** How far a line stays clear of a card it is going round. */
const CLEARANCE = 20
/** A bend costs this much length, so a straighter route wins a longer one. */
const BEND_COST = 140
/**
 * Running where another line already runs costs this much a unit.
 * Two lines lying on top of each other read as one, and the one underneath is
 * lost entirely. Priced by the length shared rather than as a flat charge, so
 * a line crosses another without hesitating and only avoids keeping it
 * company. Kept well under what a bend costs, so a route does not stagger
 * about to dodge a short overlap.
 */
const COMPANY_COST = 1.6

/**
 * Lines that go round the cards between their ends.
 * A line drawn straight from one card to another passes under whatever sits
 * between them, and a card is drawn over the lines that reach it, so what a
 * reader sees is an arrow head in open space with nothing attached to it.
 *
 * Where the straight run is clear the two ends are handed back on their own,
 * which is what lets a curve be drawn along it. Where it is not, the way round
 * is the cheapest path across the grid the cards themselves rule, which is how
 * an orthogonal connector is routed. Trying a handful of likely corridors
 * instead was quicker to write and to run, but a board only has to be crowded
 * in one place for none of them to be clear, and the line then took the least
 * bad of them and ran straight through a card.
 */
export function orthogonalRouting(clearance = CLEARANCE): Routing {
  return {
    id: 'orthogonal',
    route: async (request: RoutingRequest) => run(request, clearance),
  }
}

function run(request: RoutingRequest, clearance: number): Routed {
  const byId = new Map(request.obstacles.map(box => [box.id, box]))
  const edges = new Map<string, readonly Point[]>()
  const taken = new Map<string, number>()

  // Routed in a settled order, since each line is laid out knowing where the
  // ones before it went, and an order that drifted would move lines about for
  // no reason a reader could see.
  const asked = [...request.edges].sort((one, other) => one.id.localeCompare(other.id))

  for (const edge of asked) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (from === undefined || to === undefined)
      continue
    const between = request.obstacles.filter(box =>
      box.ground !== true && box.id !== edge.from && box.id !== edge.to)
    const route = best(from, to, between, clearance, taken)
    edges.set(edge.id, route)
    keep(route, taken)
  }
  return { edges }
}

/** The straight run when it is clear, and the cheapest way round when it is not. */
function best(
  from: Obstacle,
  to: Obstacle,
  between: readonly Obstacle[],
  clearance: number,
  taken: ReadonlyMap<string, number>,
): readonly Point[] {
  const across = trimmed([centre(from), centre(to)], from, to)
  if (!between.some(box => crosses(across[0]!, across[1]!, box)))
    return across

  const round = around(from, to, [...between, from, to], clearance, taken)
  return round ?? across
}

/** Where a line waits just off each side of a card, and the point it steps in at. */
function portsOf(box: Box, clearance: number): { off: Point, on: Point, facing: 'x' | 'y' }[] {
  const middle = centre(box)
  return [
    { off: { x: middle.x, y: box.y - clearance }, on: { x: middle.x, y: box.y }, facing: 'y' },
    { off: { x: middle.x, y: box.y + box.height + clearance }, on: { x: middle.x, y: box.y + box.height }, facing: 'y' },
    { off: { x: box.x - clearance, y: middle.y }, on: { x: box.x, y: middle.y }, facing: 'x' },
    { off: { x: box.x + box.width + clearance, y: middle.y }, on: { x: box.x + box.width, y: middle.y }, facing: 'x' },
  ]
}

/**
 * The cheapest way round, along the grid the cards themselves rule.
 *
 * Every card contributes the lines just outside each of its four borders, and
 * the two ends contribute their own centre lines, so anywhere worth turning is
 * a crossing of two of them. That grid is the visibility graph an orthogonal
 * connector is routed on, and the cheapest path across it is found the way any
 * cheapest path is. A step that would run through a card is not offered at
 * all, so no route through one can come back as the least bad.
 *
 * The two cards at the ends are in the way as much as any other, so the search
 * runs between the points a line waits at off each of their four sides rather
 * than between their centres. Aimed at a centre instead, a route reaches it by
 * tunnelling through the card it belongs to and comes in along the inside of
 * its own target.
 */
function around(
  from: Box,
  to: Box,
  between: readonly Obstacle[],
  clearance: number,
  taken: ReadonlyMap<string, number>,
): readonly Point[] | undefined {
  const leaves = portsOf(from, clearance)
  const arrives = portsOf(to, clearance)
  const centres = [centre(from), centre(to)]
  const waypoints = [...centres, ...[...leaves, ...arrives].map(port => port.off)]
  const xs = ruled(between, clearance, 'x', waypoints.map(point => point.x))
  const ys = ruled(between, clearance, 'y', waypoints.map(point => point.y))

  const at = (spot: number): Point => ({ x: xs[spot % xs.length]!, y: ys[Math.floor(spot / xs.length)]! })
  const spotOf = (point: Point): number => ys.indexOf(point.y) * xs.length + xs.indexOf(point.x)
  const stepOn = new Map(arrives.map(port => [spotOf(port.off), port.on]))

  const priced = new Map<number, number>()
  const cameFrom = new Map<number, number>()
  const facing = new Map<number, 'x' | 'y'>()
  const waiting = new Set<number>()
  const steppedOff = new Map<number, Point>()
  for (const port of leaves) {
    const spot = spotOf(port.off)
    priced.set(spot, 0)
    facing.set(spot, port.facing)
    steppedOff.set(spot, port.on)
    waiting.add(spot)
  }

  let last = -1
  while (waiting.size > 0) {
    let here = -1
    for (const candidate of waiting) {
      if (here === -1 || priced.get(candidate)! < priced.get(here)!)
        here = candidate
    }
    waiting.delete(here)
    if (stepOn.has(here)) {
      last = here
      break
    }

    const column = here % xs.length
    const row = Math.floor(here / xs.length)
    for (const [nextColumn, nextRow] of [
      [column - 1, row], [column + 1, row], [column, row - 1], [column, row + 1],
    ] as const) {
      if (nextColumn < 0 || nextColumn >= xs.length || nextRow < 0 || nextRow >= ys.length)
        continue
      const next = nextRow * xs.length + nextColumn
      const [one, other] = [at(here), at(next)]
      if (between.some(box => crosses(one, other, box)))
        continue

      const way = nextRow === row ? 'x' : 'y'
      const asked = priced.get(here)!
        + Math.abs(other.x - one.x) + Math.abs(other.y - one.y)
        + (facing.get(here) !== undefined && facing.get(here) !== way ? BEND_COST : 0)
        + COMPANY_COST * shared(one, other, taken)
      if (asked < (priced.get(next) ?? Number.POSITIVE_INFINITY)) {
        priced.set(next, asked)
        cameFrom.set(next, here)
        facing.set(next, way)
        waiting.add(next)
      }
    }
  }

  if (last === -1)
    return undefined

  const back: Point[] = []
  let began = last
  for (let spot: number | undefined = last; spot !== undefined; spot = cameFrom.get(spot)) {
    back.push(at(spot))
    began = spot
  }
  return straightened([steppedOff.get(began)!, ...back.reverse(), stepOn.get(last)!])
}

/** The lines worth turning on, being each card's borders held clear of it. */
function ruled(
  boxes: readonly Obstacle[],
  clearance: number,
  axis: 'x' | 'y',
  ends: readonly number[],
): number[] {
  const skirting = boxes.flatMap(box => (axis === 'x'
    ? [box.x - clearance, box.x + box.width + clearance]
    : [box.y - clearance, box.y + box.height + clearance]))
  return [...new Set([...ends, ...skirting])].sort((one, other) => one - other)
}

/** Drop the points a route only passes through, keeping the ones it turns at. */
function straightened(route: readonly Point[]): Point[] {
  const kept: Point[] = []
  for (const [index, point] of route.entries()) {
    const before = kept[kept.length - 1]
    const after = route[index + 1]
    const throughout = before !== undefined && after !== undefined
      && ((before.x === point.x && point.x === after.x) || (before.y === point.y && point.y === after.y))
    if (!throughout)
      kept.push(point)
  }
  return kept
}

/** Remember where a route ran, so the ones after it can keep off. */
function keep(route: readonly Point[], taken: Map<string, number>): void {
  for (let index = 1; index < route.length; index += 1) {
    const one = route[index - 1]!
    const other = route[index]!
    const along = one.x === other.x ? `x${one.x}` : one.y === other.y ? `y${one.y}` : undefined
    if (along !== undefined)
      taken.set(along, (taken.get(along) ?? 0) + 1)
  }
}

/**
 * How much of this step would be spent alongside a line already drawn.
 * Counted by the whole line a run sits on rather than by the stretch of it
 * used, which is coarse and cheap, and enough to send the next line one
 * corridor over instead of straight down the same one.
 */
function shared(one: Point, other: Point, taken: ReadonlyMap<string, number>): number {
  const along = one.x === other.x ? `x${one.x}` : `y${one.y}`
  return (taken.get(along) ?? 0) * (Math.abs(other.x - one.x) + Math.abs(other.y - one.y))
}

/** Whether a straight run between two points passes through a box. */
function crosses(one: Point, other: Point, box: Box): boolean {
  const left = Math.min(one.x, other.x)
  const right = Math.max(one.x, other.x)
  const top = Math.min(one.y, other.y)
  const bottom = Math.max(one.y, other.y)
  return left < box.x + box.width
    && right > box.x
    && top < box.y + box.height
    && bottom > box.y
}

/**
 * Pull both ends back to the borders of the cards they belong to.
 * A route is worked out between two centres, since a centre is a point and a
 * border is a side, but it has to be drawn from edge to edge.
 */
function trimmed(route: readonly Point[], from: Box, to: Box): Point[] {
  const points = [...route]
  points[0] = leaving(points[0]!, points[1] ?? points[0]!, from)
  const last = points.length - 1
  points[last] = leaving(points[last]!, points[last - 1] ?? points[last]!, to)
  return points
}

/**
 * Where a run out of a box's centre crosses its border.
 * Worked out as an intersection rather than by pinning one coordinate and
 * moving the other. Every corridor leaves a box square on, where the two come
 * to the same answer, but the straight run across leaves at whatever angle the
 * two centres happen to sit at. Pinned, both ends of that run kept the height
 * of their own card, so a line between two cards at different heights arrived
 * bent and its arrow head came in at an angle nothing accounted for.
 */
function leaving(inside: Point, towards: Point, box: Box): Point {
  const dx = towards.x - inside.x
  const dy = towards.y - inside.y
  if (dx === 0 && dy === 0)
    return inside
  const reach = Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : (box.width / 2) / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : (box.height / 2) / Math.abs(dy),
  )
  return { x: inside.x + dx * reach, y: inside.y + dy * reach }
}

function centre(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
