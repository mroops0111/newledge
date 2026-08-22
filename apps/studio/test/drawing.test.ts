import type { Board } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import { edgeStyle, nodeStyle } from '../src/lib/boardStyle.js'
import { drawnCards, drawnRelations } from '../src/lib/drawing.js'
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

// Ground is asked of the card, since a reader who drags a card into another
// section has moved it there.
const ground = (id: string): string | undefined =>
  ({ rag: 'a', embedding: 'a', graphRag: 'a', faster: 'b', cheaper: 'b' })[id]

describe('which relations the board draws, and at what level', () => {
  it('draws a relation between two cards standing on the same ground', () => {
    const drawn = drawnRelations(edges, onBoard, ground, new Set())
    expect(drawn.withinSections.map(one => one.id).sort()).toEqual(['e2', 'e3', 'e6'])
  })

  it('never draws what is read inside a card instead of beside it', () => {
    const drawn = drawnRelations(edges, onBoard, ground, new Set())
    const all = [...drawn.withinSections, ...drawn.betweenSections].map(one => one.id)
    expect(all).not.toContain('e1')
    expect(all).not.toContain('e4')
  })

  // A card cannot be next to everything it relates to, and a board covered in
  // lines that cross it says less than one with a few that do not.
  it('draws a relation that crosses between two grounds as one line between them', () => {
    const crossing = [
      edge('x1', 'uses', 'rag', 'faster'),
      edge('x2', 'uses', 'embedding', 'cheaper'),
    ]
    const drawn = drawnRelations(crossing, new Set([...onBoard]), ground, new Set())
    expect(drawn.withinSections).toHaveLength(0)
    expect(drawn.betweenSections).toHaveLength(1)
  })

  it('says how many relations that one line stands for', () => {
    const crossing = [
      edge('x1', 'uses', 'rag', 'faster'),
      edge('x2', 'uses', 'embedding', 'cheaper'),
    ]
    const [between] = drawnRelations(crossing, onBoard, ground, new Set()).betweenSections
    expect(between?.standsFor).toBe(2)
  })

  it('runs that line between the two grounds, not between two cards', () => {
    const crossing = [edge('x1', 'uses', 'rag', 'faster')]
    const [between] = drawnRelations(crossing, onBoard, ground, new Set()).betweenSections
    expect([between?.source, between?.target]).toEqual(['a', 'b'])
  })

  it('leaves out a relation whose other end is not on this board', () => {
    const drawn = drawnRelations(edges, onBoard, ground, new Set())
    const all = [...drawn.withinSections, ...drawn.betweenSections].map(one => one.id)
    expect(all).not.toContain('e5')
  })

  it('draws nothing between grounds when a card is standing on none', () => {
    const loose = drawnRelations([edge('x1', 'uses', 'rag', 'nowhere')], new Set([...onBoard, 'nowhere']), ground, new Set())
    expect(loose.betweenSections).toHaveLength(0)
  })

  it('spells out the verb only for the relation a reader asked about', () => {
    const asked = drawnRelations(edges, onBoard, ground, new Set(['rag']))
    expect(asked.withinSections.find(one => one.id === 'e2')?.label).toBe('contains')
    expect(asked.withinSections.find(one => one.id === 'e6')?.label).toBeUndefined()
  })

  it('shapes a hierarchy as a tree and everything else as a curve', () => {
    expect(edgeStyle('extends').kin).toBe('tree')
    expect(edgeStyle('contains').kin).toBe('tree')
    expect(edgeStyle('uses').kin).toBe('curve')
  })

  it('roots a whole at the end it holds from, and a kind at what it extends', () => {
    expect(edgeStyle('contains').rootAt).toBe('from')
    expect(edgeStyle('extends').rootAt).toBe('to')
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
    expect(edgeStyle('answers').onBoard).toBe(true)
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
