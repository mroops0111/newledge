import type { Box, LayoutEdge } from '@newledge/board-layout'
import { describe, expect, it } from 'vitest'
import { kinship } from '../src/lib/family.js'

function box(x: number, y: number): Box {
  return { x, y, width: 200, height: 100 }
}

const at = new Map<string, Box>([
  ['whole', box(300, 0)],
  ['kindA', box(0, 300)],
  ['kindB', box(600, 300)],
  ['partA', box(0, 600)],
  ['partB', box(300, 600)],
])

function edge(id: string, type: string, from: string, to: string): LayoutEdge {
  return { id, type, from, to }
}

describe('drawing a hierarchy', () => {
  const kin = kinship([
    edge('k1', 'extends', 'whole', 'kindA'),
    edge('k2', 'extends', 'whole', 'kindB'),
    edge('p1', 'contains', 'whole', 'partA'),
    edge('p2', 'contains', 'whole', 'partB'),
    edge('u1', 'uses', 'kindA', 'kindB'),
  ], at)

  it('leaves a curve to be drawn between its two ends, not as a tree', () => {
    expect(kin.edges.has('u1')).toBe(false)
  })

  it('runs every sibling down the one trunk, so a family reads as one relation', () => {
    const [one, other] = [kin.edges.get('k1')!, kin.edges.get('k2')!]
    expect(one[0]).toEqual(other[0])
    expect(one[1]).toEqual(other[1])
  })

  it('leaves the trunk from the parent and arrives at the top of each child', () => {
    const route = kin.edges.get('k1')!
    expect(route[0]).toEqual({ x: 400, y: 100 })
    expect(route[3]).toEqual({ x: 100, y: 300 })
  })

  it('keeps the shared bar clear of both the parent and the children', () => {
    const bar = kin.edges.get('k1')![1]!.y
    expect(bar).toBeGreaterThan(100)
    expect(bar).toBeLessThan(300)
  })

  it('drops the bar just below the parent when there is no room to halve it', () => {
    const tight = kinship(
      [edge('k1', 'extends', 'whole', 'kindA')],
      new Map([['whole', box(0, 0)], ['kindA', box(0, 120)]]),
    )
    expect(tight.edges.get('k1')![1]!.y).toBeGreaterThan(100)
  })

  it('keeps a whole and a kind apart, even from the same card', () => {
    expect(kin.edges.get('k1')![1]).not.toEqual(kin.edges.get('p1')![1])
  })

  it('draws nothing for a relation whose end is not on the board', () => {
    const stray = kinship([edge('k1', 'extends', 'whole', 'gone')], at)
    expect(stray.edges.size).toBe(0)
  })
})
