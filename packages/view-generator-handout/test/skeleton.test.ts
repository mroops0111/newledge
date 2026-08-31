import type { Board } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import type { Reading } from '../src/skeleton.js'
import { missingFrom, skeletonOf } from '../src/skeleton.js'

function concept(id: string, name: string): Reading['nodes'][number] {
  return { id, type: 'Concept', name, description: `${name} explained` }
}

function claim(id: string, name: string): Reading['nodes'][number] {
  return { id, type: 'Claim', name }
}

const graph: Reading = {
  nodes: [
    concept('rag', 'RAG'),
    concept('graphRag', 'GraphRAG'),
    claim('faster', 'Retrieval is faster with a graph'),
    claim('slower', 'Retrieval is slower with a graph'),
    { id: 'paper', type: 'Source', name: 'paper', metadata: { sourceReferences: [{ location: { uri: 'https://example.org/paper' } }] } },
  ],
  edges: [
    { id: 'e1', type: 'concerns', fromNodeId: 'faster', toNodeId: 'graphRag' },
    { id: 'e2', type: 'concerns', fromNodeId: 'slower', toNodeId: 'graphRag' },
    { id: 'e3', type: 'contradicts', fromNodeId: 'faster', toNodeId: 'slower' },
    { id: 'e4', type: 'introduces', fromNodeId: 'paper', toNodeId: 'faster' },
  ],
}

function board(over: Partial<Board> = {}): Board {
  return {
    id: 'b',
    name: 'Retrieval',
    cards: [{ nodeId: 'graphRag', x: 0, y: 200 }, { nodeId: 'rag', x: 0, y: 0 }],
    sections: [],
    ...over,
  }
}

describe('skeletonOf', () => {
  it('takes the reader\'s order rather than any the graph implies', () => {
    // `rag` sits above `graphRag` on the canvas, so it is read first,
    // whatever order the cards happen to be stored in.
    expect(skeletonOf(board(), graph).held.map(one => one.name)).toEqual(['RAG', 'GraphRAG'])
  })

  it('reads down the page before it reads across', () => {
    const across = board({ cards: [{ nodeId: 'graphRag', x: 400, y: 0 }, { nodeId: 'rag', x: 0, y: 0 }] })
    expect(skeletonOf(across, graph).held.map(one => one.name)).toEqual(['RAG', 'GraphRAG'])
  })

  it('hangs every claim under the term it is about', () => {
    const held = skeletonOf(board(), graph).held.find(one => one.name === 'GraphRAG')
    expect(held?.claims.map(one => one.text).sort()).toEqual([
      'Retrieval is faster with a graph',
      'Retrieval is slower with a graph',
    ])
  })

  it('says what argues with a claim, so a reader is taught rather than told', () => {
    const held = skeletonOf(board(), graph).held.find(one => one.name === 'GraphRAG')
    const faster = held?.claims.find(one => one.text.includes('faster'))
    expect(faster?.disputedBy).toEqual(['Retrieval is slower with a graph'])
  })

  it('carries where a claim came from, so an answer can be checked', () => {
    const held = skeletonOf(board(), graph).held.find(one => one.name === 'GraphRAG')
    const faster = held?.claims.find(one => one.text.includes('faster'))
    expect(faster?.sources).toEqual(['https://example.org/paper'])
    expect(skeletonOf(board(), graph).sources).toEqual(['https://example.org/paper'])
  })

  it('takes the board\'s name, since that is what a reader called this reading', () => {
    expect(skeletonOf(board(), graph).title).toBe('Retrieval')
  })

  it('comes out the same twice, because it is a function', () => {
    expect(skeletonOf(board(), graph)).toEqual(skeletonOf(board(), graph))
  })

  it('passes over a card naming a node the graph no longer holds', () => {
    const stale = board({ cards: [{ nodeId: 'gone', x: 0, y: 0 }, { nodeId: 'rag', x: 0, y: 100 }] })
    expect(skeletonOf(stale, graph).held.map(one => one.name)).toEqual(['RAG'])
    expect(missingFrom(stale, graph)).toBe(1)
  })
})
