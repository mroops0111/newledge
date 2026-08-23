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
 * Ending where another line already ends costs this much.
 * About what a bend costs, so a line takes the next slot along rather than
 * land on top of another line's end, and still shares one rather than go the
 * long way round to avoid it.
 */
const PORT_TAKEN_COST = 140

/**
 * How many places a line may meet a card on each of its sides.
 * A line has to meet a card somewhere a reader can see it meets it, which
 * means square on to a border and not wherever the run between two centres
 * happens to cross one. Three to a side is enough for any card on a board and
 * few enough that a reader reads them as places rather than as a scatter.
 */
const PORTS_A_SIDE = 3

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
  const used = new Set<string>()

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
    const route = best(from, to, between, clearance, taken, used)
    edges.set(edge.id, route)
    keep(route, taken)
    used.add(keyOf(route[0]!)).add(keyOf(route[route.length - 1]!))
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
  used: ReadonlySet<string>,
): readonly Point[] {
  const leaves = facingPort(from, centre(to), clearance, used)
  const arrives = facingPort(to, centre(from), clearance, used)
  const straight = clear(leaves, arrives)
  if (!straight.some((point, index) =>
    index > 0 && between.some(box => crosses(straight[index - 1]!, point, box)))) {
    return straight
  }

  const round = around(from, to, [...between, from, to], clearance, taken, used)
  return round ?? [leaves.on, arrives.on]
}

/**
 * The way between two places when nothing is in between.
 * Two ends given nothing but each other are handed back as they are, and the
 * drawing bows them into an S. That reads as a line only while the two have
 * more room along the way they face than they are offset across it. Given a
 * pair almost stacked on top of each other and facing sideways, the same bow
 * has to turn through most of a right angle within a few pixels of each end,
 * and the line hooks into its own arrow head. Those turn square instead.
 */
function clear(leaves: Port, arrives: Port): Point[] {
  const along = leaves.facing === 'x'
    ? Math.abs(arrives.on.x - leaves.on.x)
    : Math.abs(arrives.on.y - leaves.on.y)
  const across = leaves.facing === 'x'
    ? Math.abs(arrives.on.y - leaves.on.y)
    : Math.abs(arrives.on.x - leaves.on.x)

  if (leaves.facing !== arrives.facing) {
    const corner = leaves.facing === 'x'
      ? { x: arrives.on.x, y: leaves.on.y }
      : { x: leaves.on.x, y: arrives.on.y }
    return [leaves.on, corner, arrives.on]
  }
  if (along >= across)
    return [leaves.on, arrives.on]

  const turn = leaves.facing === 'x'
    ? (leaves.off.x + arrives.off.x) / 2
    : (leaves.off.y + arrives.off.y) / 2
  return leaves.facing === 'x'
    ? [leaves.on, { x: turn, y: leaves.on.y }, { x: turn, y: arrives.on.y }, arrives.on]
    : [leaves.on, { x: leaves.on.x, y: turn }, { x: arrives.on.x, y: turn }, arrives.on]
}

interface Port {
  readonly off: Point
  readonly on: Point
  readonly facing: 'x' | 'y'
}

/**
 * Where a line waits just off each side of a card, and the points on the border
 * it steps in at. Three places to a side, evenly spaced, the middle one first.
 *
 * A line meets a card square on to a border rather than wherever the run
 * between two centres happens to cross one, and several lines reaching the
 * same side are told apart by taking different places on it.
 */
function sidesOf(box: Box, clearance: number): Port[][] {
  const along = (span: number, at: number): number => span * (at + 1) / (PORTS_A_SIDE + 1)
  const middle = (PORTS_A_SIDE - 1) / 2
  const order = Array.from({ length: PORTS_A_SIDE }, (_, at) => at)
    .sort((one, other) => Math.abs(one - middle) - Math.abs(other - middle))

  return [
    order.map((at): Port => {
      const x = box.x + along(box.width, at)
      return { off: { x, y: box.y - clearance }, on: { x, y: box.y }, facing: 'y' }
    }),
    order.map((at): Port => {
      const x = box.x + along(box.width, at)
      return { off: { x, y: box.y + box.height + clearance }, on: { x, y: box.y + box.height }, facing: 'y' }
    }),
    order.map((at): Port => {
      const y = box.y + along(box.height, at)
      return { off: { x: box.x - clearance, y }, on: { x: box.x, y }, facing: 'x' }
    }),
    order.map((at): Port => {
      const y = box.y + along(box.height, at)
      return { off: { x: box.x + box.width, y }, on: { x: box.x + box.width, y }, facing: 'x' }
    }).map(port => ({ ...port, off: { x: box.x + box.width + clearance, y: port.on.y } })),
  ]
}

/**
 * What a side offers a line, which is its middle until that is taken.
 * The other two are there to tell lines apart and for nothing else, so they
 * are not offered while the middle is free. Offered alongside it, a line
 * coming down on top of one took it rather than pay the two turns it costs to
 * reach the middle, and a card with one line on a side had it enter at a
 * quarter of the way along for no reason a reader could see.
 */
function offeredBy(side: readonly Port[], used: ReadonlySet<string>): Port[] {
  const [middle, ...rest] = side
  if (middle === undefined || !used.has(keyOf(middle.on)))
    return middle === undefined ? [] : [middle]
  const free = rest.filter(port => !used.has(keyOf(port.on)))
  return free.length > 0 ? free : [...side]
}

/** Every place a line may take on a card, once the taken ones are accounted for. */
function portsOf(box: Box, clearance: number, used: ReadonlySet<string>): Port[] {
  return sidesOf(box, clearance).flatMap(side => offeredBy(side, used))
}

/** Where a point is, as a key, so two lines can tell they want the same place. */
function keyOf(point: Point): string {
  return `${point.x},${point.y}`
}

/**
 * What a place costs a line beyond the run itself.
 * Nothing, unless every place on its side is taken and it has to share one.
 */
function priceOf(port: Port, used: ReadonlySet<string>): number {
  return used.has(keyOf(port.on)) ? PORT_TAKEN_COST : 0
}

/**
 * The place on the side facing something, which is the middle of it unless
 * that is taken.
 * Which side is settled first, by whichever way the other thing mostly lies,
 * so a line leaves by the face a reader would expect it to. Then the cheapest
 * place on that side, and among places that cost the same the one nearest what
 * the line is reaching for, which is what keeps two lines off the same side
 * from crossing each other on their way out.
 */
function facingPort(box: Box, towards: Point, clearance: number, used: ReadonlySet<string>): Port {
  const middle = centre(box)
  const sideways = Math.abs(towards.x - middle.x) >= Math.abs(towards.y - middle.y)
  const border = sideways
    ? (towards.x >= middle.x ? box.x + box.width : box.x)
    : (towards.y >= middle.y ? box.y + box.height : box.y)

  const reach = (port: Port): number => Math.hypot(port.on.x - towards.x, port.on.y - towards.y)
  return portsOf(box, clearance, used)
    .filter(port => (sideways ? port.on.x === border : port.on.y === border))
    .sort((one, other) =>
      priceOf(one, used) - priceOf(other, used) || reach(one) - reach(other))[0]!
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
  used: ReadonlySet<string>,
): readonly Point[] | undefined {
  const leaves = portsOf(from, clearance, used)
  const arrives = portsOf(to, clearance, used)
  const centres = [centre(from), centre(to)]
  const waypoints = [...centres, ...[...leaves, ...arrives].map(port => port.off)]
  const xs = ruled(between, clearance, 'x', waypoints.map(point => point.x))
  const ys = ruled(between, clearance, 'y', waypoints.map(point => point.y))

  const at = (spot: number): Point => ({ x: xs[spot % xs.length]!, y: ys[Math.floor(spot / xs.length)]! })
  const spotOf = (point: Point): number => ys.indexOf(point.y) * xs.length + xs.indexOf(point.x)
  const stepOn = new Map(arrives.map(port => [spotOf(port.off), port]))

  const priced = new Map<number, number>()
  const cameFrom = new Map<number, number>()
  const facing = new Map<number, 'x' | 'y'>()
  const waiting = new Set<number>()
  const steppedOff = new Map<number, Point>()
  for (const port of leaves) {
    const spot = spotOf(port.off)
    const asked = priceOf(port, used)
    if (asked >= (priced.get(spot) ?? Number.POSITIVE_INFINITY))
      continue
    priced.set(spot, asked)
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
      const arriving = stepOn.get(next)
      const asked = priced.get(here)!
        + Math.abs(other.x - one.x) + Math.abs(other.y - one.y)
        + (facing.get(here) !== undefined && facing.get(here) !== way ? BEND_COST : 0)
        + COMPANY_COST * shared(one, other, taken)
        + (arriving === undefined ? 0 : priceOf(arriving, used))
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
  return straightened([steppedOff.get(began)!, ...back.reverse(), stepOn.get(last)!.on])
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

function centre(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
