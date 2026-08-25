import { Congestion } from './congestion.js'
import { centreOf, crossesBox } from './geometry.js'
import type { Box, LayoutEdge, Obstacle, Point, Routed, Routing, RoutingRequest } from './ports.js'
import type { Port } from './sides.js'
import { alignedPlaces, facingPort, keyOf, offMiddle, placesFacing, portsOf, priceOf } from './sides.js'

/** How far a line stays clear of a card it is going round. */
const CLEARANCE = 20

/**
 * Lines that go round the cards between their ends.
 * A line drawn straight between two cards passes under whatever is between,
 * and a card is drawn over the lines that reach it,
 * so what a reader sees is an arrow head in open space, attached to nothing.
 *
 * Where the straight run is clear the two ends are handed back on their own,
 * which is what lets a curve be drawn along it. Where it is not,
 * the way round is the cheapest path across the grid the cards themselves rule,
 * which is how an orthogonal connector is routed.
 * Trying a handful of likely corridors instead was quicker to write and to run,
 * but a board only has to be crowded in one place for none of them to be clear,
 * and the line then took the least bad of them and ran straight through a card.
 */
export function orthogonalRouting(clearance = CLEARANCE): Routing {
  return {
    id: 'orthogonal',
    route: async (request: RoutingRequest) => run(request, clearance),
  }
}

/**
 * What one board charges a line, which is settled before any of them is drawn.
 * Held together so the prices a route is judged on cannot drift apart,
 * and so that what a turn is worth follows from the board it is drawn on.
 */
interface Tariff {
  /** What a turn costs, in the units a run is measured in. */
  readonly turning: number
  readonly clearance: number
  readonly congestion: Congestion
  /** Places on a card that a line already ends at. */
  readonly endings: Set<string>
}

function run(request: RoutingRequest, clearance: number): Routed {
  const byId = new Map(request.obstacles.map(box => [box.id, box]))
  const edges = new Map<string, readonly Point[]>()
  const tariff: Tariff = {
    turning: bendCost(request.obstacles),
    clearance,
    congestion: new Congestion(),
    endings: new Set((request.spoken ?? []).map(keyOf)),
  }

  // Routed in a settled order,
  // since each line is laid out knowing where the ones before it went,
  // and an order that drifted would move lines about for no visible reason.
  //
  // A line whose two cards already face each other place to place goes first.
  // Places are taken as lines are drawn,
  // so in name order the first line to want one got it,
  // however little it gained by it,
  // and a line that would have run dead straight found the place gone,
  // and bent instead. Ordered by what the place is worth to the line asking,
  // that no longer happens, and the order is still settled,
  // since nothing in it depends on what has been drawn.
  const claim = (edge: LayoutEdge): number => {
    const [from, to] = [byId.get(edge.from), byId.get(edge.to)]
    return from !== undefined && to !== undefined && alignedPlaces(from, to) ? 0 : 1
  }
  const asked = [...request.edges].sort((one, other) =>
    claim(one) - claim(other) || one.id.localeCompare(other.id))

  for (const edge of asked) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (from === undefined || to === undefined)
      continue
    const between = request.obstacles.filter(box =>
      box.ground !== true && box.id !== edge.from && box.id !== edge.to)
    const route = best(from, to, between, tariff)
    edges.set(edge.id, route)
    tariff.congestion.remember(route)
    tariff.endings.add(keyOf(route[0]!)).add(keyOf(route[route.length - 1]!))
  }
  return { edges }
}

/**
 * A bend costs as much as crossing the whole board. Priced against length,
 * a line buys a turn whenever the turn saves more than the turn costs,
 * and on a board of any size that is most of the time.
 * Seven of twenty-one lines turned three or four times,
 * and a reader following one of those has lost it.
 * Priced above any distance there is,
 * a line turns only when it has no way through without turning,
 * so what it costs is worked out from the board rather than written down.
 */
function bendCost(obstacles: readonly Box[]): number {
  if (obstacles.length === 0)
    return 0
  const width = Math.max(...obstacles.map(box => box.x + box.width)) - Math.min(...obstacles.map(box => box.x))
  const height = Math.max(...obstacles.map(box => box.y + box.height)) - Math.min(...obstacles.map(box => box.y))
  return width + height
}

/** The straight run when it is clear, the cheapest way round when it is not. */
function best(
  from: Obstacle,
  to: Obstacle,
  between: readonly Obstacle[],
  tariff: Tariff,
): readonly Point[] {
  const unobstructed = (run: readonly Point[]): boolean => !run.some((point, step) =>
    step > 0 && between.some(box => crossesBox(run[step - 1]!, point, box)))

  // A run between two places the cards already offer, needing no bend at all,
  // beats sliding the ends off those places, so it is tried first.
  const inLine = straightThrough(from, to, tariff)
  if (inLine !== undefined && unobstructed(inLine))
    return inLine

  const leaves = facingPort(from, centreOf(to), tariff.clearance, tariff.endings)
  const arrives = facingPort(to, centreOf(from), tariff.clearance, tariff.endings)
  const straight = clear(leaves, arrives)

  if (unobstructed(straight))
    return straight

  const round = around(from, to, [...between, from, to], tariff)
  return round ?? [leaves.on, arrives.on]
}

/**
 * A run needing no bend, between a free place on each card.
 *
 * Card widths divide four ways by the grid,
 * so a layout that put two cards in line put their places in line as well.
 * Where such a pair is on offer, the line is dead straight,
 * and both ends meet a card where a reader expects a line to meet one,
 * which is better than either bending or sliding off.
 *
 * Only among the places each side actually offers,
 * which is its middle until the middle is taken.
 * A card is not made to give up its middle to straighten a line,
 * since a lone line entering off the middle reads as a mistake,
 * and the bend it saved was the smaller thing to read past.
 *
 * The pair nearest the two middles wins,
 * so two cards whose middles agree meet middle to middle.
 */
function straightThrough(from: Box, to: Box, tariff: Tariff): [Point, Point] | undefined {
  const here = placesFacing(from, centreOf(to), tariff.clearance, tariff.endings)
  const there = placesFacing(to, centreOf(from), tariff.clearance, tariff.endings)

  let found: [Point, Point] | undefined
  let nearest = Number.POSITIVE_INFINITY
  for (const mine of here) {
    if (tariff.endings.has(keyOf(mine.on)))
      continue
    for (const theirs of there) {
      if (mine.facing !== theirs.facing || tariff.endings.has(keyOf(theirs.on)))
        continue
      const lined = mine.facing === 'y'
        ? mine.on.x === theirs.on.x
        : mine.on.y === theirs.on.y
      if (!lined)
        continue
      const spent = offMiddle(from, mine) + offMiddle(to, theirs)
      if (spent < nearest) {
        nearest = spent
        found = [mine.on, theirs.on]
      }
    }
  }
  return found
}

/**
 * The way between two places when nothing is in between.
 * Two ends given nothing but each other are handed back as they are,
 * and the drawing bows them into an S.
 * It reads as a line only while the two have more room along the way they face,
 * than they are offset across it.
 * Given a pair almost stacked on top of each other and facing sideways,
 * the same bow has to turn through most of a right angle,
 * within a few pixels of each end, and the line hooks into its own arrow head.
 * Those turn square instead.
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

/**
 * The cheapest way round, along the grid the cards themselves rule.
 *
 * Every card contributes the lines just outside each of its four borders,
 * and the two ends contribute their own centre lines,
 * so anywhere worth turning is a crossing of two of them.
 * That grid is the visibility graph an orthogonal connector is routed on,
 * and the cheapest path across it is found the way any cheapest path is.
 * A step that would run through a card is not offered at all,
 * so no route through one can come back as the least bad.
 *
 * The two cards at the ends are in the way as much as any other.
 * So the search runs between the points a line waits at off their four sides,
 * rather than between their centres. Aimed at a centre instead,
 * a route reaches it by tunnelling through the card it belongs to,
 * and comes in along the inside of its own target.
 */
function around(
  from: Box,
  to: Box,
  between: readonly Obstacle[],
  tariff: Tariff,
): readonly Point[] | undefined {
  const leaves = portsOf(from, tariff.clearance, tariff.endings)
  const arrives = portsOf(to, tariff.clearance, tariff.endings)
  const waypoints = [centreOf(from), centreOf(to), ...[...leaves, ...arrives].map(port => port.off)]
  const columns = ruled(between, tariff.clearance, 'x', waypoints.map(point => point.x))
  const rows = ruled(between, tariff.clearance, 'y', waypoints.map(point => point.y))

  const crossing = new Crossings(columns, rows)
  const stepOn = new Map(arrives.map(port => [crossing.spotOf(port.off), port]))

  const priced = new Map<number, number>()
  const cameFrom = new Map<number, number>()
  const waiting = new Set<number>()
  const steppedOff = new Map<number, Point>()
  for (const port of leaves) {
    const state = crossing.stateOf(crossing.spotOf(port.off), port.facing)
    const asked = priceOf(port, tariff.endings)
    if (asked >= (priced.get(state) ?? Number.POSITIVE_INFINITY))
      continue
    priced.set(state, asked)
    steppedOff.set(state, port.on)
    waiting.add(state)
  }

  let last = -1
  while (waiting.size > 0) {
    let here = -1
    for (const candidate of waiting) {
      if (here === -1 || priced.get(candidate)! < priced.get(here)!)
        here = candidate
    }
    waiting.delete(here)
    if (stepOn.has(crossing.spotAt(here))) {
      last = here
      break
    }

    const spot = crossing.spotAt(here)
    for (const [nextSpot, way] of crossing.nextTo(spot)) {
      const [one, other] = [crossing.at(spot), crossing.at(nextSpot)]
      if (between.some(box => crossesBox(one, other, box)))
        continue

      const arriving = stepOn.get(nextSpot)
      // The step onto the card is charged here rather than left to the end.
      // It is a turn like any other when the line was not going that way,
      // and unpriced it let a route take three turns where two would do.
      const asked = priced.get(here)!
        + Math.abs(other.x - one.x) + Math.abs(other.y - one.y)
        + (crossing.wayOf(here) === way ? 0 : tariff.turning)
        + tariff.congestion.costOf(one, other)
        + (arriving === undefined
          ? 0
          : priceOf(arriving, tariff.endings) + (arriving.facing === way ? 0 : tariff.turning))
      const next = crossing.stateOf(nextSpot, way)
      if (asked < (priced.get(next) ?? Number.POSITIVE_INFINITY)) {
        priced.set(next, asked)
        cameFrom.set(next, here)
        waiting.add(next)
      }
    }
  }

  if (last === -1)
    return undefined

  const back: Point[] = []
  let began = last
  for (let state: number | undefined = last; state !== undefined; state = cameFrom.get(state)) {
    back.push(crossing.at(crossing.spotAt(state)))
    began = state
  }
  return straightened([steppedOff.get(began)!, ...back.reverse(), stepOn.get(crossing.spotAt(last))!.on])
}

/**
 * The grid a route is searched over, and the states a search may be in on it.
 *
 * A state is a place and the way a line was going when it got there,
 * not a place alone.
 * A turn costs what it costs only if the search tells arrivals apart.
 * One direction is kept per place,
 * or a later path inherits an earlier path's direction,
 * and pays nothing for a turn it did make.
 */
class Crossings {
  constructor(
    private readonly columns: readonly number[],
    private readonly rows: readonly number[],
  ) {}

  at(spot: number): Point {
    return {
      x: this.columns[spot % this.columns.length]!,
      y: this.rows[Math.floor(spot / this.columns.length)]!,
    }
  }

  spotOf(point: Point): number {
    return this.rows.indexOf(point.y) * this.columns.length + this.columns.indexOf(point.x)
  }

  stateOf(spot: number, way: 'x' | 'y'): number {
    return spot * 2 + (way === 'x' ? 0 : 1)
  }

  spotAt(state: number): number {
    return (state - (state % 2)) / 2
  }

  wayOf(state: number): 'x' | 'y' {
    return state % 2 === 0 ? 'x' : 'y'
  }

  /** The four places one step away, each with the way a line gets there. */
  nextTo(spot: number): [number, 'x' | 'y'][] {
    const column = spot % this.columns.length
    const row = Math.floor(spot / this.columns.length)
    const steps: [number, number][] = [
      [column - 1, row],
      [column + 1, row],
      [column, row - 1],
      [column, row + 1],
    ]
    return steps
      .filter(([nextColumn, nextRow]) => nextColumn >= 0 && nextColumn < this.columns.length
        && nextRow >= 0 && nextRow < this.rows.length)
      .map(([nextColumn, nextRow]) => [
        nextRow * this.columns.length + nextColumn,
        nextRow === row ? 'x' : 'y',
      ])
  }
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

/** Drop the points a route passes through, keep the ones it turns at. */
function straightened(route: readonly Point[]): Point[] {
  const kept: Point[] = []
  for (const [step, point] of route.entries()) {
    const before = kept[kept.length - 1]
    const after = route[step + 1]
    const throughout = before !== undefined && after !== undefined
      && ((before.x === point.x && point.x === after.x) || (before.y === point.y && point.y === after.y))
    if (!throughout)
      kept.push(point)
  }
  return kept
}
