import type { Box, LayoutEdge } from '@newledge/board-layout'
import { describe, expect, it } from 'vitest'
import { kinship } from '../src/lib/family.js'

function box(x: number, y: number): Box {
  return { x, y, width: 200, height: 100 }
}

// The kinds stand well clear of the parts, since a trunk that would run
// through a card is not drawn as one and this fixture is about the trunks.
const at = new Map<string, Box>([
  ['whole', box(300, 0)],
  ['kindA', box(900, 300)],
  ['kindB', box(1200, 300)],
  ['partA', box(0, 600)],
  ['partB', box(300, 600)],
])

function edge(id: string, type: string, from: string, to: string): LayoutEdge {
  return { id, type, from, to }
}

describe('drawing a hierarchy', () => {
  const kin = kinship([
    edge('k1', 'extends', 'kindA', 'whole'),
    edge('k2', 'extends', 'kindB', 'whole'),
    edge('p1', 'contains', 'whole', 'partA'),
    edge('p2', 'contains', 'whole', 'partB'),
    edge('u1', 'uses', 'kindA', 'kindB'),
  ], at)

  it('leaves a curve to be drawn between its two ends, not as a tree', () => {
    expect(kin.edges.has('u1')).toBe(false)
  })

  it('runs every sibling down the one trunk, so a family reads as one relation', () => {
    const [one, other] = [kin.edges.get('k1')!, kin.edges.get('k2')!]
    expect(one[2]).toEqual(other[2])
    expect(one[3]).toEqual(other[3])
  })

  // A kind extends what it is a kind of, so the general one is the root even
  // though the relation is written from the narrow end.
  it('roots a kind at what it is a kind of, not at the end it was written from', () => {
    const upward = kinship(
      [edge('k1', 'extends', 'kindA', 'whole')],
      new Map([['whole', box(300, 0)], ['kindA', box(0, 300)]]),
    )
    const route = upward.edges.get('k1')!
    expect(route[3]).toEqual({ x: 400, y: 100 })
    expect(route[0]).toEqual({ x: 100, y: 300 })
  })

  it('roots a part at the whole that holds it, which is the end it was written from', () => {
    const route = kin.edges.get('p1')!
    expect(route[3]).toEqual({ x: 400, y: 100 })
    expect(route[0]).toEqual({ x: 100, y: 600 })
  })

  // The end that says what a relation is has to land on the root from outside,
  // since a card is drawn over the lines that reach it.
  it('finishes on the root, so its end is not covered by the card it points at', () => {
    const route = kin.edges.get('p1')!
    expect(route[route.length - 1]).toEqual({ x: 400, y: 100 })
  })

  it('keeps the shared bar clear of both the parent and the children', () => {
    const bar = kin.edges.get('k1')![2]!.y
    expect(bar).toBeGreaterThan(100)
    expect(bar).toBeLessThan(300)
  })

  it('drops the bar just below the parent when there is no room to halve it', () => {
    const tight = kinship(
      [edge('k1', 'extends', 'kindA', 'whole')],
      new Map([['whole', box(0, 0)], ['kindA', box(0, 120)]]),
    )
    expect(tight.edges.get('k1')![2]!.y).toBeGreaterThan(100)
  })

  it('keeps a whole and a kind apart, even from the same card', () => {
    expect(kin.edges.get('k1')![2]).not.toEqual(kin.edges.get('p1')![2])
  })

  // A card is drawn over the lines that reach it, so a bar crossing one takes
  // the run that leads to it out of sight, which is what made a trunk between
  // two cards side by side read as a stray line.
  it('keeps the bar clear of a child that is not below the parent at all', () => {
    const beside = kinship(
      [edge('p1', 'contains', 'whole', 'partA')],
      new Map([['whole', box(0, 0)], ['partA', box(400, 60)]]),
    )
    const route = beside.edges.get('p1')!
    expect(route[1]!.y).toBeGreaterThan(160)
  })

  it('leaves a child by the side the bar is on, not always by its top', () => {
    const beside = kinship(
      [edge('p1', 'contains', 'whole', 'partA')],
      new Map([['whole', box(0, 0)], ['partA', box(400, 60)]]),
    )
    expect(beside.edges.get('p1')![0]!.y).toBe(160)
  })

  it('still runs the bar between a parent and children that sit below it', () => {
    const bar = kin.edges.get('p1')![2]!.y
    expect(bar).toBeGreaterThan(100)
    expect(bar).toBeLessThan(600)
  })

  it('draws nothing for a relation whose end is not on the board', () => {
    const stray = kinship([edge('k1', 'extends', 'gone', 'whole')], at)
    expect(stray.edges.size).toBe(0)
  })
})

describe('a family whose children sit above its root', () => {
  // A layout is free to put children above their root, and a trunk sent
  // downwards then runs through the root's own card and out the far side,
  // which reads as a line that has been cut in two.
  const upward = kinship(
    [edge('p1', 'contains', 'whole', 'partA'), edge('p2', 'contains', 'whole', 'partB')],
    new Map([
      ['whole', box(300, 600)],
      ['partA', box(0, 0)],
      ['partB', box(600, 0)],
    ]),
  )

  it('meets the root on the face the children are on', () => {
    expect(upward.edges.get('p1')![3]).toEqual({ x: 400, y: 600 })
  })

  it('runs the bar between the children and the root, not past the root', () => {
    const bar = upward.edges.get('p1')![2]!.y
    expect(bar).toBeGreaterThan(100)
    expect(bar).toBeLessThan(600)
  })

  it('leaves each child by the face the bar is on', () => {
    expect(upward.edges.get('p1')![0]).toEqual({ x: 100, y: 100 })
    expect(upward.edges.get('p2')![0]).toEqual({ x: 700, y: 100 })
  })

  it('still shares one bar, so a family reads as one relation', () => {
    expect(upward.edges.get('p1')![2]!.y).toBe(upward.edges.get('p2')![2]!.y)
  })

  it('clears a child that straddles the root rather than crossing it', () => {
    const straddling = kinship(
      [edge('p1', 'contains', 'whole', 'partA')],
      new Map([['whole', box(0, 300)], ['partA', box(400, 250)]]),
    )
    const bar = straddling.edges.get('p1')![2]!.y
    expect(bar).toBeLessThan(250)
  })
})

describe('a bar long enough to reach cards outside its own family', () => {
  // A family spread wide has a bar that runs past cards with nothing to do
  // with it. A card is drawn over the lines that reach it, so a bar through
  // one reads as two lines with a gap where the card sits.
  const stranger = box(300, 300)

  it('runs clear of a card that has nothing to do with it', () => {
    const wide = kinship(
      [edge('p1', 'contains', 'whole', 'part')],
      new Map([
        ['whole', box(0, 0)],
        ['part', box(900, 500)],
        ['stranger', stranger],
      ]),
    )
    const bar = wide.edges.get('p1')![2]!.y
    expect(bar < stranger.y || bar > stranger.y + stranger.height).toBe(true)
  })

  it('leaves the bar where it wanted when nothing is in the way', () => {
    const clear = kinship(
      [edge('p1', 'contains', 'whole', 'part')],
      new Map([['whole', box(0, 0)], ['part', box(900, 500)]]),
    )
    const bar = clear.edges.get('p1')![2]!.y
    expect(bar).toBeGreaterThan(100)
    expect(bar).toBeLessThan(500)
  })

  it('ignores a card that stands beside the bar rather than under it', () => {
    const beside = kinship(
      [edge('p1', 'contains', 'whole', 'part')],
      new Map([
        ['whole', box(0, 0)],
        ['part', box(300, 500)],
        ['far', box(2000, 300)],
      ]),
    )
    const clear = kinship(
      [edge('p1', 'contains', 'whole', 'part')],
      new Map([['whole', box(0, 0)], ['part', box(300, 500)]]),
    )
    expect(beside.edges.get('p1')![2]!.y).toBe(clear.edges.get('p1')![2]!.y)
  })
})

describe('a bar squeezed by a card in the middle of its reach', () => {
  it('goes to whichever side of it leaves the bar nearest where it wanted', () => {
    // The card blocking the bar sits low, so passing above it is the shorter
    // move. Sent only further from the root, the bar would go the long way.
    const squeezed = kinship(
      [edge('p1', 'contains', 'whole', 'part')],
      new Map([
        ['whole', box(0, 0)],
        ['part', box(900, 1000)],
        ['stranger', box(300, 560)],
      ]),
    )
    const bar = squeezed.edges.get('p1')![2]!.y
    expect(bar).toBeLessThan(560)
    expect(bar).toBeGreaterThan(100)
  })

  it('never comes back past the face it leaves the root by', () => {
    const crowded = kinship(
      [edge('p1', 'contains', 'whole', 'part')],
      new Map([
        ['whole', box(0, 0)],
        ['part', box(900, 1000)],
        ['stranger', box(300, 120)],
      ]),
    )
    expect(crowded.edges.get('p1')![2]!.y).toBeGreaterThan(100)
  })
})

describe('a relation that is not a hierarchy but still has a root', () => {
  // Eight claims about one concept are eight lines converging on it from
  // wherever each claim happens to sit, which reads as a spray, and a card has
  // only three places to a side to receive them.
  it('gathers what many say about one thing onto a single trunk', () => {
    const said = kinship(
      [
        edge('a1', 'concerns', 'oneClaim', 'topic'),
        edge('a2', 'concerns', 'twoClaim', 'topic'),
        edge('a3', 'concerns', 'threeClaim', 'topic'),
      ],
      new Map([
        ['topic', box(400, 0)],
        ['oneClaim', box(0, 400)],
        ['twoClaim', box(400, 400)],
        ['threeClaim', box(800, 400)],
      ]),
    )
    const roots = ['a1', 'a2', 'a3'].map((id) => {
      const run = said.edges.get(id)!
      return JSON.stringify(run[run.length - 1])
    })
    expect(new Set(roots).size).toBe(1)
  })

  it('keeps one trunk per kind, since two kinds are two things to say', () => {
    const said = kinship(
      [
        edge('a1', 'concerns', 'claim', 'whole'),
        edge('c1', 'contains', 'whole', 'part'),
      ],
      new Map([['whole', box(400, 400)], ['claim', box(0, 0)], ['part', box(800, 800)]]),
    )
    const meets = ['a1', 'c1'].map((id) => {
      const run = said.edges.get(id)!
      return JSON.stringify(run[run.length - 1])
    })
    expect(new Set(meets).size).toBe(2)
  })

  it('leaves a relation with no root to be routed like any other line', () => {
    const said = kinship(
      [edge('r1', 'relatesTo', 'here', 'there')],
      new Map([['here', box(0, 0)], ['there', box(400, 400)]]),
    )
    expect(said.edges.has('r1')).toBe(false)
  })
})

describe('a trunk the layout never gathered', () => {
  // A trunk is worked out from where the cards are and from nothing else, so
  // it is only honest where the layout kept the family together. Given one it
  // never gathered, the bar reaches across the board and the stems cross
  // whatever stands between, which is what a router would have gone round.
  const scattered = new Map<string, Box>([
    ['root', box(0, 0)],
    ['far', box(1200, 800)],
    ['between', box(0, 300)],
  ])

  it('is not drawn as a trunk, so its relations are routed like any other line', () => {
    const said = kinship([edge('a1', 'contains', 'root', 'far')], scattered)
    expect(said.edges.has('a1')).toBe(false)
  })

  it('is drawn as one once nothing stands in its way', () => {
    const clear = new Map<string, Box>([['root', box(0, 0)], ['far', box(1200, 800)]])
    expect(kinship([edge('a1', 'contains', 'root', 'far')], clear).edges.has('a1')).toBe(true)
  })

  it('gives up the whole family, since half a trunk is not a trunk', () => {
    const half = kinship(
      [edge('a1', 'contains', 'root', 'near'), edge('a2', 'contains', 'root', 'far')],
      new Map([...scattered, ['near', box(0, 800)]]),
    )
    expect([half.edges.has('a1'), half.edges.has('a2')]).toEqual([false, false])
  })
})

describe('a stem that would cross the sibling it was gathered with', () => {
  // A stem drops from its own child to the bar and passes whatever is under it
  // on the way, and what is under it is most often the sibling the trunk was
  // drawn to gather it with.
  it('gives up the trunk rather than run through a sibling', () => {
    const stacked = kinship(
      [edge('a1', 'contains', 'root', 'above'), edge('a2', 'contains', 'root', 'below')],
      new Map([
        ['root', box(0, 0)],
        ['above', box(700, 200)],
        ['below', box(700, 500)],
      ]),
    )
    expect(stacked.edges.has('a1')).toBe(false)
  })

  it('keeps it when the siblings stand side by side, which is the point of one', () => {
    const beside = kinship(
      [edge('a1', 'contains', 'root', 'left'), edge('a2', 'contains', 'root', 'right')],
      new Map([
        ['root', box(300, 0)],
        ['left', box(0, 500)],
        ['right', box(600, 500)],
      ]),
    )
    expect([beside.edges.has('a1'), beside.edges.has('a2')]).toEqual([true, true])
  })
})
