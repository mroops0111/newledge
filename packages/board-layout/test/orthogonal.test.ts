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
