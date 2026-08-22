import { describe, expect, it } from 'vitest'
import { settledByPull } from '../src/settling.js'
import type { Box, LayoutEdge } from '../src/ports.js'

function box(x: number, y: number, width = 100): Box {
  return { x, y, width, height: 100 }
}

function link(from: string, to: string): LayoutEdge {
  return { id: `${from}-${to}`, type: 'relatesTo', from, to }
}

function spread(edges: readonly LayoutEdge[], at: ReadonlyMap<string, Box>): number {
  return edges.reduce((sum, edge) => {
    const from = at.get(edge.from)!
    const to = at.get(edge.to)!
    return sum + Math.abs((from.x + from.width / 2) - (to.x + to.width / 2))
  }, 0)
}

describe('settling rows by what pulls on them', () => {
  // Two rows of three. The pairs that relate sit at opposite ends, which is
  // what a packing that fills space rather than reading relations leaves.
  const rows = [['a', 'b', 'c'], ['x', 'y', 'z']]
  const packed = new Map([
    ['a', box(0, 0)],
    ['b', box(200, 0)],
    ['c', box(400, 0)],
    ['x', box(0, 300)],
    ['y', box(200, 300)],
    ['z', box(400, 300)],
  ])
  const relations = [link('a', 'z'), link('c', 'x')]

  it('shortens what the relations have to reach', () => {
    const settled = settledByPull(rows, relations, packed)
    expect(spread(relations, settled)).toBeLessThan(spread(relations, packed))
  })

  it('leaves every row standing on the ground it had', () => {
    const settled = settledByPull(rows, relations, packed)
    for (const row of rows) {
      const boxes = row.map(id => settled.get(id)!)
      expect(Math.min(...boxes.map(one => one.x))).toBe(0)
      expect(Math.max(...boxes.map(one => one.x + one.width))).toBe(500)
    }
  })

  it('leaves every row on the row it was in', () => {
    const settled = settledByPull(rows, relations, packed)
    for (const [id, was] of packed)
      expect(settled.get(id)!.y).toBe(was.y)
  })

  it('gives the same answer every time it is asked', () => {
    const once = settledByPull(rows, relations, packed)
    const twice = settledByPull(rows, relations, packed)
    expect([...twice]).toEqual([...once])
  })

  it('keeps a packing that no relation asks it to improve', () => {
    const settled = settledByPull(rows, [], packed)
    expect([...settled]).toEqual([...packed])
  })

  it('puts a pair that only relates to each other side by side', () => {
    // Barycentre alone cannot do this. Each of the pair aims at where the
    // other stands, so they swap and the reach between them is what it was.
    const ends = new Map([['a', box(0, 0)], ['b', box(200, 0)], ['c', box(400, 0)]])
    const settled = settledByPull([['a', 'b', 'c']], [link('a', 'c')], ends)
    expect(Math.abs(settled.get('a')!.x - settled.get('c')!.x)).toBe(200)
  })

  it('falls back to the estimate rather than making a reader wait on a long row', () => {
    const long = Array.from({ length: 9 }, (_, index) => [`n${index}`, box(index * 200, 0)] as const)
    const settled = settledByPull(
      [long.map(([id]) => id)],
      [link('n0', 'n8')],
      new Map([...long, ['pull', box(0, 300)]]),
    )
    expect(settled.size).toBe(10)
  })

  it('spaces a row it reorders evenly, whatever spacing it was handed', () => {
    const uneven = new Map([['a', box(0, 0)], ['b', box(140, 0)], ['c', box(400, 0)], ['x', box(0, 300)]])
    const settled = settledByPull([['a', 'b', 'c'], ['x']], [link('c', 'x')], uneven)
    const laid = [...settled.values()].filter(one => one.y === 0).sort((one, other) => one.x - other.x)
    const gaps = laid.slice(1).map((one, index) => one.x - (laid[index]!.x + laid[index]!.width))
    expect(gaps).toEqual([100, 100])
  })

  it('leaves a row of one alone', () => {
    const alone = new Map([['a', box(0, 0)], ['x', box(700, 300)]])
    const settled = settledByPull([['a'], ['x']], [link('a', 'x')], alone)
    expect([...settled]).toEqual([...alone])
  })

  it('ignores a relation to something it was not given', () => {
    const settled = settledByPull(rows, [link('a', 'elsewhere')], packed)
    expect([...settled]).toEqual([...packed])
  })

  it('packs rows whose members differ in width without overlapping them', () => {
    const mixed = new Map([['a', box(0, 0, 300)], ['b', box(320, 0, 100)], ['c', box(440, 0, 200)]])
    const settled = settledByPull([['a', 'b', 'c']], [link('a', 'far')], mixed)
    const laid = [...settled.values()].sort((one, other) => one.x - other.x)
    for (let index = 1; index < laid.length; index += 1)
      expect(laid[index]!.x).toBeGreaterThanOrEqual(laid[index - 1]!.x + laid[index - 1]!.width)
  })
})
