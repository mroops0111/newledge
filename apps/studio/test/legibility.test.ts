import type { Point } from '@newledge/board-layout'
import { describe, expect, it } from 'vitest'
import { worthFollowing } from '../src/lib/legibility.js'

/** Out, across, and in, which is two turns. */
const TURNED_TWICE: Point[] = [
  { x: 0, y: 0 },
  { x: 40, y: 0 },
  { x: 40, y: 40 },
  { x: 80, y: 40 },
]

const TURNED_THREE_TIMES: Point[] = [...TURNED_TWICE, { x: 80, y: 80 }]

const TURNED_FOUR_TIMES: Point[] = [...TURNED_THREE_TIMES, { x: 120, y: 80 }]

describe('whether a reader could follow a line', () => {
  // A board has to draw something before it can find out what it costs.
  it('takes a route nobody has worked out yet on trust', () => {
    expect(worthFollowing(undefined, false)).toBe(true)
    expect(worthFollowing([{ x: 0, y: 0 }], false)).toBe(true)
  })

  it('follows a line that goes out, across, and in', () => {
    expect(worthFollowing(TURNED_TWICE, false)).toBe(true)
  })

  it('gives up on one that doubled back somewhere', () => {
    expect(worthFollowing(TURNED_FOUR_TIMES, false)).toBe(false)
  })

  it('gives up on one too long to be followed however straight it is', () => {
    expect(worthFollowing([{ x: 0, y: 0 }, { x: 4000, y: 0 }], false)).toBe(false)
  })

  it('gives up on one that wandered far past the run between its ends', () => {
    const wandering: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 500 },
      { x: 20, y: 500 },
      { x: 20, y: 0 },
    ]
    expect(worthFollowing(wandering, false)).toBe(false)
  })

  // Notes make a card taller, which moves the routes past it,
  // which changes what can be drawn.
  // Two thresholds keep that from chasing itself for ever.
  it('holds on to a line already drawn that a redraw made slightly worse', () => {
    expect(worthFollowing(TURNED_THREE_TIMES, false)).toBe(false)
    expect(worthFollowing(TURNED_THREE_TIMES, true)).toBe(true)
  })
})
