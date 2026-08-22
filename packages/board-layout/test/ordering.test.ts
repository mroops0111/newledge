import { describe, expect, it } from 'vitest'
import { orderedByPull } from '../src/ordering.js'
import type { Box, LayoutEdge } from '../src/ports.js'

function at(x: number): Box {
  return { x, y: 0, width: 100, height: 100 }
}

function link(from: string, to: string): LayoutEdge {
  return { id: `${from}-${to}`, type: 'uses', from, to }
}

const siblings = ['a', 'b', 'c']
const placed = new Map<string, Box>([
  ['a', at(0)],
  ['b', at(200)],
  ['c', at(400)],
  ['far', at(2000)],
  ['near', at(-2000)],
])

describe('ordering things whose order carries no meaning', () => {
  // Which sibling is drawn leftmost says nothing about it, so the order is
  // free, and spending it on shortening what leaves the family costs nothing.
  it('puts a sibling nearest what pulls on it', () => {
    const ordered = orderedByPull(siblings, [link('a', 'far')], placed)
    expect(ordered[ordered.length - 1]).toBe('a')
  })

  it('orders several by where each of them is pulled', () => {
    const ordered = orderedByPull(siblings, [link('a', 'far'), link('c', 'near')], placed)
    expect(ordered).toEqual(['c', 'b', 'a'])
  })

  it('averages when a sibling is pulled from more than one side', () => {
    const ordered = orderedByPull(siblings, [
      link('a', 'far'),
      link('a', 'near'),
      link('b', 'far'),
    ], placed)
    expect(ordered.indexOf('a')).toBeLessThan(ordered.indexOf('b'))
  })

  it('leaves what nothing pulls on in the order it arrived in', () => {
    expect(orderedByPull(siblings, [], placed)).toEqual(siblings)
  })

  // A sibling is being ordered by this same pass, so it has no position yet to
  // pull anything towards.
  it('is not pulled by its own siblings', () => {
    expect(orderedByPull(siblings, [link('a', 'c'), link('c', 'a')], placed)).toEqual(siblings)
  })

  it('ignores a pull towards something that is not on the board', () => {
    expect(orderedByPull(siblings, [link('a', 'gone')], placed)).toEqual(siblings)
  })

  it('gives the same order every time it is asked', () => {
    const edges = [link('a', 'far'), link('b', 'near')]
    expect(orderedByPull(siblings, edges, placed)).toEqual(orderedByPull(siblings, edges, placed))
  })
})
