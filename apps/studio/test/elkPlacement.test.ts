import type { Placed, PlacementRequest } from '@newledge/board-layout'
import type { ElkNode } from 'elkjs/lib/elk-api.js'
import { describe, expect, it } from 'vitest'
import { elkPlacement } from '../src/lib/elkPlacement.js'

function asked(): { sent: ElkNode[], place: (request: PlacementRequest) => Promise<Placed> } {
  const sent: ElkNode[] = []
  const placement = elkPlacement(async () => ({
    layout: async (graph: ElkNode) => {
      sent.push(graph)
      return laid(graph)
    },
  }))
  return { sent, place: request => placement.place(request) }
}

/** Stand in for what ELK does, which is to fill in coordinates and sections. */
function laid(graph: ElkNode): ElkNode {
  return {
    ...graph,
    children: (graph.children ?? []).map((child, index) => ({
      ...child,
      x: index * 500,
      y: 0,
      width: child.children === undefined ? child.width : 400,
      height: child.children === undefined ? child.height : 300,
      children: (child.children ?? []).map((held, seat) => ({ ...held, x: 20, y: seat * 140 })),
      edges: (child.edges ?? []).map(one => ({
        ...one,
        sections: [{ id: `${one.id}-s`, startPoint: { x: 1, y: 2 }, endPoint: { x: 3, y: 4 } }],
      })),
    })),
    edges: (graph.edges ?? []).map(one => ({
      ...one,
      sections: [{
        id: `${one.id}-s`,
        startPoint: { x: 0, y: 0 },
        bendPoints: [{ x: 50, y: 0 }],
        endPoint: { x: 50, y: 90 },
      }],
    })),
  }
}

const request: PlacementRequest = {
  nodes: [
    { id: 'rag', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
    { id: 'faster', type: 'Claim', width: 240, height: 80, groupId: 'g1' },
    { id: 'loose', type: 'Concept', width: 240, height: 100 },
  ],
  edges: [
    { id: 'e1', type: 'uses', from: 'rag', to: 'loose' },
    { id: 'e2', type: 'introduces', from: 'faster', to: 'rag' },
  ],
  groups: [{ id: 'g1' }, { id: 'empty' }],
}

describe('handing a board to the layout kernel', () => {
  it('asks for lines that bend around cards rather than through them', async () => {
    const { sent, place } = asked()
    await place(request)
    expect(sent[0]?.layoutOptions?.['elk.edgeRouting']).toBe('ORTHOGONAL')
  })

  it('lays each section out on its own, so two never come back overlapping', async () => {
    const { sent, place } = asked()
    await place(request)
    expect(sent[0]?.layoutOptions?.['elk.hierarchyHandling']).toBe('SEPARATE_CHILDREN')
  })

  it('sends only the relations that are meant to decide where things go', async () => {
    const { sent, place } = asked()
    await place(request)
    expect(sent[0]?.edges?.map(one => one.id)).toEqual(['e1'])
  })

  it('hands kinds over in band order, which is what keeps kinds together', async () => {
    const { sent, place } = asked()
    await place({
      ...request,
      nodes: [
        { id: 'paper', type: 'Source', width: 240, height: 60, groupId: 'g1' },
        { id: 'faster', type: 'Claim', width: 240, height: 80, groupId: 'g1' },
        { id: 'rag', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
      ],
    })
    const held = sent[0]?.children?.find(child => child.id === 'g1')?.children ?? []
    expect(held.map(one => one.id)).toEqual(['rag', 'faster', 'paper'])
  })

  it('gives a section its own options, since it lays itself out', async () => {
    const { sent, place } = asked()
    await place(request)
    const section = sent[0]?.children?.find(child => child.id === 'g1')
    expect(section?.layoutOptions?.['elk.direction']).toBe('DOWN')
    expect(section?.layoutOptions?.['elk.edgeRouting']).toBe('ORTHOGONAL')
  })

  it('leaves out a section nobody filed anything under', async () => {
    const { sent, place } = asked()
    await place(request)
    expect(sent[0]?.children?.some(child => child.id === 'empty')).toBe(false)
  })

  it('carries a card in a section out to where the board sees it', async () => {
    const placed = await asked().place(request)
    const group = placed.groups.get('g1')!
    const rag = placed.nodes.get('rag')!
    expect(rag).toEqual({ x: group.x + 20, y: group.y })
  })

  it('reads back where each line starts, bends, and ends', async () => {
    const placed = await asked().place(request)
    expect(placed.edges?.get('e1')).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 90 }])
  })

  it('hands a relation to whichever container can see both of its ends', async () => {
    const { sent, place } = asked()
    await place({
      ...request,
      edges: [
        { id: 'inside', type: 'uses', from: 'rag', to: 'faster' },
        { id: 'across', type: 'uses', from: 'rag', to: 'loose' },
      ],
    })
    const section = sent[0]?.children?.find(child => child.id === 'g1')
    expect(section?.edges?.map(one => one.id)).toEqual(['inside'])
    expect(sent[0]?.edges?.map(one => one.id)).toEqual(['across'])
  })

  it('carries a line drawn inside a section out to where the board sees it', async () => {
    const placed = await asked().place({
      ...request,
      edges: [{ id: 'inside', type: 'uses', from: 'rag', to: 'faster' }],
    })
    const group = placed.groups.get('g1')!
    expect(placed.edges?.get('inside')).toEqual([
      { x: group.x + 1, y: group.y + 2 },
      { x: group.x + 3, y: group.y + 4 },
    ])
  })
})
