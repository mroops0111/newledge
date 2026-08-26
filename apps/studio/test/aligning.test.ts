import { describe, expect, it } from 'vitest'
import type { Box } from '@newledge/board-layout'
import { align, TOLERANCE } from '../src/lib/aligning.js'

function box(x: number, y: number, width = 200, height = 100): Box {
  return { x, y, width, height }
}

const settled = [box(0, 0), box(400, 300)]

describe('lining one thing up with another', () => {
  it('leaves what is nowhere near anything exactly where it was dropped', () => {
    const loose = box(1000, 1000)
    const lined = align(loose, settled)
    expect(lined.at).toEqual({ x: 1000, y: 1000 })
    expect(lined.guides).toEqual([])
  })

  it('pulls a near miss onto the edge it nearly matched', () => {
    const lined = align(box(4, 500), settled)
    expect(lined.at.x).toBe(0)
  })

  it('leaves a miss wider than the tolerance alone', () => {
    const lined = align(box(TOLERANCE + 1, 500), settled)
    expect(lined.at.x).toBe(TOLERANCE + 1)
  })

  // Lining two cards up by their middles is as deliberate as by an edge,
  // and a grid can express neither.
  it('lines middles up, not only edges', () => {
    const lined = align(box(45, 500, 100, 100), [box(0, 0, 200, 100)])
    expect(lined.at.x).toBe(50)
  })

  it('lines a right edge up with a left edge, since they are the same line', () => {
    const lined = align(box(197, 500), [box(0, 0)])
    expect(lined.at.x).toBe(200)
  })

  it('lines up on both axes at once when both are near', () => {
    const lined = align(box(3, 4), settled)
    expect(lined.at).toEqual({ x: 0, y: 0 })
    expect(lined.guides).toHaveLength(2)
  })

  it('takes the nearest line when several are within reach', () => {
    const lined = align(box(5, 500), [box(0, 0), box(6, 0)])
    expect(lined.at.x).toBe(6)
  })

  it('shows a line down the axis it lined up on', () => {
    const [guide] = align(box(4, 500), settled).guides
    expect(guide?.axis).toBe('x')
    expect(guide?.at).toBe(0)
  })

  // A guide has to reach between the two things it is about,
  // or it says nothing about which of them was lined up with.
  it('runs the line between the two things it is about', () => {
    const [guide] = align(box(4, 500), [box(0, 0)]).guides
    expect(guide?.from).toBe(0)
    expect(guide?.to).toBe(600)
  })

  it('has nothing to line up with on an empty board', () => {
    const lined = align(box(4, 4), [])
    expect(lined.at).toEqual({ x: 4, y: 4 })
    expect(lined.guides).toEqual([])
  })
})

describe('continuing a rhythm two others have set', () => {
  // Even spacing is something a reader arranges for deliberately,
  // and no edge or middle can express it, so it has to be offered on its own.
  const spaced = [box(0, 0), box(300, 0)]

  it('pulls a third onto the gap the first two already set', () => {
    const lined = align(box(596, 0), spaced)
    expect(lined.at.x).toBe(600)
  })

  it('offers the same rhythm on the other side of them', () => {
    const lined = align(box(-304, 0), spaced)
    expect(lined.at.x).toBe(-300)
  })

  it('says it is a gap it matched, not an edge two things share', () => {
    expect(align(box(596, 0), spaced).guides[0]?.kind).toBe('gap')
  })

  it('prefers an edge it can share to a rhythm it can continue', () => {
    const lined = align(box(598, 4), [...spaced, box(600, 0)])
    expect(lined.guides.some(one => one.kind === 'edge')).toBe(true)
  })

  it('leaves a drop nowhere near a rhythm alone', () => {
    expect(align(box(900, 0), spaced).at.x).toBe(900)
  })
})
