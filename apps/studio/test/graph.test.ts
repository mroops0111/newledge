import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode, Ontology } from '../src/lib/graph.js'
import { openingView, visibleGraph, withType } from '../src/lib/graph.js'
import { placeArrivals } from '../src/lib/layout.js'

function node(id: string, type: string): GraphNode {
  return { id, type, name: id }
}

function edge(id: string, type: string, from: string, to: string): GraphEdge {
  return { id, type, fromNodeId: from, toNodeId: to }
}

const graph = {
  nodes: [
    node('rag', 'Concept'),
    node('graphRag', 'Concept'),
    node('retrieval', 'Topic'),
    node('faster', 'Claim'),
    node('slower', 'Claim'),
    node('unrelated', 'Claim'),
    node('paper', 'Source'),
  ],
  edges: [
    edge('e1', 'extends', 'graphRag', 'rag'),
    edge('e2', 'belongsTo', 'rag', 'retrieval'),
    edge('e3', 'contradicts', 'faster', 'slower'),
    edge('e4', 'concerns', 'faster', 'rag'),
    edge('e5', 'concerns', 'unrelated', 'graphRag'),
    edge('e6', 'introduces', 'paper', 'rag'),
  ],
}

const ontology: Ontology = {
  nodeTypes: [{ id: 'Concept' }, { id: 'Claim' }, { id: 'Source' }, { id: 'Topic' }],
  edgeTypes: [{ id: 'extends' }, { id: 'belongsTo' }, { id: 'contradicts' }, { id: 'concerns' }, { id: 'introduces' }],
}

describe('openingView', () => {
  it('opens on the concepts and themes an ontology declares', () => {
    const view = openingView(ontology)
    expect([...view.nodeTypes].sort()).toEqual(['Concept', 'Topic'])
    expect(view.edgeTypes.has('contradicts')).toBe(true)
    expect(view.edgeTypes.has('concerns')).toBe(false)
  })

  it('asks for nothing an ontology does not declare', () => {
    const sparse = openingView({ nodeTypes: [{ id: 'Concept' }], edgeTypes: [{ id: 'extends' }] })
    expect([...sparse.nodeTypes]).toEqual(['Concept'])
    expect([...sparse.edgeTypes]).toEqual(['extends'])
  })
})

describe('visibleGraph', () => {
  it('draws the chosen types and the relations between them', () => {
    const shown = visibleGraph(graph, openingView(ontology))
    expect(shown.nodes.map(n => n.id).sort()).toEqual(['faster', 'graphRag', 'rag', 'retrieval', 'slower'])
    expect(shown.edges.map(e => e.id).sort()).toEqual(['e1', 'e2', 'e3'])
  })

  it('brings a claim in dispute along with the disagreement', () => {
    const shown = visibleGraph(graph, openingView(ontology))
    // `faster` is reached by the contradiction, `unrelated` is not reached at all.
    expect(shown.nodes.map(n => n.id)).toContain('faster')
    expect(shown.nodes.map(n => n.id)).toContain('slower')
    expect(shown.nodes.map(n => n.id)).not.toContain('unrelated')
  })

  it('takes those claims away again when the disagreement is turned off', () => {
    const view = openingView(ontology)
    const quiet = { ...view, edgeTypes: withType(view.edgeTypes, 'contradicts') }
    const shown = visibleGraph(graph, quiet)

    expect(shown.nodes.map(n => n.id).sort()).toEqual(['graphRag', 'rag', 'retrieval'])
  })

  it('draws every claim once aboutness is asked for', () => {
    const view = openingView(ontology)
    const withClaims = { ...view, edgeTypes: withType(view.edgeTypes, 'concerns') }
    const shown = visibleGraph(graph, withClaims)

    expect(shown.nodes.map(n => n.id)).toContain('unrelated')
  })

  it('special-cases no type, so a type an ontology adds is drawn like the rest', () => {
    const everything = {
      nodeTypes: new Set(ontology.nodeTypes.map(t => t.id)),
      edgeTypes: new Set(ontology.edgeTypes.map(t => t.id)),
    }
    const shown = visibleGraph(graph, everything)

    expect(shown.nodes).toHaveLength(graph.nodes.length)
    expect(shown.edges).toHaveLength(graph.edges.length)
  })

  it('drops an edge whose other end is missing from the graph', () => {
    const dangling = { nodes: [node('rag', 'Concept')], edges: [edge('e1', 'extends', 'rag', 'gone')] }
    const shown = visibleGraph(dangling, { nodeTypes: new Set(['Concept']), edgeTypes: new Set(['extends']) })

    expect(shown.nodes.map(n => n.id)).toEqual(['rag'])
    expect(shown.edges).toEqual([])
  })
})

describe('withType', () => {
  it('adds a type that is off and removes one that is on', () => {
    expect([...withType(new Set(['a']), 'b')].sort()).toEqual(['a', 'b'])
    expect([...withType(new Set(['a', 'b']), 'a')]).toEqual(['b'])
  })
})

describe('placeArrivals', () => {
  it('places a node that has never been placed', () => {
    const placed = placeArrivals([node('a', 'Concept'), node('b', 'Concept')], [edge('e', 'extends', 'a', 'b')], new Map())
    expect(placed.size).toBe(2)
    expect(placed.get('a')).toBeDefined()
  })

  it('leaves a position a reader chose exactly where it was', () => {
    const chosen = new Map([['a', { x: 42, y: 99 }]])
    const placed = placeArrivals([node('a', 'Concept'), node('b', 'Concept')], [], chosen)

    expect(placed.get('a')).toEqual({ x: 42, y: 99 })
    expect(placed.get('b')).toBeDefined()
  })

  it('does no work when everything is already placed', () => {
    const chosen = new Map([['a', { x: 1, y: 2 }]])
    expect(placeArrivals([node('a', 'Concept')], [], chosen)).toBe(chosen)
  })
})
