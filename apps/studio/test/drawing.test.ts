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
  it('draws a relation between the two cards it names, whatever kind it is', () => {
    const drawn = drawnRelations(edges, endpoint, ground, always, new Set())
    expect(drawn.lines.map(one => one.id).sort()).toEqual(['e1', 'e2', 'e3', 'e4', 'e6'])
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
    expect(drawn.notes.size).toBe(0)
  })

  // A line that wanders far enough is lost whether or not it stays on one
  // ground, and what it said has to go somewhere.
  it('has both cards name each other when it cannot draw between them', () => {
    const crossing = [edge('x1', 'uses', 'rag', 'faster')]
    const drawn = drawnRelations(crossing, endpoint, ground, never, new Set())
    expect(drawn.lines).toHaveLength(0)
    expect(drawn.notes.get('rag')).toEqual([
      { edgeId: 'x1', type: 'uses', otherId: 'faster', end: 'from' },
    ])
    expect(drawn.notes.get('faster')).toEqual([
      { edgeId: 'x1', type: 'uses', otherId: 'rag', end: 'to' },
    ])
  })

  // The child says what it hangs off whether or not the board drew the line,
  // so a hierarchy the board could not draw leaves only its root to speak.
  it('leaves a hierarchy to the end that does not already name the other', () => {
    const held = [edge('x1', 'contains', 'rag', 'faster')]
    const drawn = drawnRelations(held, endpoint, ground, never, new Set())
    expect(drawn.notes.get('rag')).toEqual([
      { edgeId: 'x1', type: 'contains', otherId: 'faster', end: 'from' },
    ])
    expect(drawn.notes.get('faster')).toBeUndefined()
  })

  it('says nothing on a card about a relation it did draw', () => {
    const crossing = [edge('x1', 'uses', 'rag', 'faster')]
    const drawn = drawnRelations(crossing, endpoint, ground, always, new Set())
    expect(drawn.lines).toHaveLength(1)
    expect(drawn.notes.size).toBe(0)
  })

  it('puts no note on a node the board never drew a card for', () => {
    const away = [edge('x1', 'uses', 'rag', 'notHere')]
    const drawn = drawnRelations(away, endpoint, ground, never, new Set())
    expect(drawn.notes.get('notHere')).toBeUndefined()
  })

  it('leaves out a relation whose other end is not on this board', () => {
    const drawn = drawnRelations(edges, endpoint, ground, always, new Set())
    expect(drawn.lines.map(one => one.id)).not.toContain('e5')
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
    expect(edgeStyle('answers').marker).toBe('arrow')
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

describe('a relation is drawn when both of its ends are on the board', () => {
  // Not when a table says it belongs on one. Provenance, aboutness and
  // argument were declared undrawable when only concepts were placed, and a
  // board that put claims and sources on it as cards of their own then gave
  // them nothing at all to stand in.
  const both = new Set(['claim', 'concept', 'source'])
  const here = (id: string): string | undefined => (both.has(id) ? id : undefined)
  const nowhere = (): undefined => undefined

  it('draws what a claim is about once the claim is a card', () => {
    const drawn = drawnRelations(
      [edge('a1', 'concerns', 'claim', 'concept')],
      here,
      nowhere,
      always,
      new Set(),
    )
    expect(drawn.lines.map(one => one.id)).toEqual(['a1'])
  })

  it('draws where a claim came from once the source is a card', () => {
    const drawn = drawnRelations(
      [edge('p1', 'introduces', 'source', 'claim')],
      here,
      nowhere,
      always,
      new Set(),
    )
    expect(drawn.lines.map(one => one.id)).toEqual(['p1'])
  })

  it('draws nothing when the other end was never placed', () => {
    const drawn = drawnRelations(
      [edge('a1', 'concerns', 'claim', 'elsewhere')],
      here,
      nowhere,
      always,
      new Set(),
    )
    expect(drawn.lines).toHaveLength(0)
  })
})
