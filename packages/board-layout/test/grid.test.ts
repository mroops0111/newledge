import { describe, expect, it } from 'vitest'
import { boxesOverlap } from '../src/geometry.js'
import { gridPlacement } from '../src/grid.js'
import type { Box, LayoutNode, PlacementRequest } from '../src/ports.js'

function node(id: string, groupId?: string, height = 100): LayoutNode {
  return { id, type: 'Concept', width: 240, height, ...(groupId === undefined ? {} : { groupId }) }
}

function request(over: Partial<PlacementRequest> = {}): PlacementRequest {
  return { nodes: [], edges: [], groups: [], ...over }
}

describe('rows and columns', () => {
  it('sizes a group to what it holds rather than to a fixed extent', async () => {
    const one = await gridPlacement().place(request({
      nodes: [node('a', 'g1')],
      groups: [{ id: 'g1' }],
    }))
    const many = await gridPlacement().place(request({
      nodes: [node('a', 'g1'), node('b', 'g1'), node('c', 'g1'), node('d', 'g1')],
      groups: [{ id: 'g1' }],
    }))
    expect(many.groups.get('g1')!.width).toBeGreaterThan(one.groups.get('g1')!.width)
    expect(many.groups.get('g1')!.height).toBeGreaterThan(one.groups.get('g1')!.height)
  })

  it('keeps a group clear of the room its own heading needs', async () => {
    const placed = await gridPlacement().place(request({
      nodes: [node('a', 'g1')],
      groups: [{ id: 'g1', inset: { width: 0, height: 40 } }],
    }))
    const group = placed.groups.get('g1')!
    expect(placed.nodes.get('a')!.y).toBeGreaterThanOrEqual(group.y + 40)
  })

  it('leaves a group nobody filed undrawn rather than empty', async () => {
    const placed = await gridPlacement().place(request({ groups: [{ id: 'g1' }] }))
    expect(placed.groups.has('g1')).toBe(false)
  })

  it('places what belongs to no group, and what names one that is not there', async () => {
    const placed = await gridPlacement().place(request({
      nodes: [node('loose'), node('orphan', 'gone')],
    }))
    expect(placed.nodes.has('loose')).toBe(true)
    expect(placed.nodes.has('orphan')).toBe(true)
  })

  it('lines up a row on the tallest thing in it, so rows do not collide', async () => {
    const placed = await gridPlacement().place(request({
      nodes: [node('short', 'g1', 60), node('tall', 'g1', 200), node('c', 'g1'), node('d', 'g1')],
      groups: [{ id: 'g1' }],
    }))
    expect(placed.nodes.get('d')!.y).toBeGreaterThanOrEqual(placed.nodes.get('tall')!.y + 200)
  })

  it('wraps groups onto another row instead of running off to the side', async () => {
    const many = Array.from({ length: 8 }, (_unused, index) => `g${index}`)
    const placed = await gridPlacement().place(request({
      nodes: many.flatMap(id => [0, 1, 2].map(seat => node(`${id}-${seat}`, id))),
      groups: many.map(id => ({ id })),
    }))
    const boxes = [...placed.groups.values()]
    expect(new Set(boxes.map(box => box.y)).size).toBeGreaterThan(1)
    expectNoOverlap(boxes)
  })

  it('answers the same way every time it is asked', async () => {
    const asked = request({ nodes: [node('a', 'g1'), node('b')], groups: [{ id: 'g1' }] })
    const once = await gridPlacement().place(asked)
    const again = await gridPlacement().place(asked)
    expect([...again.nodes]).toEqual([...once.nodes])
  })
})

function expectNoOverlap(boxes: readonly Box[]): void {
  for (const box of boxes) {
    const others = boxes.filter(candidate => candidate !== box)
    expect(others.some(other => boxesOverlap(box, other))).toBe(false)
  }
}
