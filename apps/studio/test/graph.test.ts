import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode, Ontology } from '../src/lib/graph.js'
import { openingView, visibleGraph, withType } from '../src/lib/graph.js'
import { laidOut } from '../src/lib/layout.js'

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

  it('draws filing without letting it reach in for what is filed', () => {
    const view = openingView(ontology)
    expect(view.edgeTypes.has('belongsTo')).toBe(true)

    // `rag` is filed under `retrieval` and both are on, so the line is drawn.
    // No claim arrives with it, though every claim is filed somewhere too.
    const shown = visibleGraph(graph, view)
    expect(shown.edges.map(e => e.id)).toContain('e2')
    expect(shown.nodes.map(n => n.id)).not.toContain('unrelated')
  })

  it('brings a claim in dispute along with the disagreement', () => {
    const shown = visibleGraph(graph, openingView(ontology))
    // `faster` is reached by the contradiction,
    // `unrelated` is not reached at all.
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

describe('laidOut', () => {
  it('gives every node a place', () => {
    const placed = laidOut(
      [node('a', 'Concept'), node('b', 'Concept')],
      [edge('e', 'extends', 'a', 'b')],
    )
    expect(placed.size).toBe(2)
    expect(placed.get('a')).toBeDefined()
    expect(placed.get('b')).toBeDefined()
  })

  it('reads the whole shape again when the canvas gains a node', () => {
    const two = laidOut([node('a', 'Concept'), node('b', 'Concept')], [edge('e', 'contains', 'a', 'b')])
    const three = laidOut(
      [node('a', 'Concept'), node('b', 'Concept'), node('c', 'Concept')],
      [edge('e', 'contains', 'a', 'b'), edge('f', 'contains', 'a', 'c')],
    )
    // Both children hang off the same parent, so gaining one moves the other,
    // which is the arrangement a reader asked to see rather than the old one.
    expect(three.get('b')).not.toEqual(two.get('b'))
  })

  it('draws a topic above what is filed under it, however the graph writes it', () => {
    const placed = laidOut(
      [node('theme', 'Topic'), node('idea', 'Concept')],
      [edge('e', 'belongsTo', 'idea', 'theme')],
    )
    expect(placed.get('theme')!.y).toBeLessThan(placed.get('idea')!.y)
  })
})
