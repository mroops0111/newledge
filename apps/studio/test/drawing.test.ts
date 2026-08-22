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

/** Every card is its own end, and a topic's end is the section it is drawn as. */
const endpoint = (id: string): string | undefined =>
  onBoard.has(id) ? id : ({ topicA: 'a', topicB: 'b' })[id]

const always = (): boolean => true
const never = (): boolean => false

describe('which relations the board draws, and between what', () => {
  it('draws a relation between the two cards it names', () => {
    const drawn = drawnRelations(edges, endpoint, ground, always, new Set())
    expect(drawn.lines.map(one => one.id).sort()).toEqual(['e2', 'e3', 'e6'])
  })

  it('never draws what is read inside a card instead of beside it', () => {
    const drawn = drawnRelations(edges, endpoint, ground, always, new Set())
    const all = [...drawn.lines, ...drawn.summaries].map(one => one.id)
    expect(all).not.toContain('e1')
    expect(all).not.toContain('e4')
  })

  // A topic is a section, so a relation reaching a topic reaches the ground it
  // is drawn as rather than falling off the board.
  it('attaches an end naming a topic to the section that topic is drawn as', () => {
    const nested = [edge('t1', 'belongsTo', 'topicA', 'topicB')]
    const [line] = drawnRelations(nested, endpoint, ground, always, new Set()).lines
    expect([line?.source, line?.target]).toEqual(['a', 'b'])
  })

  // Saying a card is filed where the board has already put it says nothing.
  it('draws nothing when one end stands on the other', () => {
    const filed = [edge('t1', 'belongsTo', 'rag', 'topicA')]
    const drawn = drawnRelations(filed, endpoint, ground, always, new Set())
    expect(drawn.lines).toHaveLength(0)
    expect(drawn.summaries).toHaveLength(0)
  })

  // A line that wanders far enough is lost whether or not it stays on one
  // ground, and what it said has to go somewhere.
  it('summarises what could not be drawn as one line between the two grounds', () => {
    const crossing = [
      edge('x1', 'uses', 'rag', 'faster'),
      edge('x2', 'uses', 'embedding', 'cheaper'),
    ]
    const drawn = drawnRelations(crossing, endpoint, ground, never, new Set())
    expect(drawn.lines).toHaveLength(0)
    expect(drawn.summaries).toHaveLength(1)
    expect([...drawn.summaries[0]!.standsFor!].sort())
      .toEqual(['cheaper', 'embedding', 'faster', 'rag'])
  })

  it('draws a short relation between two grounds rather than summarising it', () => {
    const crossing = [edge('x1', 'uses', 'rag', 'faster')]
    const drawn = drawnRelations(crossing, endpoint, ground, always, new Set())
    expect(drawn.lines).toHaveLength(1)
    expect(drawn.summaries).toHaveLength(0)
  })

  it('leaves out a relation whose other end is not on this board', () => {
    const drawn = drawnRelations(edges, endpoint, ground, always, new Set())
    expect([...drawn.lines, ...drawn.summaries].map(one => one.id)).not.toContain('e5')
  })

  it('spells out the verb only for the relation a reader asked about', () => {
    const asked = drawnRelations(edges, endpoint, ground, always, new Set(['rag']))
    expect(asked.lines.find(one => one.id === 'e2')?.label).toBe('contains')
    expect(asked.lines.find(one => one.id === 'e6')?.label).toBeUndefined()
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
