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
