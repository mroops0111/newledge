import { describe, expect, it } from 'vitest'
import type { Point } from '../src/lib/path.js'
import { borderRun, curvePath } from '../src/lib/path.js'

/** How far the drawn curve leaves the straight line between its two ends. */
function sagitta(from: Point, to: Point): number {
  const drawn = /Q ([-\d.]+),([-\d.]+)/.exec(curvePath(from, to))!
  const control = { x: Number(drawn[1]), y: Number(drawn[2]) }
  // Halfway along a quadratic sits halfway between the chord and the control.
  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  return Math.hypot(control.x - middle.x, control.y - middle.y) / 2
}

describe('the arc an association is drawn as', () => {
  it('bows gently between two cards standing side by side', () => {
    const bow = sagitta({ x: 0, y: 0 }, { x: 80, y: 0 })
    expect(bow).toBeGreaterThan(2)
    expect(bow).toBeLessThan(6)
  })

  it('stops growing, so a run across the board is all but straight', () => {
    const bow = sagitta({ x: 0, y: 0 }, { x: 1600, y: 0 })
    expect(bow).toBeLessThanOrEqual(24)
  })

  it('bows the same amount whichever way the run points', () => {
    expect(sagitta({ x: 0, y: 0 }, { x: 1600, y: 0 }))
      .toBeCloseTo(sagitta({ x: 0, y: 0 }, { x: 0, y: 1600 }))
  })

  it('draws something rather than nothing when both ends are the same point', () => {
    expect(curvePath({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe('M 10,10 Q 10,10 10,10')
  })

  it('anchors a run on the borders it crosses, not on the two centres', () => {
    const [start, end] = borderRun(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 300, y: 0, width: 100, height: 100 },
    )
    expect(start).toEqual({ x: 100, y: 50 })
    expect(end).toEqual({ x: 300, y: 50 })
  })
})
