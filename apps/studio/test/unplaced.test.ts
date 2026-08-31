import type { Board } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import type { GraphNode } from '../src/lib/graph.js'
import { byKind, placeable, unplaced } from '../src/lib/unplaced.js'

const node = (id: string, type: string, name = ''): GraphNode => ({ id, type, name })

const graph: readonly GraphNode[] = [
  node('retrieval', 'Concept', 'Retrieval'),
  node('grounding', 'Concept', 'Grounding'),
  node('paperOne', 'Source', 'A paper'),
  node('freshnessClaim', 'Claim', 'It goes stale'),
  node('retrievalTopic', 'Topic', 'Retrieval work'),
]

const board = (cards: readonly string[]): Board => ({
  id: 'b1',
  name: 'One',
  cards: cards.map((nodeId, at) => ({ nodeId, x: at, y: at })),
  sections: [],
})

describe('what a reader may put on a board', () => {
  it('leaves out what the board already holds', () => {
    // A list of things that do nothing when dragged,
    // is a list a reader learns to distrust.
    expect(unplaced(graph, board(['retrieval'])).map(one => one.id))
      .toEqual(['paperOne', 'grounding'])
  })

  it('leaves out a claim, which is drawn on the card it concerns', () => {
    expect(unplaced(graph, board([])).map(one => one.id)).not.toContain('freshnessClaim')
  })

  it('leaves out a topic, which is drawn as the section rather than in one', () => {
    expect(unplaced(graph, board([])).map(one => one.id)).not.toContain('retrievalTopic')
  })

  it('narrows to one kind when a reader asks for one', () => {
    expect(unplaced(graph, board([]), { kind: 'Source' }).map(one => one.id)).toEqual(['paperOne'])
  })

  it('narrows to what a reader typed, however they cased it', () => {
    expect(unplaced(graph, board([]), { like: 'RETR' }).map(one => one.id)).toEqual(['retrieval'])
  })

  it('reads what a reader typed loosely enough to be worth typing into', () => {
    expect(unplaced(graph, board([]), { like: '  paper  ' }).map(one => one.id)).toEqual(['paperOne'])
  })

  it('reads an id as words when the node carries no name of its own', () => {
    const bare = [node('graphRag', 'Concept')]
    expect(unplaced(bare, board([]))[0]?.name).toBe('graph rag')
  })

  it('lists them the way a reader reads a list, by name', () => {
    expect(unplaced(graph, board([])).map(one => one.name)).toEqual(['A paper', 'Grounding', 'Retrieval'])
  })
})

describe('the kinds a card is ever drawn for', () => {
  it('offers only what a board places, in the order a board bands them', () => {
    expect(placeable(graph)).toEqual(['Concept', 'Source'])
  })

  it('says nothing about a graph holding nothing placeable', () => {
    expect(placeable([node('a', 'Claim')])).toEqual([])
  })
})

describe('gathering the offers under their kinds', () => {
  it('says a kind once over a group rather than after every name', () => {
    const gathered = byKind(unplaced(graph, board([])), placeable(graph))
    expect(gathered.map(one => one.kind)).toEqual(['Concept', 'Source'])
    expect(gathered[0]?.offers.map(one => one.name)).toEqual(['Grounding', 'Retrieval'])
  })

  it('leaves out a kind nothing is left of', () => {
    const board_ = board(['paperOne'])
    expect(byKind(unplaced(graph, board_), placeable(graph)).map(one => one.kind)).toEqual(['Concept'])
  })

  it('offers them in the order a board bands them, not alphabetically', () => {
    // What a board is mostly about is what a reader should reach first.
    expect(byKind(unplaced(graph, board([])), placeable(graph))[0]?.kind).toBe('Concept')
  })
})
