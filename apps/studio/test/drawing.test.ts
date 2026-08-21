import type { Board } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import { edgeStyle, nodeStyle } from '../src/lib/boardStyle.js'
import { drawnCards, drawnEdges } from '../src/lib/drawing.js'
import type { GraphEdge, GraphNode } from '../src/lib/graph.js'

function edge(id: string, type: string, from: string, to: string): GraphEdge {
  return { id, type, fromNodeId: from, toNodeId: to }
}

const edges: GraphEdge[] = [
  edge('e1', 'supports', 'faster', 'cheaper'),
  edge('e2', 'contains', 'rag', 'embedding'),
  edge('e3', 'relatesTo', 'rag', 'graphRag'),
  edge('e4', 'concerns', 'faster', 'graphRag'),
  edge('e5', 'uses', 'rag', 'offBoard'),
  edge('e6', 'uses', 'graphRag', 'embedding'),
]
const onBoard = new Set(['faster', 'cheaper', 'rag', 'embedding', 'graphRag'])

describe('which relations the board draws', () => {
  // A hierarchy says three things and needs all three channels, so its line is
  // drawn as well as its colour and its enclosure rather than instead of them.
  it('draws the relations between the things a reader thinks with', () => {
    const drawn = drawnEdges(edges, onBoard, new Set())
    expect(drawn.map(one => one.id).sort()).toEqual(['e2', 'e3', 'e6'])
  })

  it('never draws what is read inside a card instead of beside it', () => {
    for (const id of ['e1', 'e4']) {
      expect(drawnEdges(edges, onBoard, new Set(['faster', 'graphRag'])).some(one => one.id === id))
        .toBe(false)
    }
  })

  it('leaves out a relation whose other end is not on this board', () => {
    expect(drawnEdges(edges, onBoard, new Set()).some(one => one.id === 'e5')).toBe(false)
  })

  it('spells out the verb only for the relation a reader asked about', () => {
    const asked = drawnEdges(edges, onBoard, new Set(['rag']))
    expect(asked.find(one => one.id === 'e2')?.label).toBe('contains')
    expect(asked.find(one => one.id === 'e6')?.label).toBeUndefined()
  })

  it('shapes a kind as a family, a part as a brood, and the rest as a curve', () => {
    expect(edgeStyle('extends').kin).toBe('family')
    expect(edgeStyle('contains').kin).toBe('brood')
    expect(edgeStyle('uses').kin).toBe('curve')
  })

  it('keeps the catch-all fainter and undirected, since it claims the least', () => {
    expect(edgeStyle('relatesTo').marker).toBe('none')
    expect(edgeStyle('relatesTo').dash).toBeDefined()
    expect(edgeStyle('uses').marker).toBe('arrow')
    expect(edgeStyle('uses').dash).toBeUndefined()
  })
})

describe('which cards the board draws', () => {
  const board: Board = {
    id: 'b1',
    name: 'Retrieval',
    cards: [{ nodeId: 'rag', x: 10, y: 20 }, { nodeId: 'gone', x: 0, y: 0 }],
    sections: [],
  }
  const byId = new Map<string, GraphNode>([['rag', { id: 'rag', type: 'Concept', name: 'RAG' }]])

  it('stops drawing a card naming something the graph no longer holds', () => {
    expect(drawnCards(board, byId).map(card => card.nodeId)).toEqual(['rag'])
  })

  it('draws a card as wide as its type says', () => {
    expect(drawnCards(board, byId)[0]?.width).toBe(nodeStyle('Concept').cardWidth)
  })
})

describe('the visual language', () => {
  it('draws a type the ontology adds rather than dropping it', () => {
    expect(nodeStyle('Question').form).toBe('concept')
    expect(edgeStyle('answers').shown).toBe('always')
  })

  it('gives agreement and conflict a colour of their own, and nothing else', () => {
    expect(edgeStyle('supports').tone).toBe('supports')
    expect(edgeStyle('contradicts').tone).toBe('contradicts')
    expect(edgeStyle('extends').tone).toBe('structure')
  })

  it('makes a topic the ground rather than another card among its members', () => {
    expect(nodeStyle('Topic').ground).toBe(true)
    expect(nodeStyle('Concept').ground).toBe(false)
  })
})
