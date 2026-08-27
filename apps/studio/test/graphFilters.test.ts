import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode, Ontology } from '../src/lib/graph.js'
import { switchesFor } from '../src/ui/GraphFilters.js'

const ontology: Ontology = {
  nodeTypes: [{ id: 'Claim' }, { id: 'Concept' }, { id: 'Source' }, { id: 'Topic' }],
  edgeTypes: [{ id: 'contains' }, { id: 'contradicts' }],
}

const graph = {
  nodes: [
    { id: 'a', type: 'Concept', name: 'a' },
    { id: 'b', type: 'Concept', name: 'b' },
    { id: 'c', type: 'Claim', name: 'c' },
  ] as readonly GraphNode[],
  edges: [{ id: 'e', type: 'contains', fromNodeId: 'a', toNodeId: 'b' }] as readonly GraphEdge[],
}

const colourOf = (typeId: string): string => `colour-${typeId}`

describe('switchesFor', () => {
  it('stands the ground first, and then the bands a section is read down', () => {
    const { kinds } = switchesFor(ontology, graph, colourOf)
    expect(kinds.map(kind => kind.id)).toEqual(['Topic', 'Concept', 'Claim', 'Source'])
  })

  it('counts over the whole graph, so a switch says what turning it on brings', () => {
    const { kinds, relations } = switchesFor(ontology, graph, colourOf)
    expect(kinds.find(kind => kind.id === 'Concept')?.count).toBe(2)
    expect(kinds.find(kind => kind.id === 'Source')?.count).toBe(0)
    expect(relations.find(one => one.id === 'contains')?.count).toBe(1)
    expect(relations.find(one => one.id === 'contradicts')?.count).toBe(0)
  })

  it('gives a kind its colour and a relation its line', () => {
    const { kinds, relations } = switchesFor(ontology, graph, colourOf)
    expect(kinds[0]?.legend).toEqual({ as: 'colour', colour: 'colour-Topic' })
    expect(relations[0]?.legend.as).toBe('line')
  })
})
