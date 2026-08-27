import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode } from '../src/lib/graph.js'
import { inside } from '../src/lib/inside.js'

function node(id: string, type: string, uris: readonly string[] = []): GraphNode {
  return uris.length === 0
    ? { id, type, name: id }
    : { id, type, name: id, metadata: { sourceReferences: uris.map(uri => ({ location: { uri } })) } }
}

function edge(id: string, type: string, from: string, to: string): GraphEdge {
  return { id, type, fromNodeId: from, toNodeId: to }
}

const rag = node('rag', 'Concept', ['https://www.example.org/notes'])

const graph = {
  nodes: [
    rag,
    node('graphRag', 'Concept'),
    node('retrieval', 'Topic'),
    node('faster', 'Claim'),
    node('slower', 'Claim'),
    node('paper', 'Source', ['https://example.org/paper']),
  ],
  edges: [
    edge('e1', 'extends', 'graphRag', 'rag'),
    edge('e2', 'belongsTo', 'rag', 'retrieval'),
    edge('e3', 'concerns', 'faster', 'rag'),
    edge('e4', 'concerns', 'slower', 'rag'),
    edge('e5', 'contradicts', 'faster', 'slower'),
    edge('e6', 'introduces', 'paper', 'faster'),
  ],
}

describe('inside', () => {
  it('gathers what is asserted about a node, whichever way the relation points', () => {
    expect(inside(rag, graph).claims.map(claim => claim.id).sort()).toEqual(['faster', 'slower'])
  })

  it('says how a node stands to everything attached to it', () => {
    const said = inside(rag, graph).relations
    expect(said.length).toBeGreaterThan(0)
    expect(said.flatMap(one => one.names)).toContain('retrieval')
  })

  it('leaves out the relations that get a section of their own', () => {
    // The claims and the sources are read further down the panel,
    // so writing them here as well would have a reader read one twice.
    const said = inside(rag, graph).relations
    expect(said.flatMap(one => one.names)).not.toContain('faster')
    expect(said.flatMap(one => one.names)).not.toContain('paper')
  })

  it('pairs each claim with whatever argues against it', () => {
    const { disputes } = inside(rag, graph)
    expect(disputes.get('faster')?.map(one => one.id)).toEqual(['slower'])
    expect(disputes.get('slower')?.map(one => one.id)).toEqual(['faster'])
  })

  it('counts a claim\'s provenance as the node\'s own', () => {
    // Nothing introduced `rag` itself, only the claim made about it,
    // which is read here and so brings its source here with it.
    const cited = inside(rag, graph).sources
    expect(cited.map(one => one.id)).toContain('paper')
  })

  it('opens a source the graph made a node of, under the name it carries', () => {
    const paper = inside(rag, graph).sources.find(one => one.id === 'paper')
    expect(paper?.name).toBe('paper')
    expect(paper?.url).toBe('https://example.org/paper')
  })

  it('keeps a reference the graph never made a node of, under where it points', () => {
    const own = inside(rag, graph).sources.find(one => one.url === 'https://www.example.org/notes')
    expect(own?.name).toBe('example.org')
  })

  it('does not cite one source twice when a node references what introduced it', () => {
    const both = node('both', 'Concept', ['https://example.org/paper'])
    const cited = inside(both, {
      nodes: [both, graph.nodes[5]!],
      edges: [edge('e', 'introduces', 'paper', 'both')],
    }).sources
    expect(cited).toHaveLength(1)
    expect(cited[0]?.name).toBe('paper')
  })
})
