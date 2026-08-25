import type { Box, Point } from '@newledge/board-layout'
import { describe, expect, it } from 'vitest'
import { IDLE } from '../src/lib/attention.js'
import { edgeStyle } from '../src/lib/boardStyle.js'
import type { DrawnEdge } from '../src/lib/drawing.js'
import type { EdgeSurroundings } from '../src/ui/boardEdges.js'
import { boardEdges, heldAt } from '../src/ui/boardEdges.js'

const CARDS: Record<string, Box> = {
  parent: { x: 0, y: 0, width: 240, height: 100 },
  child: { x: 0, y: 300, width: 240, height: 100 },
}

function around(over: Partial<EdgeSurroundings> = {}): EdgeSurroundings {
  return {
    boxes: new Map(Object.entries(CARDS)),
    grounds: [],
    trunks: new Map(),
    routes: new Map(),
    familyLed: new Map(),
    nearby: new Set(),
    attention: IDLE,
    ...over,
  }
}

function line(type: string, over: Partial<DrawnEdge> = {}): DrawnEdge {
  return { id: `e-${type}`, source: 'child', target: 'parent', style: edgeStyle(type), ...over }
}

describe('handing the relations to the canvas', () => {
  it('follows the route the board worked out to go round what is in between', () => {
    const route: Point[] = [{ x: 120, y: 300 }, { x: 400, y: 300 }, { x: 400, y: 100 }]
    const [edge] = boardEdges([line('uses')], around({ routes: new Map([['e-uses', route]]) }))
    expect(edge!.data!.points).toEqual(route)
  })

  // A hierarchy is drawn from where its cards are now, so it survives a move.
  it('prefers a trunk to a route, since the trunk is worked out from the cards', () => {
    const trunk: Point[] = [{ x: 120, y: 300 }, { x: 120, y: 100 }]
    const [edge] = boardEdges([line('contains')], around({
      trunks: new Map([['e-contains', trunk]]),
      routes: new Map([['e-contains', [{ x: 0, y: 0 }, { x: 1, y: 1 }]]]),
    }))
    expect(edge!.data!.points).toEqual(trunk)
  })

  it('runs border to border when nothing worked a route out', () => {
    const [edge] = boardEdges([line('uses')], around())
    expect(edge!.data!.points).toEqual([{ x: 120, y: 300 }, { x: 120, y: 100 }])
  })

  it('says which border each end leaves by, so a curve leaves square on to it', () => {
    const [edge] = boardEdges([line('relatesTo')], around())
    expect(edge!.data!.leaves).toBe('y')
    expect(edge!.data!.arrives).toBe('y')
  })

  it('draws nothing between two ends it cannot find', () => {
    const [edge] = boardEdges([line('uses', { source: 'gone', target: 'missing' })], around())
    expect(edge!.data!.points).toBeUndefined()
  })

  it('ends a relation on the ground standing for a topic', () => {
    const ground = { id: 'topic-retrieval', x: 600, y: 0, width: 400, height: 300 }
    const [edge] = boardEdges(
      [line('belongsTo', { source: 'child', target: 'topic-retrieval' })],
      around({ grounds: [ground] }),
    )
    expect(edge!.data!.points).toBeDefined()
  })

  // A hierarchy wears its family's colour, everything else its own kind's.
  it('colours a hierarchy by the family its root leads', () => {
    const [edge] = boardEdges(
      [line('contains')],
      around({ familyLed: new Map([['parent', 'kin-2']]) }),
    )
    const [plain] = boardEdges([line('uses')], around({ familyLed: new Map([['parent', 'kin-2']]) }))
    expect(edge!.style!.stroke).not.toEqual(plain!.style!.stroke)
  })

  it('stands a relation back while a reader is looking at something else', () => {
    const [edge] = boardEdges([line('uses')], around({
      attention: { selectedId: 'elsewhere', focused: false },
    }))
    expect(edge!.style!.opacity).toBeLessThan(1)
  })

  it('leaves a relation out entirely once a reader asks to focus', () => {
    expect(boardEdges([line('uses')], around({
      attention: { selectedId: 'elsewhere', focused: true },
    }))).toEqual([])
  })
})

describe('heldAt', () => {
  it('grows a line so the board cannot thin it away', () => {
    expect(heldAt({ strokeWidth: 2.25 }, 2.6).strokeWidth).toBeCloseTo(5.85)
  })

  it('grows the dashes with it, so a broken line still reads as broken', () => {
    expect(heldAt({ strokeWidth: 2.25, strokeDasharray: '6 4' }, 2).strokeDasharray)
      .toEqual('12 8')
  })

  it('leaves a line alone when the board is not asking it to grow', () => {
    expect(heldAt({ strokeWidth: 2.25, strokeDasharray: '6 4' }, 1))
      .toEqual({ strokeWidth: 2.25, strokeDasharray: '6 4' })
  })

  it('keeps everything else the line was drawn with', () => {
    expect(heldAt({ strokeWidth: 1, stroke: 'red', opacity: 0.22 }, 2).opacity).toEqual(0.22)
  })
})
