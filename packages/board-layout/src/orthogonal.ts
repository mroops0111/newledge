import type { Box, Point, Routed, Routing, RoutingRequest } from './ports.js'

/** How far a line stays clear of a card it is going round. */
const CLEARANCE = 20
/** A bend costs this much length, so a straighter route wins a longer one. */
const BEND_COST = 140

type Named = Box & { readonly id: string }

/**
 * Lines that go round the cards between their ends.
 * A line drawn straight from one card to another passes under whatever sits
 * between them, and a card is drawn over the lines that reach it, so what a
 * reader sees is an arrow head in open space with nothing attached to it.
 *
 * Corridors are tried rather than searched for. A board is sparse enough that
 * the way round is nearly always one of a few obvious ones, and trying those
 * is quicker to run, quicker to read, and gives the same answer every time.
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

  for (const edge of request.edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (from === undefined || to === undefined)
      continue
    const between = request.obstacles.filter(box => box.id !== edge.from && box.id !== edge.to)
    edges.set(edge.id, best(from, to, between, clearance))
  }
  return { edges }
}

/** The cheapest way round, or straight across when nothing is in the way. */
function best(from: Box, to: Box, between: readonly Named[], clearance: number): readonly Point[] {
  let cheapest: readonly Point[] = trimmed([centre(from), centre(to)], from, to)
  let price = cost(cheapest, between)

  for (const route of candidates(from, to, between, clearance)) {
    const trimmedRoute = trimmed(route, from, to)
    const asked = cost(trimmedRoute, between)
    if (asked < price) {
      price = asked
      cheapest = trimmedRoute
    }
  }
  return cheapest
}

/**
 * The ways round worth trying.
 * Each is a corridor to travel along, either a line of constant y reached by
 * leaving both cards vertically, or a line of constant x reached by leaving
 * both horizontally.
 */
function* candidates(from: Box, to: Box, between: readonly Named[], clearance: number): Generator<Point[]> {
  const start = centre(from)
  const end = centre(to)

  for (const y of corridors(from, to, between, clearance, 'y')) {
    yield [start, { x: start.x, y }, { x: end.x, y }, end]
  }
  for (const x of corridors(from, to, between, clearance, 'x')) {
    yield [start, { x, y: start.y }, { x, y: end.y }, end]
  }
  // The two elbows, which are the shortest way round when the corner is clear.
  yield [start, { x: end.x, y: start.y }, end]
  yield [start, { x: start.x, y: end.y }, end]
}

/** Lines to travel along, taken from the two cards and from what is in the way. */
function corridors(
  from: Box,
  to: Box,
  between: readonly Named[],
  clearance: number,
  axis: 'x' | 'y',
): number[] {
  const near = axis === 'y'
    ? [centre(from).y, centre(to).y, (centre(from).y + centre(to).y) / 2]
    : [centre(from).x, centre(to).x, (centre(from).x + centre(to).x) / 2]

  const skirting = [from, to, ...between].flatMap(box => (axis === 'y'
    ? [box.y - clearance, box.y + box.height + clearance]
    : [box.x - clearance, box.x + box.width + clearance]))

  return [...new Set([...near, ...skirting])]
}

/**
 * What a route costs, being what it runs through first and how long it is.
 * Crossing a card is priced far above any length, so a route that goes the
 * long way round always beats one that goes through.
 */
function cost(route: readonly Point[], between: readonly Named[]): number {
  let crossings = 0
  let length = 0
  for (let index = 1; index < route.length; index += 1) {
    const one = route[index - 1]!
    const other = route[index]!
    length += Math.abs(other.x - one.x) + Math.abs(other.y - one.y)
    crossings += between.filter(box => crosses(one, other, box)).length
  }
  return crossings * 1e6 + length + (route.length - 2) * BEND_COST
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

/** Where a run out of a box's centre crosses its border. */
function leaving(inside: Point, towards: Point, box: Box): Point {
  if (towards.x === inside.x) {
    return { x: inside.x, y: towards.y > inside.y ? box.y + box.height : box.y }
  }
  return { x: towards.x > inside.x ? box.x + box.width : box.x, y: inside.y }
}

function centre(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
