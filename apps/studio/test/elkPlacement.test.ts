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

  // An edge in a layered layout does not merely pull its two ends together,
  // it says which of them goes above the other,
  // and only a hierarchy has an answer. Handed every relation instead,
  // the board grew by a quarter both ways and drew fewer relations than before,
  // because everything it had spread apart was then too far apart to follow.
  it('shapes the board by a hierarchy and by nothing else', async () => {
    const { sent, place } = asked()
    await place({
      ...request,
      edges: [
        { id: 'held', type: 'contains', from: 'rag', to: 'faster' },
        { id: 'about', type: 'concerns', from: 'faster', to: 'rag' },
        { id: 'used', type: 'uses', from: 'rag', to: 'loose' },
      ],
    })
    const held = sent[0]?.children?.find(child => child.id === 'g1')
    const all = [...(held?.edges ?? []), ...(sent[0]?.edges ?? [])].map(one => one.id)
    expect(all).toEqual(['held'])
  })

  it('sends nothing for a relation whose other end was never placed', async () => {
    const { sent, place } = asked()
    await place({
      ...request,
      edges: [...request.edges, { id: 'away', type: 'uses', from: 'rag', to: 'elsewhere' }],
    })
    const held = sent[0]?.children?.find(child => child.id === 'g1')
    const all = [...(held?.edges ?? []), ...(sent[0]?.edges ?? [])]
    expect(all.some(one => one.id.includes('away'))).toBe(false)
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

  // A layered layout has nothing to go on in a section with few relations,
  // and spreads the cards out to fill layers rather than sitting them together,
  // which is what made a small board look empty.
  it('sits a sparse section together instead of laying it out in layers', async () => {
    const { sent, place } = asked()
    await place({
      nodes: [
        { id: 'a', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'b', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'c', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'd', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
      ],
      edges: [{ id: 'e1', type: 'uses', from: 'a', to: 'b' }],
      groups: [{ id: 'g1' }],
    })
    expect(sent[0]?.children?.[0]?.layoutOptions?.['elk.algorithm']).toBe('rectpacking')
  })

  it('lays a section out in layers once its relations carry enough structure', async () => {
    const { sent, place } = asked()
    await place({
      nodes: [
        { id: 'a', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'b', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'c', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
      ],
      edges: [
        { id: 'e1', type: 'contains', from: 'a', to: 'b' },
        { id: 'e2', type: 'contains', from: 'b', to: 'c' },
      ],
      groups: [{ id: 'g1' }],
    })
    expect(sent[0]?.children?.[0]?.layoutOptions?.['elk.algorithm']).toBe('layered')
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

  it('hands a relation to whichever container can see both of its ends', async () => {
    const { sent, place } = asked()
    await place({
      ...request,
      edges: [
        { id: 'inside', type: 'contains', from: 'rag', to: 'faster' },
        { id: 'across', type: 'contains', from: 'rag', to: 'loose' },
      ],
    })
    const section = sent[0]?.children?.find(child => child.id === 'g1')
    expect(section?.edges?.map(one => one.id)).toEqual(['inside'])
    expect(sent[0]?.edges?.[0]?.sources).toEqual(['g1'])
  })
})

describe('keeping grounds that are related together', () => {
  // A group is opaque to the board,
  // so an edge into a card inside one places nothing. Merged onto the groups,
  // it asks the board to keep them near.
  it('lays a relation that crosses groups out between the groups themselves', async () => {
    const { sent, place } = asked()
    await place({
      nodes: [
        { id: 'a', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'b', type: 'Concept', width: 240, height: 100, groupId: 'empty' },
      ],
      edges: [{ id: 'e1', type: 'contains', from: 'a', to: 'b' }],
      groups: [{ id: 'g1' }, { id: 'empty' }],
    })
    expect(sent[0]?.edges?.map(one => [one.sources[0], one.targets[0]]))
      .toEqual([['empty', 'g1']])
  })

  it('asks harder the more relations run between the same two grounds', async () => {
    const { sent, place } = asked()
    await place({
      nodes: [
        { id: 'a', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'b', type: 'Concept', width: 240, height: 100, groupId: 'g1' },
        { id: 'c', type: 'Concept', width: 240, height: 100, groupId: 'empty' },
      ],
      edges: [
        { id: 'e1', type: 'contains', from: 'a', to: 'c' },
        { id: 'e2', type: 'contains', from: 'b', to: 'c' },
      ],
      groups: [{ id: 'g1' }, { id: 'empty' }],
    })
    expect(sent[0]?.edges?.[0]?.layoutOptions?.['elk.layered.priority.shortness']).toBe('2')
  })
})

describe('which container lays out a relation', () => {
  // A group inside a group means two ends can share a container,
  // without the board seeing either of them,
  // and a layout handed an edge between a group and the group holding it,
  // refuses to run at all.
  const nested: PlacementRequest = {
    nodes: [
      { id: 'whole', type: 'Concept', width: 240, height: 100, groupId: 'brood' },
      { id: 'part', type: 'Concept', width: 240, height: 100, groupId: 'brood' },
      { id: 'beside', type: 'Concept', width: 240, height: 100, groupId: 'section' },
    ],
    edges: [
      { id: 'inside', type: 'contains', from: 'whole', to: 'part' },
      { id: 'across', type: 'extends', from: 'part', to: 'beside' },
    ],
    groups: [{ id: 'brood', groupId: 'section' }, { id: 'section' }],
  }

  function laidBy(sent: ElkNode[], id: string): string[] {
    const walk = (node: ElkNode): string[] => [
      ...(node.edges ?? []).map(edge => `${node.id}:${edge.id}`),
      ...(node.children ?? []).flatMap(walk),
    ]
    return walk(sent[0]!).filter(one => one.includes(id))
  }

  it('gives a relation inside one group to that group', async () => {
    const { sent, place } = asked()
    await place(nested)
    expect(laidBy(sent, 'inside')).toEqual(['brood:inside'])
  })

  // Merged rather than kept whole, since the group is opaque from outside,
  // and an edge into a card it hides places nothing.
  it('gives one that leaves a nested group to the group holding both', async () => {
    const { sent, place } = asked()
    await place(nested)
    const section = sent[0]!.children!.find(child => child.id === 'section')!
    expect((section.edges ?? []).map(edge => [edge.sources?.[0], edge.targets?.[0]]))
      .toEqual([['beside', 'brood']])
  })

  it('never asks a container to lay out an edge reaching into itself', async () => {
    const { sent, place } = asked()
    await place(nested)
    const ends = (sent[0]!.children ?? []).flatMap(child =>
      (child.edges ?? []).flatMap(edge => [...(edge.sources ?? []), ...(edge.targets ?? [])]))
    expect(ends).not.toContain('section')
  })
})

describe('a group that holds nothing of its own', () => {
  // Skipped for having no cards directly in it,
  // the board keeps an edge reaching a shape it never sent,
  // and the layout refuses the graph outright.
  const emptied: PlacementRequest = {
    nodes: [
      { id: 'whole', type: 'Concept', width: 240, height: 100, groupId: 'brood' },
      { id: 'part', type: 'Concept', width: 240, height: 100, groupId: 'brood' },
      { id: 'away', type: 'Concept', width: 240, height: 100, groupId: 'other' },
    ],
    edges: [
      { id: 'held', type: 'contains', from: 'whole', to: 'part' },
      { id: 'across', type: 'contains', from: 'part', to: 'away' },
    ],
    groups: [{ id: 'brood', groupId: 'section' }, { id: 'section' }, { id: 'other' }],
  }

  it('is still sent, so an edge reaching it has something to reach', async () => {
    const { sent, place } = asked()
    await place(emptied)
    expect((sent[0]?.children ?? []).map(child => child.id)).toContain('section')
  })

  it('carries the group inside it as its own child', async () => {
    const { sent, place } = asked()
    await place(emptied)
    const section = sent[0]!.children!.find(child => child.id === 'section')!
    expect((section.children ?? []).map(child => child.id)).toEqual(['brood'])
  })
})
