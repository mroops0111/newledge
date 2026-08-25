import { describe, expect, it } from 'vitest'
import type { Point } from '@newledge/board-layout'
import { borderRun, curvePath, facing } from '../src/lib/path.js'

/** The two handles of the drawn cubic, saying which way it leaves each end. */
function handles(path: string): [Point, Point] {
  const drawn = /C ([-\d.]+),([-\d.]+) ([-\d.]+),([-\d.]+)/.exec(path)!
  return [
    { x: Number(drawn[1]), y: Number(drawn[2]) },
    { x: Number(drawn[3]), y: Number(drawn[4]) },
  ]
}

describe('the S an association is drawn as', () => {
  it('leaves and arrives square on to the borders it crosses', () => {
    const from = { x: 0, y: 0 }
    const to = { x: 400, y: 200 }
    const [out, into] = handles(curvePath(from, to, 'x', 'x'))
    expect(out.y).toBe(from.y)
    expect(into.y).toBe(to.y)
    expect(out.x).toBeGreaterThan(from.x)
    expect(into.x).toBeLessThan(to.x)
  })

  it('turns in the middle rather than doubling back on itself', () => {
    const [out, into] = handles(curvePath({ x: 0, y: 0 }, { x: 400, y: 200 }, 'x', 'x'))
    expect(out.x).toBeLessThanOrEqual(into.x)
  })

  it('runs the other way when the ends face up and down', () => {
    const [out, into] = handles(curvePath({ x: 0, y: 0 }, { x: 200, y: 400 }, 'y', 'y'))
    expect(out.x).toBe(0)
    expect(into.x).toBe(200)
    expect(out.y).toBeGreaterThan(0)
    expect(into.y).toBeLessThan(400)
  })

  it('takes the way from the longer side of the run when it is not told', () => {
    expect(handles(curvePath({ x: 0, y: 0 }, { x: 400, y: 20 }))[0]!.y).toBe(0)
    expect(handles(curvePath({ x: 0, y: 0 }, { x: 20, y: 400 }))[0]!.x).toBe(0)
  })

  it('still reaches out when the run is too short for a share of it to show', () => {
    expect(handles(curvePath({ x: 0, y: 0 }, { x: 10, y: 0 }, 'x', 'x'))[0]!.x).toBe(30)
  })

  it('stops reaching, so a run across the board cannot swing past its own end', () => {
    expect(handles(curvePath({ x: 0, y: 0 }, { x: 2000, y: 400 }, 'x', 'x'))[0]!.x).toBe(220)
  })

  it('crosses the straight run at the middle, however far it reaches', () => {
    // Which is why the reach can be generous.
    // A curve bulging one way and then the other stays near its own chord,
    // rather than leaving the ground a router cleared along it.
    const [out, into] = handles(curvePath({ x: 0, y: 0 }, { x: 400, y: 200 }, 'x', 'x'))
    expect((out.x + into.x) / 2).toBeCloseTo(200)
    expect((out.y + into.y) / 2).toBeCloseTo(100)
  })

  it('draws something rather than nothing when both ends are the same point', () => {
    expect(curvePath({ x: 10, y: 10 }, { x: 10, y: 10 }))
      .toBe('M 10,10 C 40,10 -20,10 10,10')
  })

  it('reads which way to leave off the border the end sits on', () => {
    const card = { x: 0, y: 0, width: 400, height: 100 }
    expect(facing(card, { x: 400, y: 50 })).toBe('x')
    expect(facing(card, { x: 200, y: 100 })).toBe('y')
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
