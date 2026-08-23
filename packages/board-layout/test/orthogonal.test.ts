import { describe, expect, it } from 'vitest'
import { orthogonalRouting } from '../src/orthogonal.js'
import type { Box, LayoutEdge, Point } from '../src/ports.js'

function card(id: string, x: number, y: number): Box & { id: string } {
  return { id, x, y, width: 400, height: 150 }
}

function link(from: string, to: string): LayoutEdge {
  return { id: `${from}-${to}`, type: 'uses', from, to }
}

/** Whether any run of a route passes through a box. */
function passesThrough(route: readonly Point[], box: Box): boolean {
  for (let index = 1; index < route.length; index += 1) {
    const one = route[index - 1]!
    const other = route[index]!
    const crosses = Math.min(one.x, other.x) < box.x + box.width
      && Math.max(one.x, other.x) > box.x
      && Math.min(one.y, other.y) < box.y + box.height
      && Math.max(one.y, other.y) > box.y
    if (crosses)
      return true
  }
  return false
}

describe('going round what is in the way', () => {
  it('runs straight across when nothing is in the way', async () => {
    const routed = await orthogonalRouting().route({
      obstacles: [card('a', 0, 0), card('b', 1000, 0)],
      edges: [link('a', 'b')],
    })
    expect(routed.edges.get('a-b')).toHaveLength(2)
  })

  // A card is drawn over the lines that reach it, so a line through one is a
  // line a reader cannot see, which is what left an arrow head in open space.
  it('goes round a card sitting between the two ends', async () => {
    const between = card('mid', 500, 0)
    const routed = await orthogonalRouting().route({
      obstacles: [card('a', 0, 0), between, card('b', 1000, 0)],
      edges: [link('a', 'b')],
    })
    expect(passesThrough(routed.edges.get('a-b')!, between)).toBe(false)
  })

  it('goes round several, not just the first', async () => {
    const wall = [card('m1', 500, 0), card('m2', 500, 200), card('m3', 500, 400)]
    const routed = await orthogonalRouting().route({
      obstacles: [card('a', 0, 200), ...wall, card('b', 1000, 200)],
      edges: [link('a', 'b')],
    })
    for (const box of wall)
      expect(passesThrough(routed.edges.get('a-b')!, box)).toBe(false)
  })

  it('leaves and arrives on a border, since a card is a side and not a point', async () => {
    const from = card('a', 0, 0)
    const routed = await orthogonalRouting().route({
      obstacles: [from, card('b', 1000, 0)],
      edges: [link('a', 'b')],
    })
    const [start] = routed.edges.get('a-b')!
    expect(start).toEqual({ x: from.x + from.width, y: from.y + from.height / 2 })
  })

  it('runs every segment along one axis, so a route reads as a route', async () => {
    const routed = await orthogonalRouting().route({
      obstacles: [card('a', 0, 0), card('mid', 500, 0), card('b', 1000, 0)],
      edges: [link('a', 'b')],
    })
    const route = routed.edges.get('a-b')!
    for (let index = 1; index < route.length; index += 1) {
      const one = route[index - 1]!
      const other = route[index]!
      expect(one.x === other.x || one.y === other.y).toBe(true)
    }
  })

  it('takes the straighter of two ways round when both are clear', async () => {
    const routed = await orthogonalRouting().route({
      obstacles: [card('a', 0, 0), card('b', 1000, 400)],
      edges: [link('a', 'b')],
    })
    expect(routed.edges.get('a-b')!.length).toBeLessThanOrEqual(3)
  })

  it('answers the same way every time it is asked', async () => {
    const request = {
      obstacles: [card('a', 0, 0), card('mid', 500, 0), card('b', 1000, 0)],
      edges: [link('a', 'b')],
    }
    const [once, again] = await Promise.all([
      orthogonalRouting().route(request),
      orthogonalRouting().route(request),
    ])
    expect(again.edges.get('a-b')).toEqual(once.edges.get('a-b'))
  })

  it('routes nothing for a line whose end is not on the board', async () => {
    const routed = await orthogonalRouting().route({
      obstacles: [card('a', 0, 0)],
      edges: [link('a', 'gone')],
    })
    expect(routed.edges.size).toBe(0)
  })
})

describe('where a line meets the card it belongs to', () => {
  // Three places to a side, evenly spaced. Left to meet a card wherever the
  // run between two centres happened to cross its border, a line arrived at a
  // different height for every card it came from, and a reader saw a scatter
  // of ends down a side rather than places a line can be at.
  it('meets each card in the middle of the side facing the other', async () => {
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'across', type: 'uses', from: 'left', to: 'right' }],
      obstacles: [
        { id: 'left', x: 0, y: 0, width: 200, height: 100 },
        { id: 'right', x: 400, y: 200, width: 200, height: 100 },
      ],
    })
    const points = routed.edges.get('across')!
    expect(points[0]).toEqual({ x: 200, y: 50 })
    expect(points[points.length - 1]).toEqual({ x: 400, y: 250 })
  })

  // The other two are only there to tell lines apart, so nothing takes one
  // while the middle is free, however much nearer it looks.
  it('keeps to the middle even when another place is nearer what it reaches for', async () => {
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'down', type: 'uses', from: 'here', to: 'well below' }],
      obstacles: [
        { id: 'here', x: 0, y: 0, width: 600, height: 300 },
        { id: 'well below', x: 900, y: 260, width: 100, height: 100 },
      ],
    })
    expect(routed.edges.get('down')![0]).toEqual({ x: 600, y: 150 })
  })

  it('spaces those places evenly down the side, whatever the card is', async () => {
    const routed = await orthogonalRouting().route({
      edges: [
        { id: 'high', type: 'uses', from: 'here', to: 'above' },
        { id: 'level', type: 'uses', from: 'here', to: 'level' },
        { id: 'low', type: 'uses', from: 'here', to: 'below' },
      ],
      obstacles: [
        { id: 'here', x: 0, y: 0, width: 200, height: 120 },
        { id: 'above', x: 600, y: -400, width: 100, height: 100 },
        { id: 'level', x: 600, y: 10, width: 100, height: 100 },
        { id: 'below', x: 600, y: 420, width: 100, height: 100 },
      ],
    })
    const left = ['high', 'level', 'low'].map(id => routed.edges.get(id)![0]!.y)
    expect(left.sort((one, other) => one - other)).toEqual([30, 60, 90])
  })

  it('sends a line to the next place along rather than onto another line', async () => {
    const routed = await orthogonalRouting().route({
      edges: [
        { id: 'one', type: 'uses', from: 'here', to: 'there' },
        { id: 'two', type: 'uses', from: 'here', to: 'alongside' },
      ],
      obstacles: [
        { id: 'here', x: 0, y: 0, width: 200, height: 120 },
        { id: 'there', x: 600, y: 10, width: 100, height: 100 },
        { id: 'alongside', x: 600, y: 12, width: 100, height: 100 },
      ],
    })
    expect(routed.edges.get('one')![0]).not.toEqual(routed.edges.get('two')![0])
  })

  it('still leaves a card square on when the run is square on', async () => {
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'level', type: 'uses', from: 'left', to: 'right' }],
      obstacles: [
        { id: 'left', x: 0, y: 0, width: 200, height: 100 },
        { id: 'right', x: 400, y: 0, width: 200, height: 100 },
      ],
    })
    const points = routed.edges.get('level')!
    expect(points[0]).toEqual({ x: 200, y: 50 })
    expect(points[points.length - 1]).toEqual({ x: 400, y: 50 })
  })
})

describe('a board crowded enough that no obvious corridor is clear', () => {
  // Every likely way round is blocked by something, so a router that tries a
  // handful of corridors and keeps the cheapest keeps one that goes through a
  // card. There is a way round, and it takes two turns to find.
  const boxed = [
    { id: 'below', x: 400, y: 800, width: 400, height: 100 },
    { id: 'above', x: 400, y: 0, width: 400, height: 100 },
    { id: 'left', x: 0, y: 300, width: 300, height: 200 },
    { id: 'middle', x: 380, y: 300, width: 440, height: 200 },
    { id: 'right', x: 900, y: 260, width: 300, height: 280 },
  ]

  async function route(): Promise<readonly { x: number, y: number }[]> {
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'past', type: 'uses', from: 'below', to: 'above' }],
      obstacles: boxed,
    })
    return routed.edges.get('past')!
  }

  it('goes round rather than through', async () => {
    const points = await route()
    for (let index = 1; index < points.length; index += 1) {
      for (const box of boxed.filter(one => one.id !== 'below' && one.id !== 'above'))
        expect(through(points[index - 1]!, points[index]!, box), box.id).toBe(false)
    }
  })

  it('turns only where it has to', async () => {
    expect((await route()).length).toBeLessThanOrEqual(5)
  })

  it('gives the same answer every time it is asked', async () => {
    expect(await route()).toEqual(await route())
  })
})

describe('two lines that would run down the same corridor', () => {
  // Lying on top of each other they read as one line, and the one underneath
  // is lost. Neither is wrong on its own, so the second is asked to move.
  const stacked = [
    { id: 'wall', x: 300, y: 200, width: 200, height: 400 },
    { id: 'oneStart', x: 0, y: 0, width: 100, height: 100 },
    { id: 'oneEnd', x: 700, y: 0, width: 100, height: 100 },
    { id: 'twoStart', x: 0, y: 700, width: 100, height: 100 },
    { id: 'twoEnd', x: 700, y: 700, width: 100, height: 100 },
  ]

  it('sends the second one a corridor over', async () => {
    const routed = await orthogonalRouting().route({
      edges: [
        { id: 'a', type: 'uses', from: 'oneStart', to: 'twoEnd' },
        { id: 'b', type: 'uses', from: 'twoStart', to: 'oneEnd' },
      ],
      obstacles: stacked,
    })
    const along = (points: readonly { x: number, y: number }[]): number[] =>
      points.slice(1).flatMap((point, index) =>
        point.x === points[index]!.x ? [point.x] : [])
    const shared = along(routed.edges.get('a')!).filter(x => along(routed.edges.get('b')!).includes(x))
    expect(shared).toEqual([])
  })
})

function through(one: { x: number, y: number }, other: { x: number, y: number }, box: { x: number, y: number, width: number, height: number }): boolean {
  return Math.min(one.x, other.x) < box.x + box.width
    && Math.max(one.x, other.x) > box.x
    && Math.min(one.y, other.y) < box.y + box.height
    && Math.max(one.y, other.y) > box.y
}

describe('the cards a line belongs to are in its way as much as any other', () => {
  // Aimed at the target's centre, a route reaches it by tunnelling through the
  // card and comes in along the inside of its own target, which is drawn over
  // the line, so the last stretch of it is not there.
  it('never runs inside either of the cards it joins', async () => {
    const boxes = [
      { id: 'below', x: 500, y: 900, width: 400, height: 150 },
      { id: 'above', x: 200, y: 0, width: 400, height: 158 },
      { id: 'blocking', x: 240, y: 300, width: 500, height: 200 },
    ]
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'up', type: 'uses', from: 'below', to: 'above' }],
      obstacles: boxes,
    })
    const points = routed.edges.get('up')!
    // The two ends sit on a border, so only what runs between them is checked.
    for (let index = 2; index < points.length - 1; index += 1) {
      for (const box of boxes)
        expect(through(points[index - 1]!, points[index]!, box), box.id).toBe(false)
    }
  })

  it('meets each card on a border rather than short of one', async () => {
    const boxes = [
      { id: 'below', x: 500, y: 900, width: 400, height: 150 },
      { id: 'above', x: 200, y: 0, width: 400, height: 158 },
      { id: 'blocking', x: 240, y: 300, width: 500, height: 200 },
    ]
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'up', type: 'uses', from: 'below', to: 'above' }],
      obstacles: boxes,
    })
    const points = routed.edges.get('up')!
    const on = (box: typeof boxes[number], at: { x: number, y: number }): boolean =>
      at.x === box.x || at.x === box.x + box.width || at.y === box.y || at.y === box.y + box.height
    expect(on(boxes[0]!, points[0]!)).toBe(true)
    expect(on(boxes[1]!, points[points.length - 1]!)).toBe(true)
  })
})

describe('ground a line may run over', () => {
  // A group is drawn under everything, so a line crossing one is in no danger
  // of being hidden by it. Told to avoid one, a line on a board whose groups
  // fill it finds no way through at all.
  it('runs straight over a group rather than round it', async () => {
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'over', type: 'uses', from: 'here', to: 'there' }],
      obstacles: [
        { id: 'here', x: 0, y: 0, width: 100, height: 100 },
        { id: 'there', x: 600, y: 0, width: 100, height: 100 },
        { id: 'section', x: 150, y: -400, width: 400, height: 900, ground: true },
      ],
    })
    expect(routed.edges.get('over')).toHaveLength(2)
  })
})

describe('when a clear run is drawn as a curve and when it turns square', () => {
  // A curve reads as one only while the two ends have more room along the way
  // they face than they are offset across it. Almost stacked and facing
  // sideways, the same curve turns through most of a right angle within a few
  // pixels of each end and hooks into its own arrow head.
  async function between(here: Box, there: Box): Promise<readonly { x: number, y: number }[]> {
    const routed = await orthogonalRouting().route({
      edges: [{ id: 'run', type: 'uses', from: 'here', to: 'there' }],
      obstacles: [{ id: 'here', ...here }, { id: 'there', ...there }],
    })
    return routed.edges.get('run')!
  }

  it('hands back two ends when there is room along the way they face', async () => {
    expect(await between(
      { x: 0, y: 0, width: 200, height: 100 },
      { x: 800, y: 60, width: 200, height: 100 },
    )).toHaveLength(2)
  })

  // Side by side, so both face sideways, but their facing borders are 80
  // apart with 214 of climb between them.
  it('turns square when the offset across is the larger of the two', async () => {
    const run = await between(
      { x: 1080, y: 840, width: 400, height: 133 },
      { x: 600, y: 624, width: 400, height: 137 },
    )
    expect(run.length).toBeGreaterThan(2)
    for (let index = 1; index < run.length; index += 1) {
      const square = run[index]!.x === run[index - 1]!.x || run[index]!.y === run[index - 1]!.y
      expect(square).toBe(true)
    }
  })

  it('meets both cards square on however it got there', async () => {
    const run = await between(
      { x: 1080, y: 840, width: 400, height: 133 },
      { x: 600, y: 624, width: 400, height: 137 },
    )
    expect(run[0]!.y).toBe(run[1]!.y)
    expect(run[run.length - 1]!.y).toBe(run[run.length - 2]!.y)
  })
})
