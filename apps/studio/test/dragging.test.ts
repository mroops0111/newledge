import type { Section } from '@newledge/board'
import type { Box } from '@newledge/board-layout'
import { describe, expect, it } from 'vitest'
import { TOLERANCE } from '../src/lib/aligning.js'
import { landing, standingOn } from '../src/lib/dragging.js'

const CARD = { width: 240, height: 100 }

function boxes(entries: Record<string, Box>): Map<string, Box> {
  return new Map(Object.entries(entries))
}

function section(over: Partial<Section> = {}): Section {
  return { id: 'topic-retrieval', name: 'Retrieval', x: 0, y: 0, width: 600, height: 400, ...over }
}

describe('where a drag lands', () => {
  const settled = boxes({ settled: { x: 100, y: 400, ...CARD } })

  it('pulls onto a line another card already sits on', () => {
    const lands = landing(
      { id: 'moving', at: { x: 104, y: 20 }, extent: CARD },
      settled,
      [],
      undefined,
      TOLERANCE,
    )
    expect(lands.at.x).toBe(100)
    expect(lands.guides.some(guide => guide.axis === 'x')).toBe(true)
  })

  it('leaves a drag alone when nothing is near enough to mean anything', () => {
    const lands = landing(
      { id: 'moving', at: { x: 900, y: 900 }, extent: CARD },
      settled,
      [],
      undefined,
      TOLERANCE,
    )
    expect(lands.at).toEqual({ x: 900, y: 900 })
    expect(lands.guides).toEqual([])
  })

  it('never lines a thing up with itself', () => {
    const lands = landing(
      { id: 'settled', at: { x: 104, y: 400 }, extent: CARD },
      settled,
      [],
      undefined,
      TOLERANCE,
    )
    expect(lands.at.x).toBe(104)
  })
})

describe('a section carrying what stands on it', () => {
  const held = boxes({
    inside: { x: 40, y: 40, ...CARD },
    outside: { x: 900, y: 900, ...CARD },
  })

  it('takes only what was standing on it when it was taken hold of', () => {
    expect([...standingOn(section(), held)]).toEqual(['inside'])
  })

  it('shifts what it carries by exactly as far as it moved', () => {
    const lands = landing(
      { id: 'topic-retrieval', at: { x: 300, y: 500 }, extent: { width: 600, height: 400 } },
      held,
      [],
      { id: 'topic-retrieval', at: { x: 0, y: 0 }, held: new Set(['inside']) },
      TOLERANCE,
    )
    expect(lands.carried).toEqual([{ id: 'inside', at: { x: 340, y: 540 } }])
  })

  it('carries nothing when what is moving is not the section being dragged', () => {
    const lands = landing(
      { id: 'inside', at: { x: 300, y: 500 }, extent: CARD },
      held,
      [],
      { id: 'topic-retrieval', at: { x: 0, y: 0 }, held: new Set(['inside']) },
      TOLERANCE,
    )
    expect(lands.carried).toEqual([])
  })

  it('drops a card that has left the board rather than carrying it nowhere', () => {
    const lands = landing(
      { id: 'topic-retrieval', at: { x: 300, y: 500 }, extent: { width: 600, height: 400 } },
      held,
      [],
      { id: 'topic-retrieval', at: { x: 0, y: 0 }, held: new Set(['inside', 'gone']) },
      TOLERANCE,
    )
    expect(lands.carried.map(one => one.id)).toEqual(['inside'])
  })
})
